const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");

// All routes here are protected
router.use(authenticate);

// GET /api/user/profile
router.get("/profile", (req, res) => {
  // req.user is populated by authenticate middleware
  res.json({
    message: "Profile fetched successfully",
    user: req.user,
  });
});

module.exports = router;
