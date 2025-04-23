
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    platform: String,
    platformIcon: String,
    playboxRating: String,
    playboxRatingIcon: String,
    detailsPoster: String,
    mainproductImage: String,
    imageColorMap: [{
        image: String,
        color: String
    }],
    defaultColor: String,
    Title: String,
    SubTitle: String,
    category: String,
    subCategory: String,
    brand: String,
    name: { type: String, unique: true, required: true },
    description: String,
    detailsDescription: String,
    topSpecs: [String],
    detailSpecs: [String],
    tags: [String],
    carousels: [String],
    storage: String,
    dropURL: String,
    youtubeReview: String,
    unboxingVideo: String,
    prevPrice: Number,
    nowPrice: Number,
    stock: Number,
    freeDelivery: Boolean,
    condition: String,
    rating: String,
}, { timestamps: true });

const Products = mongoose.model('Products', ProductSchema);

module.exports = Products;
