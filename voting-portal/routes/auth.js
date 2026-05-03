const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Election = require('../models/Election');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Only allow admin role if a secret key is provided
    const userRole = (req.body.adminKey === 'ADMIN2024') ? 'admin' : 'voter';

    const user = new User({ name, email, password, role: userRole });
    await user.save();

    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.name = user.name;

    res.json({ success: true, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.name = user.name;

    res.json({ success: true, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Session check
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  try {
    const user = await User.findById(req.session.userId).populate('votedFor', 'name party');
    if (!user) return res.json({ loggedIn: false });
    res.json({
      loggedIn: true,
      role: user.role,
      name: user.name,
      hasVoted: user.hasVoted,
      votedFor: user.votedFor
    });
  } catch {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
