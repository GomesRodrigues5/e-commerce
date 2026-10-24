const express = require('express');
const repository = require('../repositories/commerceRepository');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await repository.listActiveAdvertisements());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
