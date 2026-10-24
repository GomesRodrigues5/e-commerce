const pool = require('../db/pool');

function normalizeOrderItems(items) {
  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item.productId);
    quantities.set(productId, (quantities.get(productId) || 0) + Number(item.quantity));
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

class CommerceRepository {
  async listProducts({ categoryId, search, limit = 24, page = 1 } = {}) {
    const conditions = ['p.active = TRUE'];
    const values = [];
    if (categoryId) {
      conditions.push('p.category_id = ?');
      values.push(Number(categoryId));
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
      const term = `%${search}%`;
      values.push(term, term, term);
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [rows, total] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, Number(limit), offset]);
    const [count] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')}
    `, values);
    return { rows, total: Number(count[0].total), page: Number(page), limit: Number(limit) };
  }

  async getProductById(id) {
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? AND p.active = TRUE
    `, [Number(id)]);
    return rows[0] || null;
  }

  async listCategories() {
    const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
    return rows;
  }

  async listAngolaProvinces() {
    const [rows] = await pool.query('SELECT id, name FROM angola_provinces ORDER BY name');
    return rows;
  }

  async listAngolaMunicipalities(provinceId) {
    const [rows] = await pool.execute(
      'SELECT id, name FROM angola_municipalities WHERE province_id = ? ORDER BY name',
      [Number(provinceId)]
    );
    return rows;
  }

  async registerCustomer({ name, email, phone, province, provinceId, municipality, passwordHash, preferenceIds }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const provinceFilter = province ? 'p.name = ?' : 'p.id = ?';
      const [locations] = await connection.execute(
        `SELECT p.name AS province, m.name AS municipality
         FROM angola_provinces p
         JOIN angola_municipalities m ON m.province_id = p.id
         WHERE ${provinceFilter} AND m.name = ?`,
        [province || provinceId, municipality]
      );
      const location = locations[0] || null;
      if (!location) {
        const error = new Error('Selecione um município pertencente à província escolhida');
        error.code = 'INVALID_LOCATION';
        throw error;
      }
      if (preferenceIds.length) {
        const [categories] = await connection.query(
          'SELECT id FROM categories WHERE id IN (?)',
          [preferenceIds]
        );
        if (categories.length !== preferenceIds.length) {
          const error = new Error('Uma ou mais categorias selecionadas são inválidas');
          error.code = 'INVALID_PREFERENCES';
          throw error;
        }
      }
      const [result] = await connection.execute(
        `INSERT INTO customers (name, email, phone, province, municipality, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, phone || null, location.province, location.municipality, passwordHash]
      );
      const customerId = Number(result.insertId);
      for (const categoryId of preferenceIds) {
        await connection.execute(
          'INSERT INTO customer_preferences (customer_id, category_id) VALUES (?, ?)',
          [customerId, categoryId]
        );
      }
      await connection.commit();
      return this.getCustomerProfile(customerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCustomerByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash FROM customers WHERE email = ? LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  }

  async getCustomerProfile(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, province, municipality, created_at FROM customers WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    if (!rows.length) return null;
    const [preferences] = await pool.execute(
      `SELECT c.id, c.name FROM customer_preferences cp
       JOIN categories c ON c.id = cp.category_id WHERE cp.customer_id = ? ORDER BY c.name`,
      [Number(id)]
    );
    return { ...rows[0], preferences };
  }

  async updateCustomerPreferences(customerId, preferenceIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (preferenceIds.length) {
        const [categories] = await connection.query(
          'SELECT id FROM categories WHERE id IN (?)',
          [preferenceIds]
        );
        if (categories.length !== preferenceIds.length) {
          const error = new Error('Uma ou mais categorias selecionadas são inválidas');
          error.code = 'INVALID_PREFERENCES';
          throw error;
        }
      }
      await connection.execute('DELETE FROM customer_preferences WHERE customer_id = ?', [customerId]);
      for (const categoryId of preferenceIds) {
        await connection.execute(
          'INSERT INTO customer_preferences (customer_id, category_id) VALUES (?, ?)',
          [customerId, categoryId]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCustomerRecommendationContext(customerId) {
    const [preferences] = await pool.execute(
      `SELECT c.id, c.name FROM customer_preferences cp
       JOIN categories c ON c.id = cp.category_id WHERE cp.customer_id = ?`,
      [customerId]
    );
    const [products] = await pool.execute(`
      SELECT p.id, p.category_id, p.name, p.description, p.price, p.created_at, c.name AS category_name
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.active = TRUE AND p.stock > 0
      ORDER BY p.created_at DESC LIMIT 80
    `);
    return { preferences, products };
  }

  async listCustomerOrders(customerId) {
    const [orders] = await pool.execute(
      `SELECT id, order_number, status, order_type, total, reservation_expires_at, created_at
       FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`,
      [customerId]
    );
    if (!orders.length) return [];
    const orderIds = orders.map(order => Number(order.id));
    const [items] = await pool.query(
      'SELECT order_id, product_name, unit_price, quantity FROM order_items WHERE order_id IN (?) ORDER BY id',
      [orderIds]
    );
    const itemsByOrder = new Map();
    for (const item of items) {
      const list = itemsByOrder.get(Number(item.order_id)) || [];
      list.push(item);
      itemsByOrder.set(Number(item.order_id), list);
    }
    return orders.map(order => ({ ...order, items: itemsByOrder.get(Number(order.id)) || [] }));
  }

  async listActiveAdvertisements() {
    const [rows] = await pool.query(`
      SELECT id, company_name, title, description, image_url, target_url
      FROM advertisements
      WHERE active = TRUE AND starts_at <= NOW() AND ends_at > NOW()
      ORDER BY created_at DESC LIMIT 12
    `);
    return rows;
  }

  async listAdvertisements() {
    const [rows] = await pool.query('SELECT * FROM advertisements ORDER BY created_at DESC');
    return rows;
  }

  async createAdvertisement(ad) {
    const [result] = await pool.execute(
      `INSERT INTO advertisements (company_name, title, description, image_url, target_url, starts_at, ends_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ad.companyName, ad.title, ad.description, ad.imageUrl, ad.targetUrl, ad.startsAt, ad.endsAt, ad.active]
    );
    return result.insertId;
  }

  async updateAdvertisement(id, ad) {
    const [result] = await pool.execute(
      `UPDATE advertisements SET company_name = ?, title = ?, description = ?, image_url = ?, target_url = ?,
       starts_at = ?, ends_at = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [ad.companyName, ad.title, ad.description, ad.imageUrl, ad.targetUrl, ad.startsAt, ad.endsAt, ad.active, id]
    );
    return result.affectedRows > 0;
  }

  async deactivateAdvertisement(id) {
    const [result] = await pool.execute(
      'UPDATE advertisements SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async listContactProductContext() {
    const [rows] = await pool.query(`
      SELECT p.name, p.description, p.price, p.stock, c.name AS category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.active = TRUE
      ORDER BY p.featured DESC, p.name
      LIMIT 80
    `);
    return rows;
  }

  async getAdminByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, active FROM admins WHERE email = ? LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  }

  async listAdminProducts() {
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
    `);
    return rows;
  }

  async createProduct(product) {
    const [result] = await pool.query(`
      INSERT INTO products (category_id, name, slug, description, price, stock, image_url, active, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [product.categoryId, product.name, product.slug, product.description, product.price,
      product.stock, product.imageUrl, product.active, product.featured]);
    return result.insertId;
  }

  async updateProduct(id, product) {
    const [result] = await pool.query(`
      UPDATE products
      SET category_id = ?, name = ?, slug = ?, description = ?, price = ?, stock = ?,
          image_url = ?, active = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [product.categoryId, product.name, product.slug, product.description, product.price,
      product.stock, product.imageUrl, product.active, product.featured, Number(id)]);
    if (result.affectedRows > 0) return true;
    const [rows] = await pool.query('SELECT id FROM products WHERE id = ?', [Number(id)]);
    return rows.length > 0;
  }

  async deactivateProduct(id) {
    const [result] = await pool.query(
      'UPDATE products SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [Number(id)]
    );
    if (result.affectedRows > 0) return true;
    const [rows] = await pool.query('SELECT id FROM products WHERE id = ?', [Number(id)]);
    return rows.length > 0;
  }

  async createOrder({ customerId, items, deliveryAddress, paymentMethod = 'EMIS' }) {
    items = normalizeOrderItems(items);
    const orderNumber = `APX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const productIds = items.map(item => Number(item.productId));
      const [productRows] = await connection.query(
        'SELECT id, name, price, stock FROM products WHERE id IN (?) AND active = TRUE FOR UPDATE',
        [productIds]
      );
      const productsById = new Map(productRows.map(product => [Number(product.id), product]));
      const serverItems = items.map(item => {
        const product = productsById.get(Number(item.productId));
        if (!product) throw new Error(`Produto ${item.productId} não está disponível`);
        if (product.stock < Number(item.quantity)) throw new Error(`Estoque insuficiente para ${product.name}`);
        return { product, quantity: Number(item.quantity) };
      });
      const subtotal = serverItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
      const deliveryFee = 0;
      const total = subtotal + deliveryFee;
      const [orderResult] = await connection.query(
        `INSERT INTO orders (customer_id, order_number, status, payment_method, subtotal, delivery_fee, total, delivery_address)
         VALUES (?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
        [customerId, orderNumber, paymentMethod, subtotal, deliveryFee, total, JSON.stringify(deliveryAddress)]
      );
      const orderId = orderResult.insertId;
      for (const item of serverItems) {
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.product.id, item.product.name, item.product.price, item.quantity]
        );
        await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product.id]);
      }
      await connection.commit();
      return { id: orderId, orderNumber, status: 'PENDING', total, customerId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createReservation({ customerId, items }) {
    items = normalizeOrderItems(items);
  const orderNumber = `RSV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const productIds = [...new Set(items.map(item => Number(item.productId)))];
    const [productRows] = await connection.query(
      'SELECT id, name, price, stock FROM products WHERE id IN (?) AND active = TRUE FOR UPDATE',
      [productIds]
    );
    const productsById = new Map(productRows.map(product => [Number(product.id), product]));
    const serverItems = items.map(item => {
      const product = productsById.get(Number(item.productId));
      if (!product) throw new Error(`Produto ${item.productId} não está disponível`);
      if (product.stock < Number(item.quantity)) throw new Error(`Estoque insuficiente para ${product.name}`);
      return { product, quantity: Number(item.quantity) };
    });
    const subtotal = serverItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_id, order_number, status, order_type, reservation_expires_at,
       payment_method, subtotal, delivery_fee, total)
       VALUES (?, ?, 'RESERVED', 'RESERVATION', ?, 'CASH', ?, 0, ?)`,
      [customerId, orderNumber, expiresAt, subtotal, subtotal]
    );
    for (const item of serverItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
        [orderResult.insertId, item.product.id, item.product.name, item.product.price, item.quantity]
      );
      await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product.id]);
    }
    await connection.commit();
    return { id: Number(orderResult.insertId), orderNumber, status: 'RESERVED', expiresAt, total: subtotal };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  }

  async releaseExpiredReservations() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id FROM orders WHERE order_type = 'RESERVATION' AND status = 'RESERVED'
       AND reservation_expires_at <= NOW() FOR UPDATE`
    );
    if (!orders.length) {
      await connection.commit();
      return 0;
    }
    const orderIds = orders.map(order => Number(order.id));
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id IN (?) AND product_id IS NOT NULL',
      [orderIds]
    );
    for (const item of items) {
      await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await connection.query(
      `UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`,
      [orderIds]
    );
    await connection.commit();
    return orders.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  }

  async getOrderById(id) {
    return this.getOrderByNumber(null, id);
  }

  async getOrderByIdForCustomer(id, customerId) {
    const order = await this.getOrderById(id);
    return order && Number(order.customer_id) === Number(customerId) ? order : null;
  }

  async getOrderByNumber(orderNumber, id = null) {
    const condition = id ? 'o.id = ?' : 'o.order_number = ?';
    const value = id || orderNumber;
    const [rows] = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
             oi.product_id, oi.product_name, oi.unit_price, oi.quantity
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${condition}
    `, [value]);
    if (!rows.length) return null;
    const order = rows[0];
    order.items = rows.filter(row => row.product_id !== null).map(({ product_id, product_name, unit_price, quantity }) => ({
      productId: product_id, productName, price: unit_price, quantity
    }));
    return order;
  }

  async savePayment({ orderId, provider, transactionId, reference, amount, status, response }) {
    const [result] = await pool.query(
      `INSERT INTO payments (order_id, provider, transaction_id, reference, amount, currency, status, response_data)
       VALUES (?, ?, ?, ?, ?, 'AOA', ?, ?)
       ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id), reference = VALUES(reference), amount = VALUES(amount), status = VALUES(status), response_data = VALUES(response_data), updated_at = CURRENT_TIMESTAMP`,
      [orderId, provider, transactionId, reference, amount, status, JSON.stringify(response)]
    );
    return result.insertId || null;
  }

  async updatePaymentStatus(orderId, status) {
    await pool.query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, orderId]);
  }

  async listAdminOrders() {
    const [orders] = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
        (SELECT p.status FROM payments p WHERE p.order_id = o.id ORDER BY p.created_at DESC, p.id DESC LIMIT 1) AS payment_status
      FROM orders o JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC LIMIT 200
    `);
    if (!orders.length) return [];
    const orderIds = orders.map(order => Number(order.id));
    const [items] = await pool.query(
      'SELECT order_id, product_id, product_name, unit_price, quantity FROM order_items WHERE order_id IN (?) ORDER BY id',
      [orderIds]
    );
    const itemsByOrder = new Map();
    for (const item of items) {
      const orderItems = itemsByOrder.get(Number(item.order_id)) || [];
      orderItems.push(item);
      itemsByOrder.set(Number(item.order_id), orderItems);
    }
    return orders.map(order => ({ ...order, items: itemsByOrder.get(Number(order.id)) || [] }));
  }

  async updateOrderStatus(id, status) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [orders] = await connection.execute(
        'SELECT id, status, order_type FROM orders WHERE id = ? FOR UPDATE',
        [Number(id)]
      );
      if (!orders.length) {
        await connection.commit();
        return false;
      }
      const order = orders[0];
      if (status === 'RESERVED' && order.status !== 'RESERVED') {
        throw new Error('Uma encomenda não pode voltar ao estado de reserva');
      }
      if (order.status === 'RESERVED' && status === 'CANCELLED') {
        const [items] = await connection.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL',
          [Number(id)]
        );
        for (const item of items) {
          await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
      await connection.execute(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, Number(id)]
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addReview({ productId, customerId, rating, comment }) {
    const [result] = await pool.query(
      'INSERT INTO product_reviews (product_id, customer_id, rating, comment, approved) VALUES (?, ?, ?, ?, FALSE)',
      [productId, customerId, rating, comment]
    );
    return result.insertId;
  }

  async listReviews(productId) {
    const [rows] = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, c.name
      FROM product_reviews r JOIN customers c ON c.id = r.customer_id
      WHERE r.product_id = ? AND r.approved = TRUE ORDER BY r.created_at DESC
    `, [productId]);
    return rows;
  }

  async createContactMessage(message) {
    const [result] = await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [message.name, message.email, message.subject, message.message]
    );
    return result.insertId;
  }

  async listContactMessages() {
    const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return rows;
  }

  async listDashboard() {
    const [sales] = await pool.query('SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS orders FROM orders WHERE status IN (\'PAID\', \'PROCESSING\', \'SHIPPED\', \'DELIVERED\')');
    const [products] = await pool.query('SELECT COUNT(*) AS total FROM products WHERE active = TRUE');
    const [messages] = await pool.query('SELECT COUNT(*) AS total FROM contact_messages');
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(total) AS total
      FROM orders WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
      GROUP BY month ORDER BY month
    `);
    return { sales: sales[0], products: products[0], messages: messages[0], monthly };
  }
}

module.exports = new CommerceRepository();
