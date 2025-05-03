const mongoose = require('mongoose');
const playboxDb = require('../../config/playboxDb');

const productSchema = new mongoose.Schema({
    imgUrl: { type: String },
    name: { type: String },
    color: { type: String },
    price: { type: Number },
    quantity: { type: Number },
});

const addressSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  address: { type: String },
  apartment: { type: String },
  city: { type: String },
  postalCode: { type: String },
  phone: { type: String },
});

const transactionSchema = new mongoose.Schema({
    phone: { type: String },
    amount: { type: Number },
    transactionId: { type: String },
});

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Link to User model
        required: true
    },
    products: [productSchema],
    paymentMethod: { type: String },
    specialDeliveryNote: { type: String },
    transactionData: transactionSchema,
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    total: { type: Number },   
    orderStatus: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// const Order = playboxDb.models.Order || mongoose.model('Order', orderSchema);

const Order = playboxDb.models.Order || playboxDb.model('Order', orderSchema);

module.exports = Order;
