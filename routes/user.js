const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, message: "Users retrieved successfully.", data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
  
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'User Does not exist in database. Please Create an Acoount to Login' });
      }
  
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'You entered the wrong password. Check Password and try again.' });
      }
  
      // Generate JWT
      const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });
  
    res.status(200).json({ success: true, message: "Login successful.", data: user, token});
    } catch (error) {
      console.error('Error during login:', error); // Detailed logging
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
  });


// Get a user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User retrieved successfully.", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

//-------------- Register new user
router.post('/register', async (req, res) => {
    const { username, email, phoneNumber, password } = req.body;
  
    // Validate input
    if (!username || !email || !phoneNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already in use' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new user
      const newUser = new User({ username, email, phoneNumber, password: hashedPassword });
      await newUser.save();
      
    //   res.status(201).json({ message: 'User registered successfully' });
      res.json({ success: true, message: "User created successfully.", data: null });
    } catch (error) {
      console.error('Error during registration:', error); // Detailed logging
      res.status(500).json({ message: 'Error registering user', error: error.message });
    }
  });

// Update a user
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const { name, password } = req.body;
        if (!name || !password) {
            return res.status(400).json({ success: false, message: "Name,  and password are required." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            { name, password },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "User updated successfully.", data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a user
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userID);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;
