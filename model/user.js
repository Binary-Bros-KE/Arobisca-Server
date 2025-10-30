const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[^@]+@[^@]+\.[^@]+$/, 'Please enter a valid email address']
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resetCode: {
    type: String,
    required: false
  },
  resetCodeExpiration: {
    type: Date,
    required: false
  },
  verificationCode: {
    type: String,
    required: false
  },
  verificationCodeExpiration: {
    type: Date,
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
    required: false
  },
  verificationRequestCount: {
    type: Number,
    default: 0,
    required: false
  },
  lastVerificationRequest: {
    type: Date,
    required: false
  },
  shippingAddresses: {
    type: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        address: { type: String, required: true },
        apartment: { type: String },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
      },
    ],
    default: [],
    validate: {
      validator: function (addresses) {
        return addresses.length <= 3
      },
      message: "A user can only have up to 3 shipping addresses.",
    },
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
