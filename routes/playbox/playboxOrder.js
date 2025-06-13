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
        .populate('userId', 'avatar username email loyaltyPoints')
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


/* @returns {boolean} - True if addresses match*/
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


//----------- Create order route
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

    console.log(`expiresIn`, expiresIn);
    console.log(`token`, token);

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
        data: {
            user,
            order,
            token,
            expiresIn,
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




// GET /playbox_order/:id — get single order by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    const order = await Order.findById(id)
        .populate('userId', 'username email phoneNumber loyaltyPoints');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.json({
        success: true,
        data: order
    });
}));

// GET /playbox_order/user/:userId — get all orders for a specific user
router.get('/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID format'
        });
    }

    const orders = await Order.find({ userId })
        .populate('userId', 'username email phoneNumber loyaltyPoints')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
}));

// PATCH /playbox_order/:id/status — update order status
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orderStatus } = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    const order = await Order.findByIdAndUpdate(
        id,
        { orderStatus },
        { new: true, runValidators: true }
    ).populate('userId', 'username email phoneNumber loyaltyPoints');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order
    });
}));

// PUT /playbox_order/:id — update entire order (admin only)
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    // Remove fields that shouldn't be updated
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData._id;

    const order = await Order.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('userId', 'username email phoneNumber loyaltyPoints');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.json({
        success: true,
        message: 'Order updated successfully',
        data: order
    });
}));

// DELETE /playbox_order/:id — delete order (admin only)
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    const order = await Order.findById(id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    // Remove order from user's orders array
    if (order.userId) {
        await User.findByIdAndUpdate(
            order.userId,
            { $pull: { orders: order._id } }
        );
    }

    await Order.findByIdAndDelete(id);

    res.json({
        success: true,
        message: 'Order deleted successfully',
        data: { deletedOrderId: id }
    });
}));

// GET /playbox_order/status/:status — get orders by status
router.get('/status/:status', asyncHandler(async (req, res) => {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find({ orderStatus: status })
        .populate('userId', 'username email phoneNumber loyaltyPoints')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments({ orderStatus: status });

    res.json({
        success: true,
        data: orders,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / parseInt(limit)),
            totalOrders,
            hasNextPage: skip + orders.length < totalOrders,
            hasPreviousPage: parseInt(page) > 1
        }
    });
}));

// GET /playbox_order/search — search orders
router.get('/search/query', asyncHandler(async (req, res) => {
    const { q, status, startDate, endDate, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Search query is required'
        });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    // Build search conditions
    const searchConditions = [];

    // Search in user data (need to populate first or use aggregation)
    // For now, let's search by order ID or transaction ID
    if (q.match(/^[0-9a-fA-F]{24}$/)) {
        searchConditions.push({ _id: q });
    }

    // Search in transaction data
    if (q) {
        searchConditions.push({
            'transactionData.transactionId': { $regex: q, $options: 'i' }
        });
        searchConditions.push({
            'transactionData.phone': { $regex: q, $options: 'i' }
        });
    }

    if (searchConditions.length > 0) {
        query.$or = searchConditions;
    }

    // Add status filter
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        query.orderStatus = status;
    }

    // Add date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
        .populate('userId', 'username email phoneNumber loyaltyPoints')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    res.json({
        success: true,
        data: orders,
        searchQuery: q,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / parseInt(limit)),
            totalOrders,
            hasNextPage: skip + orders.length < totalOrders,
            hasPreviousPage: parseInt(page) > 1
        }
    });
}));

// PATCH /playbox_order/:id/delivery-note — update delivery note
router.patch('/:id/delivery-note', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { specialDeliveryNote } = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    const order = await Order.findByIdAndUpdate(
        id,
        { specialDeliveryNote },
        { new: true, runValidators: true }
    ).populate('userId', 'username email phoneNumber loyaltyPoints');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.json({
        success: true,
        message: 'Delivery note updated successfully',
        data: order
    });
}));




module.exports = router;
