const express = require("express");
const asyncHandler = require("express-async-handler");
const Payment = require("../model/mpesaModel");
const axios = require("axios");
const router = express.Router();
const { clients } = require('../sockets/websocketState');

// Middleware to generate token
const generateToken = async (req, res, next) => {
  const secretKey = process.env.MPESA_CONSUMER_SECRET;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const auth = Buffer.from(`${consumerKey}:${secretKey}`).toString("base64");

  const environmentAuthUrl = process.env.MPESA_AUTH_URL;
  const authUrl = `${environmentAuthUrl}?grant_type=client_credentials`;

  try {
    const response = await axios.get(authUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    req.token = response.data.access_token;
    next();
  } catch (err) {
    console.error("Error generating token:", err.message);
    res
      .status(400)
      .json({ error: "Failed to generate token", details: err.message });
  }
};

// Send STK Push Request
router.post("/stk", generateToken, asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;
    const formattedPhone = phone.substring(1);

    const passkey = process.env.MPESA_PASSKEY;
    const shortcode = process.env.MPESA_SHORTCODE;
    const reqUrl = process.env.MPESA_STK_PUSH_URL;
    const callbackURL = process.env.MPESA_CALLBACK_URL;

    const date = new Date();
    const timestamp =
      date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const password = new Buffer.from(shortcode + passkey + timestamp).toString(
      "base64"
    );

    const reqBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: `254${formattedPhone}`,
      PartyB: process.env.AROBISCA_MPESA_TILLNUMBER,
      PhoneNumber: `254${formattedPhone}`,
      CallBackURL: callbackURL,
      AccountReference: "AROBISCA GROUP LIMITED",
      TransactionDesc: "Test",
    }

    try {
      const response = await axios.post( reqUrl,reqBody,
        {
          headers: {
            Authorization: `Bearer ${req.token}`,
          },
        },
      );

      // Return the unique identifiers with the response
      res.status(200).json(response.data);
    } catch (err) {
      console.error("STK push error:", err.message);
      res
        .status(400)
        .json({ error: "Failed to initiate STK push", details: err.message });
    }
  })
);


//---------------- Result routes
// Results posted on callback
router.post("/resultcghbnsjsxhHJSM", (req, res) => {
  const callbackData = req.body;
  const stkCallback = callbackData.Body.stkCallback;
  const resultCode = stkCallback.ResultCode;

  const checkoutRequestId = stkCallback.CheckoutRequestID; 

  console.log("M-PESA Callback Received", stkCallback);
  console.log("Result Code:", resultCode);

  let message = { status: "unknown" };

  if (resultCode === 0) {
    console.log("Payment successful - preparing to broadcast");

    const metadata = stkCallback.CallbackMetadata.Item;
    const transactionData = {
      phone: metadata.find((item) => item.Name === "PhoneNumber")?.Value,
      amount: metadata.find((item) => item.Name === "Amount")?.Value,
      transactionId: metadata.find((item) => item.Name === "MpesaReceiptNumber")?.Value,
    };

    message = {
      status: "success",
      data: transactionData,
    };

    // Save payment to the database
    const payment = new Payment(transactionData);
    payment
      .save()
      .then(() => console.log("Payment saved successfully"))
      .catch((err) => console.error("Error saving payment:", err.message));

  } else if (resultCode === 1) {
    console.log("Balance is insufficient for the transaction. Please top up and try again.", stkCallback);
    message = { status: "insufficient", message: "Balance is insufficient for the transaction. Please top up and try again." };
  } else if (resultCode === 1032) {
    console.log("Request cancelled by user", stkCallback);
    message = { status: "cancelled", message: "Request cancelled by user" };
  } else if (resultCode === 2001) {
    console.log("The initiator information is invalid", stkCallback);
    message = { status: "failed", message: "The initiator information is invalid" };
  }else if (resultCode === 1037) {
    console.log("DS timeout user cannot be reached", stkCallback);
    message = { status: "timedout", message: "DS timeout user cannot be reached" };
  }

  console.log("Broadcasting message:", { checkoutRequestId, ...message });

  // Broadcast the result to the specific client using the CheckoutRequestID
  const client = clients.get(checkoutRequestId); // Get the WebSocket client by CheckoutRequestID
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify({ ...message }));
    console.log(`Message sent to client with CheckoutRequestID: ${checkoutRequestId}`);
  }

  res.json("ok");
});


router.post("/paymentStatus", generateToken, asyncHandler(async (req, res) => {
  const { CheckoutRequestId } = req.body;

  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

    
    const password = new Buffer.from(shortcode + passkey + timestamp).toString(
      "base64"
    );

    const requestBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: CheckoutRequestId,
    };

    const statusCheckURL = process.env.MPESA_STATUS_CHECK_URL;


    try {
      const response = await axios.post(statusCheckURL, requestBody,
        {
          headers: {
            Authorization: `Bearer ${req.token}`,
            "Content-Type" : "application/json",
          },
        }
      )

    const resultCode = parseInt(response.data.ResultCode, 10);
    console.log(resultCode);

    let message = { status: "unknown" };

    if (resultCode === 0) {
      console.log("Payment was successful - preparing to broadcast");
      message = { status: "success", message: "Payment was successful",};
    }else if (resultCode === 1) {
      console.log("Balance is insufficient for the transaction. Please top up and try again.", stkCallback);
      message = { status: "insufficient", message: "Balance is insufficient for the transaction. Please top up and try again." };
     } else if (resultCode === 1032) {
      console.log("Request was cancelled by user");
      message = { status: "cancelled", message: "Request cancelled by user" };
    } else if (resultCode === 2001) {
      console.log("The initiator information was invalid");
      message = { status: "failed", message: "The initiator information is invalid" };
    }else if (resultCode === 1037) {
      console.log("DS timeout user was not reached");
      message = { status: "timedout", message: "DS timeout user cannot be reached" };
    }
  
    console.log("Broadcasting message:", { CheckoutRequestId, ...message });
  
    const client = clients.get(CheckoutRequestId);

    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify({ ...message }));
      console.log(`Message sent to client with CheckoutRequestID: ${CheckoutRequestId}`);
    }
  
    res.status(200).json(response.data);
    }catch (err) {
      console.error("Status check error:", err.message);
      res.status(400).json({ error: "Failed to check Payment status", details: err.message });
    }

}))





module.exports = router;
