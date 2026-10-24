const express = require('express');
const rateLimit = require('express-rate-limit');
const repository = require('../repositories/commerceRepository');
const { createToken, requireAdmin, safeEqual } = require('../middleware/adminAuth');
const { verifyPassword } = require('../services/adminCredentials');

const router = express.Router();
const orderStatuses = new Set(['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'RESERVED']);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas de acesso. Tente novamente mais tarde.' }
});

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 240);
}

function parseProduct(body) {
  body = body && typeof body === 'object' ? body : {};
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const stock = Number(body.stock);
  const imageUrl = String(body.imageUrl || '').trim();
  if (!name || name.length > 200 || !description || !Number.isInteger(categoryId) || categoryId < 1 ||
      !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    return { error: 'Dados do produto inválidos' };
  }
  if (imageUrl.length > 500) return { error: 'O endereço da imagem é demasiado longo' };
  if (imageUrl) {
    if (!/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp|gif)$/i.test(imageUrl)) {
      try {
        if (!['http:', 'https:'].includes(new URL(imageUrl).protocol)) throw new Error('invalid protocol');
      } catch {
        return { error: 'O endereço da imagem deve ser um link HTTP(S) ou uma imagem carregada no site' };
      }
    }
  }
  const slug = slugify(String(body.slug || name).trim());
  if (!slug) return { error: 'O slug do produto é inválido' };
  return {
    value: {
      name, slug, description, categoryId, price, stock,
      imageUrl: imageUrl || null,
      active: body.active === undefined ? true : body.active === true || body.active === 'true',
      featured: body.featured === true || body.featured === 'true'
    }
  };
}

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

router.post('/login', loginLimiter, async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Credenciais administrativas não configuradas' });
  }
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const admin = await repository.getAdminByEmail(email);
    if (admin) {
      if (!admin.active || !(await verifyPassword(password, admin.password_hash))) {
        return res.status(401).json({ message: 'E-mail ou palavra-passe inválidos' });
      }
      return res.json({ token: createToken(email, admin.id), email, name: admin.name });
    }

    const configuredEmail = process.env.ADMIN_EMAIL || '';
    const configuredPassword = process.env.ADMIN_PASSWORD || '';
    if (email === configuredEmail.trim().toLowerCase() && configuredPassword && safeEqual(password, configuredPassword)) {
      return res.json({ token: createToken(email), email });
    }
    return res.status(401).json({ message: 'E-mail ou palavra-passe inválidos' });
  } catch (error) {
    return next(error);
  }
});

router.use(requireAdmin);

router.get('/session', (req, res) => {
  res.json({ email: req.admin.email });
});

router.get('/products', async (_req, res, next) => {
  try {
    res.json(await repository.listAdminProducts());
  } catch (error) {
    next(error);
  }
});

router.post('/products', async (req, res, next) => {
  const product = parseProduct(req.body);
  if (product.error) return res.status(400).json({ message: product.error });
  try {
    const id = await repository.createProduct(product.value);
    res.status(201).json({ id, message: 'Produto criado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Já existe um produto com este slug' });
    next(error);
  }
});

router.put('/products/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de produto inválido' });
  const product = parseProduct(req.body);
  if (product.error) return res.status(400).json({ message: product.error });
  try {
    const updated = await repository.updateProduct(req.params.id, product.value);
    if (!updated) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json({ message: 'Produto atualizado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Já existe um produto com este slug' });
    next(error);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de produto inválido' });
  try {
    const deleted = await repository.deactivateProduct(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json({ message: 'Produto desativado' });
  } catch (error) {
    next(error);
  }
});

function parseAdvertisement(body) {
  body = body && typeof body === 'object' ? body : {};
  const companyName = String(body.companyName || '').trim();
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const imageUrl = String(body.imageUrl || '').trim();
  const targetUrl = String(body.targetUrl || '').trim();
  const startsAt = String(body.startsAt || '').trim();
  const endsAt = String(body.endsAt || '').trim();
  if (!companyName || companyName.length > 160 || !title || title.length > 200 ||
      description.length > 1000 || !imageUrl || imageUrl.length > 500 ||
      targetUrl.length > 500 || !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { error: 'Dados da publicidade inválidos. Confirme os campos e o período de publicação.' };
  }
  for (const value of [imageUrl, targetUrl].filter(Boolean)) {
    try {
      const url = new URL(value, 'http://localhost');
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    } catch {
      return { error: 'Os endereços da imagem e do destino devem usar HTTP ou HTTPS' };
    }
  }
  return {
    value: {
      companyName, title, description, imageUrl, targetUrl: targetUrl || null,
      startsAt: new Date(startsAt), endsAt: new Date(endsAt),
      active: body.active === undefined ? true : body.active === true || body.active === 'true'
    }
  };
}

router.get('/advertisements', async (_req, res, next) => {
  try {
    res.json(await repository.listAdvertisements());
  } catch (error) {
    next(error);
  }
});

router.post('/advertisements', async (req, res, next) => {
  const advertisement = parseAdvertisement(req.body);
  if (advertisement.error) return res.status(400).json({ message: advertisement.error });
  try {
    const id = await repository.createAdvertisement(advertisement.value);
    res.status(201).json({ id, message: 'Publicidade criada' });
  } catch (error) {
    next(error);
  }
});

router.put('/advertisements/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de publicidade inválido' });
  const advertisement = parseAdvertisement(req.body);
  if (advertisement.error) return res.status(400).json({ message: advertisement.error });
  try {
    const updated = await repository.updateAdvertisement(req.params.id, advertisement.value);
    if (!updated) return res.status(404).json({ message: 'Publicidade não encontrada' });
    res.json({ message: 'Publicidade atualizada' });
  } catch (error) {
    next(error);
  }
});

router.delete('/advertisements/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de publicidade inválido' });
  try {
    const deactivated = await repository.deactivateAdvertisement(req.params.id);
    if (!deactivated) return res.status(404).json({ message: 'Publicidade não encontrada' });
    res.json({ message: 'Publicidade desativada' });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (_req, res, next) => {
  try {
    res.json(await repository.listAdminOrders());
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  const status = String(req.body.status || '').toUpperCase();
  if (!validId(req.params.id) || !orderStatuses.has(status)) {
    return res.status(400).json({ message: 'Identificador ou estado do pedido inválido' });
  }
  try {
    const updated = await repository.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json({ message: 'Estado do pedido atualizado', status });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', async (_req, res, next) => {
  try {
    res.json(await repository.listDashboard());
  } catch (error) {
    next(error);
  }
});

router.get('/messages', async (_req, res, next) => {
  try {
    res.json(await repository.listContactMessages());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
