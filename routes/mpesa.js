const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();

// Middleware to generate token
const generateToken = async (req, res, next) => {
    const secretKey = process.env.MPESA_CONSUMER_SECRET;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const auth = Buffer.from(`${consumerKey}:${secretKey}`).toString("base64");
    const authUrl = process.env.MPESA_AUTH_URL;

    try {
        const response = await axios.get(authUrl, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        req.token = response.data.access_token;
        console.log(token);
        next();
    } catch (err) {
        console.error('Error generating token:', err.message);
        res.status(400).json({ error: 'Failed to generate token', details: err.message });
    }
};

// Test route to get token
router.get('/token', generateToken, asyncHandler(async (req, res) => {
    res.json({ token: req.token });
}));

// Send STK Push Request
router.post('/stk', generateToken, asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;
    const formattedPhone = phone.substring(1);
    const shortcode = process.env.MPESA_SHORTCODE;
    const reqUrl = process.env.MPESA_STK_PUSH_URL;

    try {
        const response = await axios.post(reqUrl, {    
            "BusinessShortCode": shortcode,    
            "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMTYwMjE2MTY1NjI3",    
            "Timestamp":"20160216165627",    
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,    
            "PartyA":`254${formattedPhone}`,    
            "PartyB": shortcode,    
            "PhoneNumber":`254${formattedPhone}`,    
            "CallBackURL": process.env.MPESA_CALLBACK_URL,
            "AccountReference":"AROBISCA GROUP",    
            "TransactionDesc":"Test"
         },
        {
            headers: {
                Authorization: `Bearer ${req.token}`
            }
        });
        res.status(200).json(response.data);
    } catch (err) {
        console.error('STK push error:', err.message);
        res.status(400).json({ error: 'Failed to initiate STK push', details: err });
    }
}));

router.post("/callback", (req, res)=>{
    const callbackData = req.body;
    console.log(callbackData);
})

module.exports = router;
