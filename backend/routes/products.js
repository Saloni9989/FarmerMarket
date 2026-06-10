const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/products
// @desc    Get all products with filters
router.get('/', async (req, res) => {
  try {
    const {
      category, isOrganic, farmer, minPrice, maxPrice,
      search, state, page = 1, limit = 12, sort = '-createdAt'
    } = req.query;

    let query = { isAvailable: true };

    if (category) query.category = category;
    if (isOrganic !== undefined) query.isOrganic = isOrganic === 'true';
    if (farmer) query.farmer = farmer;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Filter by state through farmer
    if (state) {
      const farmers = await Farmer.find({
        'farmLocation.state': { $regex: state, $options: 'i' },
        verificationStatus: 'approved'
      }).select('_id');
      query.farmer = { $in: farmers.map(f => f._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate({
        path: 'farmer',
        populate: { path: 'user', select: 'name' }
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/products/categories
// @desc    Get product categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured/top rated products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true })
      .populate({ path: 'farmer', populate: { path: 'user', select: 'name' } })
      .sort({ 'rating.average': -1, totalSold: -1 })
      .limit(8);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'farmer',
        populate: { path: 'user', select: 'name email phone' }
      });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const Review = require('../models/Review');
    const reviews = await Review.find({ product: product._id })
      .populate('consumer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, product, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/products
// @desc    Create product (farmer only)
router.post('/', protect, authorize('farmer'), upload.array('images', 5), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    if (farmer.verificationStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Your account must be approved before listing products' });
    }

    const images = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : [];

    const product = await Product.create({
      ...req.body,
      farmer: farmer._id,
      images,
      isOrganic: req.body.isOrganic === 'true' || req.body.isOrganic === true
    });

    res.status(201).json({ success: true, message: 'Product listed successfully', product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product (farmer only)
router.put('/:id', protect, authorize('farmer'), upload.array('images', 5), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    const product = await Product.findOne({ _id: req.params.id, farmer: farmer._id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    const newImages = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : [];
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : product.images;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, images: [...existingImages, ...newImages] },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Product updated', product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product (farmer only)
router.delete('/:id', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    const product = await Product.findOneAndDelete({ _id: req.params.id, farmer: farmer._id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/products/farmer/my-products
// @desc    Get farmer's own products
router.get('/farmer/my-products', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    const products = await Product.find({ farmer: farmer._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
