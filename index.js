const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const http = require('http');
const { startWebSocketServer } = require('./sockets/websocketState');
const Order = require('./model/playbox/playboxOrderModel');
const sendOrderNotification = require('./utils/sendOrderNotification');


const app = express();
const server = http.createServer(app);


const retryFailedOrderEmails = async () => {
    try {
        const failedOrders = await Order.find({ emailSent: false });
        for (const order of failedOrders) {
            const success = await sendOrderNotification(order);
            if (success) {
                order.emailSent = true;
                await order.save();
                console.log(`✅ Resent email for order ${order._id}`);
            }
        }
    } catch (err) {
        console.error("❌ Error retrying failed emails:", err.message);
    }
};

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
// GLOBAL MIDDLEWARE — retry on every request
let lastRetry = 0;

app.use(async (req, res, next) => {
    const now = Date.now();
    if (now - lastRetry > 5 * 60 * 1000) { // every 5 minutes max
        try {
            await retryFailedOrderEmails();
            lastRetry = now;
        } catch (err) {
            console.error("Retry email middleware error:", err.message);
        }
    }
    next();
});


// Static folders
app.use('/image/products', express.static('public/products'));
app.use('/image/category', express.static('public/category'));
app.use('/image/poster', express.static('public/posters'));

// MongoDB connection
const URL = process.env.MONGO_URL;
mongoose.connect(URL);
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('☕ Connected to Arobisca Database'));

// Routes
app.use('/categories', require('./routes/category'));
app.use('/products', require('./routes/product'));
app.use('/couponCodes', require('./routes/couponCode'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
app.use('/mpesa', require('./routes/mpesa'));
app.use('/password', require('./routes/password'));
app.use('/shipping-fees', require('./routes/shippingFees'));
app.use('/dashboard', require('./routes/dashboard'));

//------- PLAYBOX :)
app.use('/playbox_mpesa', require('./routes/playbox/playboxMpesa'));
app.use('/playbox_order', require('./routes/playbox/playboxOrder'));
app.use('/playbox_products', require('./routes/playbox/playboxProducts'));
app.use('/playbox_user', require('./routes/playbox/playboxUser'));
app.use('/playbox_password', require('./routes/playbox/playboxPassword'));

// Example route
app.get('/', asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'API working successfully', data: null });
}));

// Start WebSocket server
const { clients } = startWebSocketServer(server);


// Start the server
server.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
});


