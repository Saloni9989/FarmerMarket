const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  farmName: {
    type: String,
    required: [true, 'Farm name is required'],
    trim: true
  },
  farmLocation: {
    village: String,
    district: String,
    state: { type: String, required: true },
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  farmSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'small'
  },
  farmingMethods: [{
    type: String,
    enum: ['organic', 'conventional', 'natural', 'hydroponic', 'mixed']
  }],
  cropTypes: [{
    type: String,
    enum: ['vegetables', 'fruits', 'grains', 'dairy', 'spices', 'herbs', 'pulses', 'oilseeds', 'flowers', 'other']
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date
  }],
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  idProof: {
    type: String,  // file path
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNote: String,
  totalSales: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Farmer', farmerSchema);
