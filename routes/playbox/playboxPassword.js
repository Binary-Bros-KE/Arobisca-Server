const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../../model/playbox/plaboxUserModel');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Request password reset
router.post('/requestPasswordReset', asyncHandler(async (req, res) => {
    console.log('ROUTE HIT');
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User does not exist in database' });
        }

        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Create email transporter service
        const transporter = nodemailer.createTransport({
            service: 'Zoho',
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: `${process.env.PLAYBOX_EMAIL}`,
                pass: `${process.env.PLAYBOX_EMAIL_PASSWORD}`
            },
        });

        const mailOptions = {
            from: '"Playbox" <info@playbox.co.ke>',
            to: `${user.email}`,
            subject: 'Password Reset Link',
            text: 'Bellow is your password Request link',
            html: `<p>Click <a href="https://playbox.co.ke/dashboard/reset-password?token=${resetToken}">here</a> to reset your password. This link will expire in 15 minutes.</p>`
            ,
        };

        transporter.sendMail(mailOptions, (err, response) => {
            if (err) {
              console.error('there was an error: ', err);
              res.status(401).json(err);
            } else {
              console.log('here is the res: ', response);
              res.status(200).json('recovery email sent');
            }
          });

        res.status(200).json({ message: 'Password reset code sent' });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Error requesting password reset', error: error.message });
    }
}));


// Reset password
router.post('/resetPassword', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Reset link expired. Please request a new one.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: 'Invalid reset link. Please request a new one.' });
        }

        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
}));


module.exports = router;
