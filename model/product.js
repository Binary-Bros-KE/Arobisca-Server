const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number
    },
    proCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        default: null
    },
    images: [{
        image: Number, // 1, 2, 3, 4, 5
        url: String,
        publicId: String,
        width: Number,
        height: Number,
        format: String,
        bytes: Number
    }]
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
