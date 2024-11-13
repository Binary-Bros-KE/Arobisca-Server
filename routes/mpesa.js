const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();

// Middleware to generate token
const generateToken = async (req, res, next) => {
    const secretKey = process.env.MPESA_CONSUMER_SECRET;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const auth = Buffer.from(`${consumerKey}:${secretKey}`).toString("base64");

    const environmentAuthUrl = process.env.MPESA_AUTH_URL
    const authUrl = `${environmentAuthUrl}?grant_type=client_credentials`;

    try {
        const response = await axios.get(authUrl, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        req.token = response.data.access_token;
        const token = response.data.access_token;
        console.log(`Token retrived Successfully: ${token}`);
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

    const passkey = process.env.MPESA_PASSKEY;
    const shortcode = process.env.MPESA_SHORTCODE;
    const reqUrl = process.env.MPESA_STK_PUSH_URL;

    const date = new Date();
    const timestamp = date.getFullYear() + 
    ("0" + (date.getMonth() + 1)).slice(-2) + 
    ("0" + date.getDate()).slice(-2) + 
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2)

    const password = new Buffer.from(shortcode + passkey + timestamp).toString("base64")

    console.log(reqUrl);


    try {
        const response = await axios.post(reqUrl, {    
            "BusinessShortCode": shortcode,    
            "Password": password,    
            "Timestamp": timestamp,    
            "TransactionType": "CustomerBuyGoodsOnline",
            "Amount": amount,    
            "PartyA":`254${formattedPhone}`,    
            "PartyB": shortcode,    
            "PhoneNumber":`254${formattedPhone}`,    
            "CallBackURL": process.env.MPESA_CALLBACK_URL,
            "AccountReference":"AROBISCA GROUP LIMITED",    
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

router.post("/result", (req, res)=>{
    const callbackData = req.body;
    console.log(`Call back Data ${callbackData}`);

    if(!callbackData.body.CallbackMetadata){
        console.log(callbackData.body);
        return res.json("ok");
    }

    console.log(callbackData.body.CallbackMetadata);
})

module.exports = router;
