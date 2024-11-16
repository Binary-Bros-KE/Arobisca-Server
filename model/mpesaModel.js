const mongoose = require('mongoose');
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
        timestamps: true
    }
);

const MpesaTransaction = mongoose.model("MpesaTransaction", paymentSchema);

module.exports = MpesaTransaction;
