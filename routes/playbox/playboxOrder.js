const express = require('express');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const Order = require('../../model/playbox/playboxOrderModel');
const User = require('../../model/playbox/plaboxUserModel');
const router = express.Router();
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

// GET /playbox_order — return all orders (admin)
router.get('/', asyncHandler(async (req, res) => {
    const orders = await Order.find()
        .populate('userId', 'username email loyaltyPoints')
        .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
}));

// Loyalty calculation utility
function calculateLoyalty(total) {
    if (total < 1000) return 0.1;
    if (total < 10000) return 0.5;
    if (total < 50000) return 1;
    if (total < 100000) return 1.5;
    if (total < 200000) return 2;
    if (total < 300000) return 2.5;
    return 0;
}

/* @returns {boolean} - True if addresses match
 */
function isSameAddress(addr1, addr2) {
    // If either is undefined, they can't be the same
    if (!addr1 || !addr2) return false;

    // Check each field for equality
    return (
        addr1.firstName?.toLowerCase() === addr2.firstName?.toLowerCase() &&
        addr1.lastName?.toLowerCase() === addr2.lastName?.toLowerCase() &&
        addr1.address?.toLowerCase() === addr2.address?.toLowerCase() &&
        addr1.apartment?.toLowerCase() === addr2.apartment?.toLowerCase() &&
        addr1.city?.toLowerCase() === addr2.city?.toLowerCase() &&
        addr1.postalCode === addr2.postalCode &&
        addr1.phone === addr2.phone
    );
}

// Implementation in your route handler:
router.post('/', asyncHandler(async (req, res) => {
    const {
        user: userData,
        items,
        shippingAddress,
        billingAddress,
        shippingMethod,
        specialDeliveryNote,
        paymentMethod,
        newsUpdates,
        transactionData,
        total
    } = req.body;

    console.log('Incoming Order Data:', req.body);
    console.log('newsUpdates:', newsUpdates);

    // 1) Find user by email
    const userEmail = userData.email;
    let user = await User.findOne({ email: userEmail });

    // 2) If no user found, create one
    if (!user) {
        const username = (userData.email || '').split('@')[0];
        const hashedPassword = await bcrypt.hash(userData.phone, 10);

        user = await User.create({
            username,
            email: userData.email,
            phoneNumber: userData.phone,
            password: hashedPassword,
            newsUpdates,
            avatar: userData.avatar || 'https://res.cloudinary.com/dnrlt7lhe/image/upload/v1745656618/playbox_ngofr5.png',
            cart: [],
            favorites: [],
            shippingAddresses: [],
            billingAddresses: []
        });
    } else {
        // Optional: Update phoneNumber if missing
        if (!user.phoneNumber && userData.phone) {
            user.phoneNumber = userData.phone;
        }
    }

    // 3) Award loyalty points
    const pointsEarned = calculateLoyalty(total);
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
    user.newsUpdates = newsUpdates;

    // 4) Check and save shipping address if it doesn't exist
    const shippingAddressExists = user.shippingAddresses.some(existing =>
        isSameAddress(existing, shippingAddress)
    );

    if (!shippingAddressExists && shippingAddress) {
        user.shippingAddresses.push(shippingAddress);
    }

    // 5) Check and save billing address if it doesn't exist
    const billingAddressExists = user.billingAddresses.some(existing =>
        isSameAddress(existing, billingAddress)
    );

    if (!billingAddressExists && billingAddress) {
        user.billingAddresses.push(billingAddress);
    }

    const expiresIn = '3d';
    // Generate token
    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn }
    );

    // 6) Create the order
    const order = await Order.create({
        userId: user._id,
        products: items.map(item => ({
            imgUrl: item.selectedImage,
            name: item.Title,
            color: item.color || item.defaultColor,
            price: item.nowPrice,
            quantity: item.quantity,
        })),
        specialDeliveryNote,
        paymentMethod,
        shippingMethod,
        transactionData: paymentMethod === 'M-Pesa' ? transactionData : undefined,
        shippingAddress,
        billingAddress,
        total,
        orderStatus: 'pending',
        createdAt: new Date(),
    });

    // Initialize orders array if it doesn't exist
    user.orders = user.orders || [];
    user.orders.push(order._id);
    await user.save();

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        token,
        expiresIn,
        data: {
            user,
            order,
            loyaltyPointsAwarded: pointsEarned
        }
    });
}));


// POST /playbox_order/multiple — fetch multiple orders by IDs
router.post('/multiple', asyncHandler(async (req, res) => {
    const { orderIds } = req.body;

    // Validate
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No order IDs provided.'
        });
    }

    // Fetch orders
    const orders = await Order.find({
        _id: { $in: orderIds }
    });

    res.status(200).json({
        success: true,
        count: orders.length,
        orders
    });
}));





module.exports = router;
