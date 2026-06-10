const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require admin role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'consumer' });
    const totalFarmers = await Farmer.countDocuments();
    const approvedFarmers = await Farmer.countDocuments({ verificationStatus: 'approved' });
    const pendingFarmers = await Farmer.countDocuments({ verificationStatus: 'pending' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const pendingOrders = await Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'processing'] } });

    // Total revenue
    const revenueData = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Monthly orders trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const recentOrders = await Order.find()
      .populate('consumer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentFarmers = await Farmer.find({ verificationStatus: 'pending' })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers, totalFarmers, approvedFarmers, pendingFarmers,
        totalProducts, totalOrders, deliveredOrders, pendingOrders, totalRevenue
      },
      monthlyOrders,
      recentOrders,
      pendingFarmers: recentFarmers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/farmers
// @desc    Get all farmers (with filters)
router.get('/farmers', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = {};
    if (status) query.verificationStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Farmer.countDocuments(query);

    const farmers = await Farmer.find(query)
      .populate('user', 'name email phone createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ success: true, count: farmers.length, total, pages: Math.ceil(total / limit), farmers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/farmers/:id/verify
// @desc    Approve or reject farmer
router.put('/farmers/:id/verify', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: status, verificationNote: note },
      { new: true }
    ).populate('user', 'name email');

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    res.json({ success: true, message: `Farmer ${status} successfully`, farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    let query = {};
    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, total, pages: Math.ceil(total / limit), users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/users/:id/toggle
// @desc    Toggle user active status
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('consumer', 'name email phone')
      .populate('items.product', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, total, pages: Math.ceil(total / limit), orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products
router.get('/products', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    let query = {};
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate({ path: 'farmer', populate: { path: 'user', select: 'name' } })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, total, pages: Math.ceil(total / limit), products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/products/:id/toggle
// @desc    Toggle product availability
router.put('/products/:id/toggle', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.json({ success: true, message: `Product ${product.isAvailable ? 'enabled' : 'disabled'}`, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/admin/seed
// @desc    Seed demo data
router.post('/seed', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');

    // Create admin user if not exists
    let admin = await User.findOne({ email: 'admin@krishimarket.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@krishimarket.com',
        password: 'admin123',
        role: 'admin'
      });
    }

    res.json({ success: true, message: 'Seed data created', admin: { email: admin.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
