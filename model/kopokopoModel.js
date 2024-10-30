// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    status: { type: String, required: true },
    reference: String,
    phoneNumber: String,
    amount: String,
    currency: String,
    tillNumber: String,
    system: String,
    problems: String,
    initiationTime: Date,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
