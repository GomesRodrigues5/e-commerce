const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derivedKey = await scrypt(String(password), salt, keyLength);
  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, encodedKey, extra] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !encodedKey || extra) return false;
  const expected = Buffer.from(encodedKey, 'base64url');
  const actual = await scrypt(String(password), salt, keyLength);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };