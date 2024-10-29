const express = require('express');
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const router = express.Router();

const generateKopoKopoToken = async (req, res, next) => {

//Having stored your credentials as environment variables
const options = {
    clientId: process.env.K2_CLIENT_ID,
    clientSecret: process.env.K2_CLIENT_SECRET,
    baseUrl: process.env.K2_BASE_URL,
    apiKey: process.env.K2_API_KEY
}

//Including the kopokopo module
var K2 = require("k2-connect-node")(options)


// TOKEN
const TokenService = K2.TokenService

TokenService
    .getToken()
    .then(response => {
        //Developer can decide to store the token_details and track expiry
        console.log("Access token is: " + response.access_token)
    })
    .catch(error => {
        console.log(error)
    })


};


router.post('/stk', generateKopoKopoToken, asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Stk Route Initialised', data: null });
}));