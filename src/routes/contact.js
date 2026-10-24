const express = require('express');
const repository = require('../repositories/commerceRepository');
const { requireAdmin } = require('../middleware/adminAuth');
const contactEmail = require('../services/contactEmail');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (name.length < 2 || name.length > 160 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 190 ||
        subject.length < 3 || subject.length > 200 ||
        message.length < 10 || message.length > 2000) {
      return res.status(400).json({ message: 'Dados de contato inválidos' });
    }
    const id = await repository.createContactMessage({ name, email, subject, message });
    let catalog = [];
    try {
      catalog = await repository.listContactProductContext();
    } catch (error) {
      console.error('Não foi possível atualizar o contexto do catálogo para a resposta automática:', error.message);
    }
    const emailResult = await contactEmail.sendContactEmail({ name, email, subject, message, catalog });
    const deliveryMessage = emailResult.customerReplySent
      ? emailResult.aiGenerated
        ? 'Mensagem guardada. A resposta automática personalizada foi enviada por e-mail.'
        : 'Mensagem guardada. A confirmação automática foi enviada por e-mail; a equipa responderá em breve.'
      : emailResult.configured
        ? 'Mensagem guardada, mas não foi possível enviar a resposta automática por e-mail.'
        : 'Mensagem guardada. O envio automático por e-mail ainda não está configurado.';
    res.status(201).json({
      id,
      status: 'NEW',
      emailSent: Boolean(emailResult.customerReplySent),
      aiGenerated: Boolean(emailResult.aiGenerated),
      notificationSent: Boolean(emailResult.notificationSent),
      message: deliveryMessage
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await repository.listContactMessages());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
