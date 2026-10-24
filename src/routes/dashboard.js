const express = require('express');
const repository = require('../repositories/commerceRepository');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await repository.listDashboard());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
