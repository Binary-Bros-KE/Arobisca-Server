const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();
const K2 = require("k2-connect-node")({
    clientId: process.env.K2_CLIENT_ID,
    clientSecret: process.env.K2_CLIENT_SECRET,
    baseUrl: process.env.K2_BASE_URL,
    apiKey: process.env.K2_API_KEY
});

// Separate TokenService initialization for better readability
const { TokenService } = K2;

// Middleware to generate the KopoKopo token
const generateKopoKopoToken = asyncHandler(async (req, res, next) => {
    try {
        // Retrieve token from TokenService
        const response = await TokenService.getToken();
        req.kopokopoToken = response.access_token; // Attach token to request
        console.log("Access token retrieved successfully.");
        next(); // Proceed to the next middleware/handler
    } catch (error) {
        console.error("Error generating token:", error.message);
        next(error); // Pass error to global error handler
    }
});

// Route for handling STK initialization
router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        message: 'STK Route Initialized',
        accessToken: req.kopokopoToken
    });
}));

module.exports = router;
