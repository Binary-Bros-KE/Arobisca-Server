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

// Separate TokenService initialization for better readability
const { TokenService, StkService } = K2;

// Middleware to generate the KopoKopo token
const generateKopoKopoToken = asyncHandler(async (req, res, next) => {
    try {
        // Retrieve token from TokenService
        const response = await TokenService.getToken();
        req.kopokopoToken = response.access_token; // Attach token to request
        console.log("Access token retrieved successfully.");
        next();
    } catch (error) {
        console.error("Error generating token:", error.message);
        next(error); // Pass error to global error handler
    }
});

// Route for handling STK initialization
router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;
    const stkPushUrl = `${process.env.KOPOKOPO_BASE_URL}/incoming_payments/`;
    //  Defining STK options
    const stkOptions = {
        paymentChannel: "M-PESA STK Push",
        tillNumber: '8200506',
        phoneNumber: phone,
        currency: "KES",
        amount: amount,
        callbackUrl: process.env.CALLBACK_URL,
        accessToken: req.kopokopoToken,
    };

    console.log(req.kopokopoToken);

    // Initiate STK Push
    try {
        const response = await StkService.initiateIncomingPayment(stkOptions);
        res.json({
            success: true,
            message: `STK Push Initialized`,
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

module.exports = router;

