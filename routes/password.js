const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../model/user');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

//------ create email transporter service
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
        rejectUnAuthorized: true
    }
  });

  // Create a new variant type
router.post('/', asyncHandler(async (req, res) => {
    res.status(200).json({ message: 'PASSWORD ROUTE WORKS NICEE' });
}));

// Request password reset
router.post('/requestPasswordReset', asyncHandler(async (req, res) => {
    const { email } = req.body;
    console.log(email)

    try {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: 'User does not exist in database' });
        }
    
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
        const url = `${process.env.FRONTEND_URL}/password/resetPassword/${token}`;
    
        await transporter.sendMail({
          to: user.email,
          subject: 'We have received a Password Reset Request',
          html: `<p>Please click <a href="${url}">here</a> to reset your password. This link will expire in 1 hour.</p>`
        });
    
        res.status(200).json({ message: 'Password reset email sent' });
      } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Error requesting password reset', error: error.message });
      }
}));

// Get a variant type by ID
router.post('/resetPassword/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User does not exist in database' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
}));



// Update a variant type
router.put('/updatePassword ', asyncHandler(async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User does not exist in database' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
}));



module.exports = router;
