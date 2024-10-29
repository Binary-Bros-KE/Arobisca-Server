const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const K2 = require("k2-connect-node")({
    clientId: process.env.K2_CLIENT_ID,
    clientSecret: process.env.K2_CLIENT_SECRET,
    baseUrl: process.env.K2_TOKEN_BASE_URL,  // Use token URL here
    apiKey: process.env.K2_API_KEY
});

//TokenService and StkService 
const { TokenService, StkService } = K2;

// Middleware to generate the KopoKopo token
const generateKopoKopoToken = asyncHandler(async (req, res, next) => {
    try {
        const response = await TokenService.getToken();
        req.kopokopoToken = response.access_token; // Attach token to request
        next();
    } catch (error) {
        next(error); // Pass error to global error handler
    }
});

// Route for handling STK initialization
router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;

    // Defining STK options
    const stkOptions = {
        paymentChannel: "M-PESA STK Push",
        tillNumber: "8200506",            
        phoneNumber: phone,     
        currency: "KES",
        amount: {
            currency: "KES",
            value: amount                
        },
        _links: {
            callback_url: process.env.CALLBACK_URL
        }
    };

    // Initiate STK Push with direct URL if different from token base
    try {
        const response = await axios.post(
            process.env.K2_PAYMENT_BASE_URL,
            stkOptions,
            {
                headers: {
                    Authorization: `Bearer ${req.kopokopoToken}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }
            }
        );

        res.json({
            success: true,
            message: "STK Push Initialized",
            data: response.data
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
