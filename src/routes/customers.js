const express = require('express');
const rateLimit = require('express-rate-limit');
const repository = require('../repositories/commerceRepository');
const { createToken } = require('../middleware/adminAuth');
const { requireCustomer } = require('../middleware/customerAuth');
const { hashPassword, verifyPassword } = require('../services/adminCredentials');
const { generateRecommendations } = require('../services/recommendationsAI');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas. Tente novamente mais tarde.' }
});

function validEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email) && email.length <= 190;
}

router.get('/locations/provinces', async (_req, res, next) => {
  try {
    res.json(await repository.listAngolaProvinces());
  } catch (error) {
    next(error);
  }
});

router.get('/locations/provinces/:id/municipalities', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
    return res.status(400).json({ message: 'Província inválida' });
  }
  try {
    res.json(await repository.listAngolaMunicipalities(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.post('/register', authLimiter, async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Autenticação não configurada' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const province = String(body.province || '').trim();
  const provinceId = Number(body.provinceId);
  const municipality = String(body.municipality || '').trim();
  const password = String(body.password || '');
  const preferenceIds = Array.isArray(body.preferenceIds) ? [...new Set(body.preferenceIds.map(Number))] : [];
  if (name.length < 2 || name.length > 160 || !validEmail(email) ||
      phone.length > 30 || password.length < 8 || password.length > 128 ||
      municipality.length < 2 || municipality.length > 120 ||
      (province ? province.length > 100 : !Number.isInteger(provinceId) || provinceId < 1) ||
      preferenceIds.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ message: 'Preencha todos os dados obrigatórios. A palavra-passe deve ter pelo menos 8 caracteres.' });
  }
  try {
    const passwordHash = await hashPassword(password);
    const customer = await repository.registerCustomer({
      name, email, phone, province, provinceId, municipality, passwordHash, preferenceIds
    });
    res.status(201).json({
      token: createToken(email, customer.id, 'customer'),
      customer
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este e-mail já está registado' });
    if (error.code === 'INVALID_LOCATION' || error.code === 'INVALID_PREFERENCES') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Autenticação não configurada' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!validEmail(email) || !password) return res.status(400).json({ message: 'E-mail ou palavra-passe inválidos' });
  try {
    const customer = await repository.getCustomerByEmail(email);
    if (!customer?.password_hash || !(await verifyPassword(password, customer.password_hash))) {
      return res.status(401).json({ message: 'E-mail ou palavra-passe inválidos' });
    }
    res.json({
      token: createToken(email, customer.id, 'customer'),
      customer: await repository.getCustomerProfile(customer.id)
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireCustomer);

router.get('/session', async (req, res, next) => {
  try {
    const customer = await repository.getCustomerProfile(req.customer.id);
    if (!customer) return res.status(401).json({ message: 'Conta de cliente não encontrada' });
    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    res.json(await repository.listCustomerOrders(req.customer.id));
  } catch (error) {
    next(error);
  }
});

router.put('/preferences', async (req, res, next) => {
  const preferenceIds = Array.isArray(req.body?.preferenceIds) ? [...new Set(req.body.preferenceIds.map(Number))] : [];
  if (preferenceIds.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ message: 'Preferências inválidas' });
  }
  try {
    await repository.updateCustomerPreferences(req.customer.id, preferenceIds);
    res.json({ message: 'Preferências atualizadas' });
  } catch (error) {
    if (error.code === 'INVALID_PREFERENCES') return res.status(400).json({ message: error.message });
    next(error);
  }
});

router.get('/recommendations', async (req, res, next) => {
  try {
    const { preferences, products } = await repository.getCustomerRecommendationContext(req.customer.id);
    const aiResult = await generateRecommendations({ preferences, products });
    const recommendedIds = aiResult?.productIds || [];
    const preferredCategories = new Set(preferences.map(preference => Number(preference.id)));
    const ranked = recommendedIds.length
      ? [...recommendedIds.map(id => products.find(product => Number(product.id) === id)).filter(Boolean),
        ...products.filter(product => !recommendedIds.includes(Number(product.id)))]
      : [...products].sort((left, right) =>
        Number(preferredCategories.has(Number(right.category_id))) - Number(preferredCategories.has(Number(left.category_id))) ||
        new Date(right.created_at) - new Date(left.created_at));
    res.json({
      source: aiResult ? 'ai' : 'preferences',
      message: aiResult?.message || 'Seleção baseada nas categorias que escolheu e nas novidades da loja.',
      rows: ranked.slice(0, 12)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
