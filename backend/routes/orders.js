const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Place a new order
router.post('/', protect, authorize('consumer'), async (req, res) => {
  try {
    const { items, deliveryAddress, deliverySlot, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate('farmer');
      if (!product || !product.isAvailable) {
        return res.status(400).json({ success: false, message: `Product ${item.product} is not available` });
      }
      if (product.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for ${product.name}. Available: ${product.availableQuantity}`
        });
      }

      orderItems.push({
        product: product._id,
        farmer: product.farmer._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        unit: product.unit,
        image: product.images[0] || null
      });

      subtotal += product.price * item.quantity;
    }

    const deliveryCharge = subtotal > 500 ? 0 : 40;
    const totalAmount = subtotal + deliveryCharge;

    const order = await Order.create({
      consumer: req.user.id,
      items: orderItems,
      deliveryAddress,
      deliverySlot,
      subtotal,
      deliveryCharge,
      totalAmount,
      paymentMethod: paymentMethod || 'cod',
      notes,
      statusHistory: [{ status: 'placed', note: 'Order placed successfully' }]
    });

    // Update product quantities
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { availableQuantity: -item.quantity, totalSold: item.quantity }
      });
    }

    await order.populate([
      { path: 'consumer', select: 'name email phone' },
      { path: 'items.product', select: 'name images' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get consumer's orders
router.get('/my-orders', protect, authorize('consumer'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = { consumer: req.user.id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('items.product', 'name images category')
      .populate('items.farmer', 'farmName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/orders/farmer-orders
// @desc    Get orders for farmer
router.get('/farmer-orders', protect, authorize('farmer'), async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user.id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    let query = { 'items.farmer': farmer._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('consumer', 'name email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, count: orders.length, total, pages: Math.ceil(total / limit), orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('consumer', 'name email phone address')
      .populate('items.product', 'name images category unit')
      .populate({ path: 'items.farmer', populate: { path: 'user', select: 'name phone' } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
    if (
      req.user.role === 'consumer' && order.consumer._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (farmer or admin)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate status transition
    const validTransitions = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['dispatched'],
      dispatched: ['delivered'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    order.status = status;
    order.statusHistory.push({ status, note: note || `Order ${status}` });

    if (status === 'delivered') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (consumer)
router.put('/:id/cancel', protect, authorize('consumer'), async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const order = await Order.findOne({ _id: req.params.id, consumer: req.user.id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['placed', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'cancelled';
    order.cancelReason = cancelReason || 'Cancelled by consumer';
    order.statusHistory.push({ status: 'cancelled', note: cancelReason || 'Cancelled by consumer' });

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { availableQuantity: item.quantity, totalSold: -item.quantity }
      });
    }

    await order.save();
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
