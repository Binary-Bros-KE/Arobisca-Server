const express = require('express');
const asyncHandler = require('express-async-handler');
const Transaction = require('../model/kopokopoModel');
const router = express.Router();
const K2 = require("k2-connect-node")({
    clientId: process.env.K2_CLIENT_ID,
    clientSecret: process.env.K2_CLIENT_SECRET,
    baseUrl: 'https://sandbox.kopokopo.com',
    apiKey: process.env.K2_API_KEY
});

//TokenService initialization
const { TokenService, StkService } = K2;

// WebSocket setup
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ noServer: true });

function setupWebSocket(server) {
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
}


// Middleware to generate the KopoKopo token
const generateKopoKopoToken = asyncHandler(async (req, res, next) => {
    try {
        const response = await TokenService.getToken();
        req.kopokopoToken = response.access_token;
        console.log("Access token retrieved successfully.");
        next();
    } catch (error) {
        console.error("Error generating token:", error.message);
        next(error);
    }
});

// Route for handling STK initialization
router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;
    const stkOptions = {
        paymentChannel: "M-PESA STK Push",
        tillNumber: '8200506',
        phoneNumber: phone,
        currency: "KES",
        amount: amount,
        callbackUrl: process.env.CALLBACK_URL,
        accessToken: req.kopokopoToken,
    };
    try {
        const response = await StkService.initiateIncomingPayment(stkOptions);
        res.json({
            success: true,
            message: "STK Push Initialized",
            data: response
        });
    } catch (error) {
        console.error("Error initiating STK push:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to initiate STK Push",
            error: error.message
        });
    }
}));

// Handle KopoKopo callback result
router.post('/result', asyncHandler(async (req, res) => {
    try {        
        const callbackData = req.body.data;

        console.log("Received callback data:", JSON.stringify(callbackData, null, 2));

        const transactionId = callbackData.id;
        const status = callbackData.attributes.status;
        const event = callbackData.attributes.event;
        const resource = event.resource;

        // Prepare transaction data
        const transactionData = {
            transactionId,
            status,
            reference: resource ? resource.reference : null,
            phoneNumber: resource ? resource.sender_phone_number : null,
            amount: resource ? resource.amount : null,
            currency: resource ? resource.currency : null,
            tillNumber: resource ? resource.till_number : null,
            system: resource ? resource.system : null,
            problems: event.errors || null,
            initiationTime: callbackData.attributes.initiation_time,
        };

        // Save transaction to the database
        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Emit real-time status update to WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                    transactionId,
                    status,
                    message: status === "Success" ? "Payment successful" : "Payment failed",
                    details: transactionData
                }));
            }
        });

        console.log("Processed callback and updated WebSocket clients:", transactionData);
        res.status(200).json({ success: true, message: "Callback processed successfully" });

    } catch (error) {
        console.error("Error processing callback:", error.message);
        res.status(500).json({ success: false, message: "Error processing callback", error: error.message });
    }
}));

module.exports = { router, setupWebSocket };

