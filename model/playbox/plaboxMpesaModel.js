const mongoose = require('mongoose');
const playboxDb = require('../../config/playboxDb');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Only define the model if it doesn't already exist
const MpesaTransaction = playboxDb.models.MpesaTransaction || playboxDb.model('MpesaTransaction', paymentSchema);

module.exports = MpesaTransaction;
