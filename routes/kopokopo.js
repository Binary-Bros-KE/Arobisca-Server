const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();
const K2 = require("k2-connect-node")({
    clientId: process.env.K2_CLIENT_ID,
    clientSecret: process.env.K2_CLIENT_SECRET,
    baseUrl: 'https://sandbox.kopokopo.com',
    apiKey: process.env.K2_API_KEY
});

//TokenService initialization
const { TokenService, StkService, Webhooks } = K2;

// Middleware to generate the KopoKopo token
const generateKopoKopoToken = asyncHandler(async (req, res, next) => {
    try {
        const response = await TokenService.getToken();
        req.kopokopoToken = response.access_token; // Attach token to request
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
        // Capture the callback data
        const callbackData = req.body;

        console.log("Received callback data:", JSON.stringify(callbackData, null, 2));

        // Perform actions based on the callback data, such as logging, updating DB, etc.
        // Here we can check the status of the payment
        if (callbackData.event_type === 'payment_received') {
            const paymentStatus = callbackData.resource.status;
            const transactionId = callbackData.resource.resourceId;
            const paymentAmount = callbackData.resource.amount;
            const phoneNumber = callbackData.resource.senderPhoneNumber;

            // Log or store the information as needed
            console.log(`Payment received from ${phoneNumber}:`);
            console.log(`Status: ${paymentStatus}, Amount: ${paymentAmount}, Transaction ID: ${transactionId}`);

            // Send response back to KopoKopo
            res.json({ success: true, message: "Callback received successfully" });
        } else {
            // Handle other types of callbacks if necessary
            console.log("Unhandled event type:", callbackData.event_type);
            res.status(400).json({ success: false, message: "Unhandled event type" });
        }
    } catch (error) {
        console.error("Error processing callback:", error.message);
        res.status(500).json({ success: false, message: "Error processing callback", error: error.message });
    }
}));

module.exports = router;
