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
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
