const nodemailer = require('nodemailer');
const { generateContactReply } = require('./contactAI');

const defaultContactAddress = 'ribeiro.gomes@gcgreen.ao';

function createContactEmailService({ env = process.env, mailer = nodemailer, replyGenerator = generateContactReply } = {}) {
  return async function sendContactEmail({ name, email, subject, message, catalog = [] }) {
    const host = env.SMTP_HOST || '';
    const user = env.SMTP_USER || '';
    const password = env.SMTP_PASSWORD || '';
    if (!host || !user || !password) return { configured: false, sent: false };

    const port = Number(env.SMTP_PORT || 587);
    const fromAddress = env.CONTACT_FROM || defaultContactAddress;
    const toAddress = env.CONTACT_TO || fromAddress;
    const transport = mailer.createTransport({
      host,
      port,
      secure: env.SMTP_SECURE === 'true' || (env.SMTP_SECURE !== 'false' && port === 465),
      auth: { user, pass: password }
    });

    let notificationSent = false;
    try {
      await transport.sendMail({
        from: `Faltou Ódio <${fromAddress}>`,
        to: toAddress,
        replyTo: email,
        subject: `Contacto: ${subject}`.slice(0, 240),
        text: `Nome: ${name}\nE-mail: ${email}\nAssunto: ${subject}\n\nMensagem:\n${message}`
      });
      notificationSent = true;
    } catch (error) {
      console.error('Falha na notificação interna de contacto por SMTP:', error.message);
    }

    const aiReply = await replyGenerator({ name, email, subject, message, catalog });
    const aiGenerated = Boolean(aiReply);
    const replyText = aiReply || `Olá ${name},\n\nObrigado por entrar em contacto com a Faltou Ódio. Recebemos a sua mensagem e a nossa equipa irá analisá-la e responder assim que possível.\n\nCumprimentos,\nEquipa Faltou Ódio`;
    let customerReplySent = false;
    try {
      await transport.sendMail({
        from: `Faltou Ódio <${fromAddress}>`,
        to: email,
        replyTo: toAddress,
        subject: `Re: ${subject}`.slice(0, 240),
        text: replyText
      });
      customerReplySent = true;
    } catch (error) {
      console.error('Falha no envio da resposta ao cliente por SMTP:', error.message);
    }

    return { configured: true, sent: customerReplySent, customerReplySent, notificationSent, aiGenerated };
  };
}

module.exports = {
  createContactEmailService,
  sendContactEmail: createContactEmailService()
};