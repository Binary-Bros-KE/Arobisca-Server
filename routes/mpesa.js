const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();

// Middleware to generate token
const generateToken = async (req, res, next) => {
    const secretKey = process.env.MPESA_CONSUMER_SECRET;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const auth = Buffer.from(`${consumerKey}:${secretKey}`).toString("base64");
    const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    try {
        const response = await axios.get(authUrl, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        req.token = response.data.access_token;
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
    // const date = new Date();
    // const timestamp = date.getFullYear() +
    //     ("0" + (date.getMonth() + 1)).slice(-2) +
    //     ("0" + date.getDate()).slice(-2) +
    //     ("0" + date.getHours()).slice(-2) +
    //     ("0" + date.getMinutes()).slice(-2) +
    //     ("0" + date.getSeconds()).slice(-2);
    const shortcode = process.env.MPESA_PAYBILL;
    // const passkey = process.env.SECURITY_CREDENTIAL;
    // const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");
    const reqUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

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
            "CallBackURL": "https://d6fa-2c0f-fe38-2248-a60b-f8e3-fec3-7dfd-d700.ngrok-free.app/mpesa/callback",
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
