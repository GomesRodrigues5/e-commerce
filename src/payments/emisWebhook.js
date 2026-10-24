const crypto = require('node:crypto');
const repository = require('../repositories/commerceRepository');

const webhookSecret = process.env.EMIS_WEBHOOK_SECRET || '';

async function handleEmisWebhook(req, res) {
  if (!webhookSecret) {
    return res.status(503).json({ message: 'Webhook EMIS não configurado' });
  }
  const signature = req.headers['x-emis-signature'] || req.headers['x-signature'] || '';
  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const digest = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
  const expectedSignature = signature.replace(/^sha256=/, '');
  const signatureMatches = expectedSignature.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expectedSignature));
  if (!signatureMatches) {
    return res.status(401).json({ message: 'Assinatura inválida' });
  }
  const parsedBody = JSON.parse(payload.toString('utf8'));
  const event = parsedBody.event || parsedBody.type || 'payment.updated';
  const payment = parsedBody.data || parsedBody.payment || parsedBody;
  const orderNumber = payment.reference || payment.order_number || payment.orderNumber;
  const order = await repository.getOrderByNumber(orderNumber);
  if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
  const statusMap = {
    approved: { payment: 'APPROVED', order: 'PAID' },
    paid: { payment: 'APPROVED', order: 'PAID' },
    successful: { payment: 'APPROVED', order: 'PAID' },
    completed: { payment: 'APPROVED', order: 'PAID' },
    failed: { payment: 'FAILED', order: 'FAILED' },
    cancelled: { payment: 'CANCELLED', order: 'CANCELLED' },
    refunded: { payment: 'REFUNDED' }
  };
  const eventStatus = String(event).toLowerCase().split('.').pop();
  const paymentState = statusMap[String(payment.status || eventStatus).toLowerCase()]
    || statusMap[String(event).toLowerCase()]
    || { payment: 'PENDING' };
  if (paymentState.order) await repository.updatePaymentStatus(order.id, paymentState.order);
  await repository.savePayment({
    orderId: order.id,
    provider: 'EMIS',
    transactionId: payment.transaction_id || payment.id || payment.reference,
    reference: payment.reference || payment.transaction_id,
    amount: Number(payment.amount || order.total),
    status: paymentState.payment,
    response: parsedBody
  });
  return res.status(200).json({ received: true });
}

module.exports = { handleEmisWebhook };
