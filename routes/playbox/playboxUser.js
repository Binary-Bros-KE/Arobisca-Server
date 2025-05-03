const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../../model/playbox/plaboxUserModel');
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
  const { email, password, rememberMe } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User does not exist in database. Please create an account to login.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'You entered the wrong password. Check password and try again.' });
    }

    // Set token expiry
    const expiresIn = rememberMe ? '7d' : '3d';
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phoneNumber,
        avatar: user.avatar,
        cart: user.cart,
        favorites: user.favorites,
        verified: user.verified,
        token,
        expiresIn,
      },
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get a user by Email
router.post('/user', asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ success: true, statusCode: 299, message: "User not found in Database." });
    }

    res.json({ success: true, statusCode: 200, message: "User retrieved successfully.", data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

//-------------- Register new user
router.post('/register', async (req, res) => {
  const { username, email, phone, password, avatar, cart, favorites } = req.body;

  // Validate input
  if (!username || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      phoneNumber: phone,
      password: hashedPassword,
      avatar: avatar || 'https://res.cloudinary.com/dnrlt7lhe/image/upload/v1745656618/playbox_ngofr5.png',
      cart: cart || [],
      favorites: favorites || [],
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '3d' }
    );

    // Send back user info and token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phoneNumber,
        avatar: newUser.avatar,
        cart: newUser.cart,
        favorites: newUser.favorites,
        verified: newUser.verified,
        token,
        expiresIn: "3d",
      },
    });
  } catch (error) {
    console.error('Error during registration:', error); // Detailed logging
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
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


//----------- Add a new address (shipping or billing)
router.post('/address', async (req, res) => {
  try {
    const { email, addressType, addressData } = req.body;

    if (!email || !addressType || !addressData) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields',
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid address type',
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Add the address to the appropriate array
    if (addressType === 'shipping') {
      user.shippingAddresses.push(addressData);
    } else {
      user.billingAddresses.push(addressData);
    }

    await user.save();

    return res.status(200).json({
      statusCode: 200,
      message: 'Address added successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Server error',
      error: error.message,
    });
  }
});



// Update an existing address
router.put('/address/:addressId', async (req, res) => {
  try {
    const { email, addressType, addressData } = req.body;
    const { addressId } = req.params;

    if (!email || !addressType || !addressData || !addressId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields',
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid address type',
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Find and update the address
    const addressArray = addressType === 'shipping' ? user.shippingAddresses : user.billingAddresses;
    const addressIndex = addressArray.findIndex(addr => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Address not found',
      });
    }

    // Update the address fields
    addressArray[addressIndex] = {
      ...addressArray[addressIndex].toObject(),
      ...addressData,
      _id: addressArray[addressIndex]._id, // Keep the original ID
    };

    await user.save();

    return res.status(200).json({
      statusCode: 200,
      message: 'Address updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Server error',
      error: error.message,
    });
  }
});


// Delete an address
router.delete('/address/:addressId', async (req, res) => {
  try {
    const { email, addressType } = req.body;
    const { addressId } = req.params;

    if (!email || !addressType || !addressId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields',
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid address type',
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Find and remove the address
    const addressArray = addressType === 'shipping' ? 'shippingAddresses' : 'billingAddresses';

    // Use MongoDB's $pull operator to remove the address by ID
    const result = await User.findByIdAndUpdate(
      user._id,
      { $pull: { [addressArray]: { _id: addressId } } },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Failed to delete address',
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Address deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
