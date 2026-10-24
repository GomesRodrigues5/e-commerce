const crypto = require('node:crypto');

const tokenLifetimeSeconds = 8 * 60 * 60;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createToken(email, adminId = null, role = 'admin') {
  const secret = process.env.JWT_SECRET || '';
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({
    email,
    sub: adminId,
    role,
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.email || !Number.isInteger(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Autenticação administrativa não configurada' });
  }
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const admin = match && verifyToken(match[1]);
  if (!admin || admin.role === 'customer') return res.status(401).json({ message: 'Autenticação necessária' });
  req.admin = admin;
  return next();
}

module.exports = { createToken, requireAdmin, safeEqual, verifyToken };