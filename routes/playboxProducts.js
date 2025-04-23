const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Products = require('../model/plaboxProductsModel');

// Get all products
router.get('/', asyncHandler(async (req, res) => {
    try {
        const products = await Products.find();
        res.json({ success: true, message: "Products retrieved successfully.", products: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get products by category
router.get('/category/:category', asyncHandler(async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Products.find({ category: category });

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "No products found for this category." });
        }

        res.json({ success: true, message: "Products retrieved successfully.", products: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new product
router.post('/', asyncHandler(async (req, res) => {
    try {
        const product = new Products(req.body);
        const createdProduct = await product.save();
        res.json({ success: true, message: "Product created successfully.", data: createdProduct });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;
