const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Get current user profile (protected)
router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;