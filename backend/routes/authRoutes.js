const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  me,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh); // uses httpOnly cookie
router.post("/logout", logout);

// Protected route — requires valid access token in Authorization header
router.get("/me", authenticate, me);

module.exports = router;
