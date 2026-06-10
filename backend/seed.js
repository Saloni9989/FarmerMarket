/**
 * Seed Script - Creates demo data for Krishi Market
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Farmer = require('./models/Farmer');
const Product = require('./models/Product');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
};

const seed = async () => {
  await connectDB();

  console.log('🌱 Clearing existing data...');
  await User.deleteMany({ email: { $in: ['admin@krishimarket.com', 'farmer@demo.com', 'consumer@demo.com', 'farmer2@demo.com'] } });

  console.log('👤 Creating users...');

  // Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@krishimarket.com',
    password: 'admin123',
    role: 'admin',
    phone: '9800000000'
  });

  // Demo Consumer
  const consumer = await User.create({
    name: 'Priya Sharma',
    email: 'consumer@demo.com',
    password: 'demo123',
    role: 'consumer',
    phone: '9811111111',
    address: { street: '12 Green Park', city: 'New Delhi', state: 'Delhi', pincode: '110016' }
  });

  // Demo Farmer 1
  const farmerUser1 = await User.create({
    name: 'Rajesh Kumar',
    email: 'farmer@demo.com',
    password: 'demo123',
    role: 'farmer',
    phone: '9822222222'
  });

  // Demo Farmer 2
  const farmerUser2 = await User.create({
    name: 'Suresh Patil',
    email: 'farmer2@demo.com',
    password: 'demo123',
    role: 'farmer',
    phone: '9833333333'
  });

  console.log('🚜 Creating farmer profiles...');

  const farmer1 = await Farmer.create({
    user: farmerUser1._id,
    farmName: 'Green Fields Organic Farm',
    farmLocation: { village: 'Nashik Rural', district: 'Nashik', state: 'Maharashtra', pincode: '422001' },
    farmSize: 'medium',
    farmingMethods: ['organic', 'natural'],
    cropTypes: ['vegetables', 'fruits', 'spices'],
    description: 'We grow certified organic vegetables and fruits using natural farming methods on our 12-acre farm in Nashik district.',
    verificationStatus: 'approved'
  });

  const farmer2 = await Farmer.create({
    user: farmerUser2._id,
    farmName: 'Konkan Fruit Orchards',
    farmLocation: { village: 'Devgad', district: 'Sindhudurg', state: 'Maharashtra', pincode: '416804' },
    farmSize: 'large',
    farmingMethods: ['conventional', 'natural'],
    cropTypes: ['fruits', 'dairy', 'grains'],
    description: 'Specializing in Alphonso mangoes and coastal fruits from the Konkan belt.',
    verificationStatus: 'approved'
  });

  console.log('📦 Creating products...');

  const products = [
    { farmer: farmer1._id, name: 'Organic Tomatoes', category: 'vegetables', description: 'Fresh hand-picked organic tomatoes from our chemical-free farm.', price: 45, unit: 'kg', availableQuantity: 150, isOrganic: true, images: ['https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=600&auto=format&fit=crop'], tags: ['fresh', 'organic', 'tomatoes'], rating: { average: 4.5, count: 23 }, totalSold: 89 },
    { farmer: farmer1._id, name: 'Fresh Spinach', category: 'vegetables', description: 'Tender organic spinach, harvested daily.', price: 30, unit: 'bundle', availableQuantity: 80, isOrganic: true, images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop'], tags: ['leafy', 'organic', 'iron-rich'], rating: { average: 4.3, count: 18 }, totalSold: 55 },
    { farmer: farmer1._id, name: 'Red Onions', category: 'vegetables', description: 'Fresh red onions directly from our farm. Long shelf life.', price: 35, unit: 'kg', availableQuantity: 200, isOrganic: false, images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop'], tags: ['onions', 'fresh'], rating: { average: 4.2, count: 31 }, totalSold: 120 },
    { farmer: farmer1._id, name: 'Green Chillies', category: 'vegetables', description: 'Hot and fresh green chillies grown naturally.', price: 25, unit: 'kg', availableQuantity: 60, isOrganic: false, images: ['https://images.unsplash.com/photo-1526346698789-22fd84314424?w=600&auto=format&fit=crop'], rating: { average: 4.0, count: 12 }, totalSold: 34 },
    { farmer: farmer1._id, name: 'Coriander', category: 'herbs', description: 'Fresh aromatic coriander bundles, delivered same day.', price: 15, unit: 'bundle', availableQuantity: 100, isOrganic: true, images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop'], rating: { average: 4.6, count: 29 }, totalSold: 78 },
    { farmer: farmer2._id, name: 'Alphonso Mangoes', category: 'fruits', description: 'Premium GI-tagged Alphonso (Hapus) mangoes from Devgad, Konkan.', price: 250, unit: 'dozen', availableQuantity: 40, isOrganic: false, images: ['https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&auto=format&fit=crop'], tags: ['hapus', 'premium', 'mangoes'], rating: { average: 4.9, count: 67 }, totalSold: 145 },
    { farmer: farmer2._id, name: 'Organic Bananas', category: 'fruits', description: 'Naturally ripened organic bananas, no artificial ripening.', price: 60, unit: 'dozen', availableQuantity: 120, isOrganic: true, images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop'], rating: { average: 4.4, count: 38 }, totalSold: 200 },
    { farmer: farmer2._id, name: 'Pomegranates', category: 'fruits', description: 'Sweet and juicy pomegranates from our Solapur orchards.', price: 120, unit: 'kg', availableQuantity: 50, isOrganic: false, images: ['https://images.unsplash.com/photo-1604495772376-9657f0035b49?w=600&auto=format&fit=crop'], rating: { average: 4.6, count: 25 }, totalSold: 62 },
    { farmer: farmer2._id, name: 'Fresh Cow Milk', category: 'dairy', description: 'Pure cow milk from our desi cows. Delivered fresh every morning.', price: 65, unit: 'litre', availableQuantity: 200, isOrganic: false, images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop'], rating: { average: 4.7, count: 53 }, totalSold: 310 },
    { farmer: farmer2._id, name: 'Basmati Rice', category: 'grains', description: 'Aged basmati rice from our paddy fields. Long grain premium quality.', price: 130, unit: 'kg', availableQuantity: 300, isOrganic: false, images: ['https://images.unsplash.com/photo-1536304993881-ff86e0c9f5cf?w=600&auto=format&fit=crop'], rating: { average: 4.5, count: 42 }, totalSold: 180 }
  ];

  await Product.insertMany(products);
  console.log(`✅ Created ${products.length} products`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('==================================');
  console.log('Demo Accounts:');
  console.log('Admin:    admin@krishimarket.com / admin123');
  console.log('Farmer:   farmer@demo.com / demo123');
  console.log('Consumer: consumer@demo.com / demo123');
  console.log('==================================\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
