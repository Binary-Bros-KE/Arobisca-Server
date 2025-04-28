const mongoose = require('mongoose');
const playboxDb = require('../../config/playboxDb');

const addressSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  address: { type: String },
  apartment: { type: String },
  city: { type: String },
  postalCode: { type: String },
  phone: { type: String },
});

const gamePlayedSchema = new mongoose.Schema({
  category: { type: String, },
  productId: { type: Number },
  color: { type: String },
});

const gamingSocialSchema = new mongoose.Schema({
  platform: { type: String },
  whatsapp: { type: String },
});

// Enum for Playbox Rated (based on loyalty + games played)
const playboxRanks = ['Newbie', 'Casual Gamer', 'Hardcore Gamer', 'Pro Gamer', 'Legend', 'Playbox Champion'];

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

  loyaltyPoints: {
    type: Number,
    default: 0,
  },

  shippingAddresses: [addressSchema], // Array of shipping addresses
  billingAddresses: [addressSchema],  // Array of billing addresses

  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }], // Order IDs

  gamesPlayed: [gamePlayedSchema], // Games the user has played

  playboxRated: {
    type: String,
    enum: playboxRanks,
    default: 'Newbie',
  },

  gamingSocials: [gamingSocialSchema], // All gaming social contacts
  showOnCommunity: { type: Boolean, default: false },

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
  { timestamps: true });

const User = playboxDb.models.User || playboxDb.model('User', userSchema);

module.exports = User;



