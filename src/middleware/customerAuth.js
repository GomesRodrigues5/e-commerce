const { verifyToken } = require('./adminAuth');

function requireCustomer(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Autenticação não configurada' });
  }
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const customer = match && verifyToken(match[1]);
  if (!customer || customer.role !== 'customer' || !/^\d+$/.test(String(customer.sub))) {
    return res.status(401).json({ message: 'Inicie sessão para continuar' });
  }
  req.customer = { id: Number(customer.sub), email: customer.email };
  return next();
}

module.exports = { requireCustomer };
