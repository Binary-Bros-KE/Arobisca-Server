const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io'); // Import socket.io

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize socket.io and attach it to the server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// setting static folder path
app.use('/image/products', express.static('public/products'));
app.use('/image/category', express.static('public/category'));
app.use('/image/poster', express.static('public/posters'));

const URL = process.env.MONGO_URL;
mongoose.connect(URL);
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));

// Routes
app.use('/categories', require('./routes/category'));
app.use('/subCategories', require('./routes/subCategory'));
app.use('/brands', require('./routes/brand'));
app.use('/variantTypes', require('./routes/variantType'));
app.use('/variants', require('./routes/variant'));
app.use('/products', require('./routes/product'));
app.use('/couponCodes', require('./routes/couponCode'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
app.use('/mpesa', require('./routes/mpesa'));
app.use('/password', require('./routes/password'));

// Example route using asyncHandler directly in app.js
app.get('/', asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'API working successfully', data: null });
}));

// Global error handler
app.use((error, req, res, next) => {
    res.status(500).json({ success: false, message: error.message, data: null });
});

// Socket.io connection event
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`);
    });
});

// Start the server
server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

// Export io to use in other files (e.g., for emitting events in routes)
module.exports = { io };
