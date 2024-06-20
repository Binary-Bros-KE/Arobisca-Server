const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../model/user');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Create email transporter service
const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    logger: true,
    debug: false,
    secureConnection: false,
    auth: {
        user: process.env.AROBISCA_EMAIL, // Use environment variables for sensitive info
        pass: process.env.AROBISCA_EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: true
    }
});

// Helper function to generate random code
const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit code
};

// Request password reset
router.post('/requestPasswordReset', asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User does not exist in database' });
        }

        console.log(user);

        const resetCode = generateRandomCode();
        const expirationTime = Date.now() + 3600000; // 1 hour from now

        // Save the reset code and expiration time to the user
        user.resetCode = resetCode;
        user.resetCodeExpiration = expirationTime;
        await user.save();

        // Send reset code via email
        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Code',
            html: `<p>Your password reset code is <strong>${resetCode}</strong>. It will expire in 1 hour.</p>`
        });

        res.status(200).json({ message: 'Password reset code sent' });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Error requesting password reset', error: error.message });
    }
}));

// Verify reset code
router.post('/verifyResetCode', asyncHandler(async (req, res) => {
    const { email, resetCode } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User does not exist in database' });
        }

        if (user.resetCode !== resetCode || Date.now() > user.resetCodeExpiration) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        res.status(200).json({ message: 'Reset code verified' });
    } catch (error) {
        console.error('Error verifying reset code:', error);
        res.status(500).json({ message: 'Error verifying reset code', error: error.message });
    }
}));

// Reset password
router.post('/resetPassword', asyncHandler(async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User does not exist in database' });
        }

        if (user.resetCode !== resetCode || Date.now() > user.resetCodeExpiration) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetCode = undefined;
        user.resetCodeExpiration = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
}));

module.exports = router;
