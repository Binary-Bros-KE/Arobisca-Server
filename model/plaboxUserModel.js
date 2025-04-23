const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: '',
    },
    cart: {
      type: Array,
      default: [], // Array to store cart items
    },
    favorites: {
      type: Array,
      default: [], // Array to store wishlist/favorites items
    },
    verified: {
      type: Boolean,
      default: false, // Set to false by default, will require email verification
    },
  },
  { timestamps: true }
);


// Only define the model if it doesn't already exist
const MpesaTransaction =
  mongoose.models.User || mongoose.model('User', userSchema);

module.exports = MpesaTransaction;

