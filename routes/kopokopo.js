const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();

// Middleware to generate token for KopoKopo
const generateKopoKopoToken = async (req, res, next) => {
    const clientId = process.env.KOPOKOPO_CONSUMER_KEY;
    const clientSecret = process.env.KOPOKOPO_CONSUMER_SECRET;
    
    const authUrl = `${process.env.KOPOKOPO_BASE_URL}oauth/token/`;
    try {
        const response = await axios.post(authUrl, {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret
        });
        
        req.token = response.data.access_token;
        next();
    } catch (err) {
        console.error('Error generating token:', err.message);
        res.status(400).json({ error: 'Failed to generate token', details: err.message });
    }
};

router.get((req, res) => {
    res.json({ success: true, message: 'Kopo Kopo route working Succesfully', data: null });
});

// Initiate STK Push
router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    const { phone, amount, callbackUrl } = req.body;
    const stkPushUrl = `${process.env.KOPOKOPO_BASE_URL}incoming_payments/`;

    const body = {
        amount: amount,
        currency: 'KES',
        metadata: {
            customer_phone: phone,
            callback_url: callbackUrl || process.env.CALLBACK_URL,
        },
        access_token: req.token
    };

    try {
        const response = await axios.post(stkPushUrl, body, {
            headers: {
                Authorization: `Bearer ${req.token}`,
                'Content-Type': 'application/json'
            }
        });
        res.status(200).json(response.data);
    } catch (err) {
        console.error('STK push error:', err.message);
        res.status(400).json({ error: 'Failed to initiate STK push', details: err.message });
    }
}));

// Handle Webhook Callback
router.post('/callback', (req, res) => {
    const callbackData = req.body;
    console.log('KopoKopo Callback Data:', callbackData);
    // Here, verify the webhook secret and handle the callback data as needed
    res.status(200).json({ message: 'Callback received' });
});

// Check Payment Status
router.get('/status/:paymentId', generateKopoKopoToken, asyncHandler(async (req, res) => {
    const paymentId = req.params.paymentId;
    const statusUrl = `${process.env.KOPOKOPO_BASE_URL}incoming_payments/${paymentId}`;

    try {
        const response = await axios.get(statusUrl, {
            headers: {
                Authorization: `Bearer ${req.token}`
            }
        });
        res.status(200).json(response.data);
    } catch (err) {
        console.error('Error checking payment status:', err.message);
        res.status(400).json({ error: 'Failed to check payment status', details: err.message });
    }
}));

module.exports = router;
