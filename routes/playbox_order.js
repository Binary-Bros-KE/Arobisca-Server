const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

// Get all orders
router.get('/', asyncHandler(async (req, res) => {

}));


router.get('/orderByUserId/:userId', asyncHandler(async (req, res) => {

}));


// Get an order by ID
router.get('/:id', asyncHandler(async (req, res) => {

}));

// Create a new order
router.post('/', asyncHandler(async (req, res) => {

}));

// Update an order
router.put('/:id', asyncHandler(async (req, res) => {

}));

// Delete an order
router.delete('/:id', asyncHandler(async (req, res) => {

}));

module.exports = router;
