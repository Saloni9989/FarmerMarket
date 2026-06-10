const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/reviews
// @desc    Add a review
router.post('/', protect, authorize('consumer'), async (req, res) => {
  try {
    const { orderId, productId, farmerId, rating, comment } = req.body;

    const order = await Order.findOne({ _id: orderId, consumer: req.user.id, status: 'delivered' });
    if (!order) {
      return res.status(400).json({ success: false, message: 'You can only review delivered orders' });
    }

    if (order.isReviewed) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this order' });
    }

    const review = await Review.create({
      consumer: req.user.id,
      product: productId,
      farmer: farmerId,
      order: orderId,
      rating,
      comment
    });

    // Update product rating
    if (productId) {
      const reviews = await Review.find({ product: productId });
      const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
      await Product.findByIdAndUpdate(productId, {
        'rating.average': avgRating.toFixed(1),
        'rating.count': reviews.length
      });
    }

    // Update farmer rating
    if (farmerId) {
      const farmerReviews = await Review.find({ farmer: farmerId });
      const avgRating = farmerReviews.reduce((acc, r) => acc + r.rating, 0) / farmerReviews.length;
      await Farmer.findByIdAndUpdate(farmerId, {
        'rating.average': avgRating.toFixed(1),
        'rating.count': farmerReviews.length
      });
    }

    order.isReviewed = true;
    await order.save();

    res.status(201).json({ success: true, message: 'Review submitted', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('consumer', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/reviews/farmer/:farmerId
// @desc    Get reviews for a farmer
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const reviews = await Review.find({ farmer: req.params.farmerId })
      .populate('consumer', 'name avatar')
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
