const { EmisPaymentError } = require('../services/emis');

function errorHandler(error, _req, res, _next) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'A imagem excede o limite de 5 MB' });
  }
  if (error instanceof Error && error.name === 'MulterError') {
    return res.status(400).json({ message: 'Não foi possível receber esta imagem' });
  }
  if (error instanceof EmisPaymentError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      message: 'A API não conseguiu autenticar na base de dados. Verifique DB_USER e DB_PASSWORD no ficheiro .env.'
    });
  }
  if (['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)) {
    return res.status(503).json({
      message: 'A base de dados não está disponível. Verifique se o MySQL está iniciado e confirme DB_HOST e DB_PORT no ficheiro .env.'
    });
  }
  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({
      message: 'A base de dados configurada não existe. Confirme DB_NAME no ficheiro .env.'
    });
  }
  if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) {
    return res.status(500).json({
      message: 'A estrutura da base de dados está desatualizada. Execute npm run db:migrate e reinicie a API.'
    });
  }
  return res.status(500).json({ message: 'Ocorreu um erro inesperado' });
}

module.exports = errorHandler;
