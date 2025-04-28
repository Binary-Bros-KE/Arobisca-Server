const express = require('express');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const Order = require('../../model/playbox/playboxOrderModel');
const User = require('../../model/playbox/plaboxUserModel');
const router = express.Router();

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

// POST /playbox_order — create a new order
router.post('/', asyncHandler(async (req, res) => {
    const {
        user: userData,
        items,
        shippingAddress,
        billingAddress,
        shippingMethod,
        paymentMethod,
        transactionData,
        total
    } = req.body;

      console.log('Incoming Order Data:', req.body);

    // 1) Find user by email
    const userEmail = userData.email;
    let user = await User.findOne({ email: userEmail });

    // console.log('User from DB:', user);

    // 2) If no user found, create one
    if (!user) {
        const username = (userData.email || '').split('@')[0];
        const hashedPassword = await bcrypt.hash(userData.phone, 10);

        user = await User.create({
            username,
            email: userData.email,
            phoneNumber: userData.phone,
            password: hashedPassword,
            avatar: userData.avatar || 'https://res.cloudinary.com/dnrlt7lhe/image/upload/v1745656618/playbox_ngofr5.png',
            cart: [],
            favorites: [],
        });

        // console.log('New user created:', user);
    } else {
        // Optional: Update phoneNumber if missing (useful if user record was partial before)
        if (!user.phoneNumber && userData.phone) {
            user.phoneNumber = userData.phone;
        }
    }

    // 3) Award loyalty points
    const pointsEarned = calculateLoyalty(total);
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;

    // 4) Save shipping and billing addresses
    user.shippingAddresses = user.shippingAddresses || [];
    user.billingAddresses = user.billingAddresses || [];

    function isSameAddress(addr1, addr2) {
        return JSON.stringify(addr1) === JSON.stringify(addr2);
    }

    // Before pushing shippingAddress
    if (!user.shippingAddresses.some(existing => isSameAddress(existing, shippingAddress))) {
        user.shippingAddresses.push(shippingAddress);
    }

    // Before pushing billingAddress
    if (!user.billingAddresses.some(existing => isSameAddress(existing, billingAddress))) {
        user.billingAddresses.push(billingAddress);
    }

    // 5) Create the order
    const order = await Order.create({
        userId: user._id,
        products: items.map(item => ({
            imgUrl: item.selectedImage,
            name: item.Title,
            color: item.color || item.defaultColor,
            price: item.nowPrice,
            quantity: item.quantity,
        })),
        paymentMethod,
        shippingMethod,
        transactionData: paymentMethod === 'M-Pesa' ? transactionData : undefined,
        shippingAddress,
        billingAddress,
        total,
        orderStatus: 'pending',
        createdAt: new Date(),
    });

    user.orders = user.orders || [];
    user.orders.push(order._id);
    await user.save();


    res.status(201).json({
        success: true,
        message: 'Order created successfully',
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
