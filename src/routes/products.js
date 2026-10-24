const express = require('express');
const repository = require('../repositories/commerceRepository');

const router = express.Router();

function positiveInteger(value, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return { error: `Parâmetro ${name} inválido` };
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    return { error: `Parâmetro ${name} inválido` };
  }
  return number;
}

router.get('/', async (req, res, next) => {
  const limit = positiveInteger(req.query.limit, 'limit', 24, 100);
  const page = positiveInteger(req.query.page, 'page', 1, 1000000);
  const categoryId = positiveInteger(req.query.categoryId, 'categoryId', null);
  if (typeof limit === 'object' || typeof page === 'object' || (categoryId && typeof categoryId === 'object')) {
    return res.status(400).json({ message: 'Parâmetros de paginação inválidos' });
  }
  if (req.query.search !== undefined && (typeof req.query.search !== 'string' || req.query.search.length > 100)) {
    return res.status(400).json({ message: 'Parâmetro de pesquisa inválido (máximo 100 caracteres)' });
  }
  try {
    const result = await repository.listProducts({
      categoryId,
      search: req.query.search,
      limit,
      page
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await repository.getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    res.json(await repository.listReviews(req.params.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
