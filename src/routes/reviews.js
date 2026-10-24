const express = require('express');
const repository = require('../repositories/commerceRepository');
const { requireCustomer } = require('../middleware/customerAuth');

const router = express.Router();

router.post('/', requireCustomer, async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();
    const productId = Number(req.body.productId);
    if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3) {
      return res.status(400).json({ message: 'Avaliação inválida' });
    }
    const id = await repository.addReview({
      productId,
      customerId: req.customer.id,
      rating,
      comment
    });
    res.status(201).json({ id, status: 'PENDING_APPROVAL' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
