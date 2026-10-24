const express = require('express');
const repository = require('../repositories/commerceRepository');
const { EmisService } = require('../services/emis');
const { requireCustomer } = require('../middleware/customerAuth');

const router = express.Router();
const emis = new EmisService();

function validateOrderBody(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.items) || body.items.length === 0) {
    return 'Pelo menos um item é obrigatório';
  }
  if (!['EMIS', 'CASH'].includes(String(body.paymentMethod || 'EMIS').toUpperCase())) {
    return 'Método de pagamento inválido';
  }
  if (body.items.some(item => !item || typeof item !== 'object' ||
      !Number.isSafeInteger(Number(item.productId)) || Number(item.productId) < 1 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)) {
    return 'Os itens incluem dados inválidos';
  }
  const quantities = new Map();
  for (const item of body.items) {
    const productId = Number(item.productId);
    quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 1000)) return 'A quantidade máxima por produto é 1000';
  return null;
}

router.post('/', async (req, res, next) => {
  const error = validateOrderBody(req.body);
  if (error) return res.status(400).json({ message: error });
  return requireCustomer(req, res, () => createPurchase(req, res, next));
});

async function createPurchase(req, res, next) {
  try {
    const error = validateOrderBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const order = await repository.createOrder({
      customerId: req.customer.id,
      items: req.body.items,
      deliveryAddress: req.body.deliveryAddress || {},
      paymentMethod: String(req.body.paymentMethod || 'EMIS').toUpperCase()
    });
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

router.post('/reservations', requireCustomer, async (req, res, next) => {
  try {
    const items = req.body && req.body.items;
    if (!Array.isArray(items) || !items.length ||
        items.some(item => !item || typeof item !== 'object' ||
          !Number.isSafeInteger(Number(item.productId)) || Number(item.productId) < 1 ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)) {
      return res.status(400).json({ message: 'Selecione pelo menos um produto e uma quantidade válida' });
    }
    const totals = new Map();
    items.forEach(item => {
      const id = Number(item.productId);
      totals.set(id, (totals.get(id) || 0) + item.quantity);
    });
    if ([...totals.values()].some(quantity => quantity > 1000)) {
      return res.status(400).json({ message: 'A quantidade máxima por produto é 1000' });
    }
    const reservation = await repository.createReservation({
      customerId: req.customer.id,
      items
    });
    res.status(201).json({ reservation });
  } catch (error) {
    next(error);
  }
});

router.get('/track/:orderNumber', requireCustomer, async (req, res, next) => {
  try {
    const order = await repository.getOrderByNumber(req.params.orderNumber.toUpperCase());
    if (!order || Number(order.customer_id) !== req.customer.id) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/payments', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
    return res.status(400).json({ message: 'Identificador do pedido inválido' });
  }
  return requireCustomer(req, res, () => createPayment(req, res, next));
});

async function createPayment(req, res, next) {
  try {
    if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
      return res.status(400).json({ message: 'Identificador do pedido inválido' });
    }
    const order = await repository.getOrderByIdForCustomer(req.params.id, req.customer.id);
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    if (order.status === 'PAID') return res.status(409).json({ message: 'Pedido já pago' });
    if (order.payment_method !== 'EMIS') return res.status(409).json({ message: 'Este pedido não usa pagamento EMIS' });
    const payment = await emis.createPayment({
      ...order,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone
    });
    await repository.savePayment({
      orderId: order.id,
      provider: 'EMIS',
      transactionId: payment.transactionId,
      reference: payment.reference,
      amount: order.total,
      status: payment.status,
      response: payment.response
    });
    const orderStatus = payment.status === 'APPROVED' ? 'PAID' : 'PAYMENT_PENDING';
    await repository.updateOrderStatus(order.id, orderStatus);
    res.status(201).json({ payment, order: { id: order.id, orderNumber: order.order_number, status: orderStatus } });
  } catch (error) {
    next(error);
  }
}

module.exports = router;
