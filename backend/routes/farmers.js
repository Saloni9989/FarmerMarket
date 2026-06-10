const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const User = require('../models/User');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/farmers
// @desc    Get all approved farmers
router.get('/', async (req, res) => {
  try {
    const { state, cropType, method, search, page = 1, limit = 12 } = req.query;

    let query = { verificationStatus: 'approved', isActive: true };

    if (state) query['farmLocation.state'] = { $regex: state, $options: 'i' };
    if (cropType) query.cropTypes = { $in: [cropType] };
    if (method) query.farmingMethods = { $in: [method] };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Farmer.countDocuments(query);

    let farmers = await Farmer.find(query)
      .populate('user', 'name email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    if (search) {
      farmers = farmers.filter(f =>
        f.farmName.toLowerCase().includes(search.toLowerCase()) ||
        (f.user && f.user.name.toLowerCase().includes(search.toLowerCase()))
      );
    }

    res.json({
      success: true,
      count: farmers.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      farmers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/farmers/:id
// @desc    Get farmer by ID
router.get('/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id).populate('user', 'name email phone');
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const products = await Product.find({ farmer: farmer._id, isAvailable: true }).limit(8);

    res.json({ success: true, farmer, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/farmers/register
// @desc    Register farmer profile
router.post('/register', protect, authorize('farmer'), async (req, res) => {
  try {
    const existing = await Farmer.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Farmer profile already exists' });
    }

    const {
      farmName, farmLocation, farmSize, farmingMethods,
      cropTypes, description, certifications, bankDetails
    } = req.body;

    const farmer = await Farmer.create({
      user: req.user.id,
      farmName,
      farmLocation,
      farmSize,
      farmingMethods,
      cropTypes,
      description,
      certifications,
      bankDetails
    });

    res.status(201).json({
      success: true,
      message: 'Farmer profile created. Awaiting admin approval.',
      farmer
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/farmers/profile
// @desc    Update farmer profile
router.put('/profile', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    res.json({ success: true, message: 'Profile updated', farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/farmers/me/profile
// @desc    Get my farmer profile
router.get('/me/profile', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }
    res.json({ success: true, farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/farmers/me/dashboard
// @desc    Farmer dashboard stats
router.get('/me/dashboard', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    const Order = require('../models/Order');

    const totalProducts = await Product.countDocuments({ farmer: farmer._id });
    const activeProducts = await Product.countDocuments({ farmer: farmer._id, isAvailable: true });

    const orders = await Order.find({ 'items.farmer': farmer._id })
      .populate('consumer', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const totalOrders = await Order.countDocuments({ 'items.farmer': farmer._id });
    const pendingOrders = await Order.countDocuments({
      'items.farmer': farmer._id,
      status: { $in: ['placed', 'confirmed'] }
    });

    // Revenue calculation
    const allOrders = await Order.find({ 'items.farmer': farmer._id, status: 'delivered' });
    let totalRevenue = 0;
    allOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.farmer.toString() === farmer._id.toString()) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue,
        rating: farmer.rating
      },
      recentOrders: orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
