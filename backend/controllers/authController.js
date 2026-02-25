const bcrypt = require("bcryptjs");
const { users, refreshTokens } = require("./store");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
} = require("../middleware/tokenUtils");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }
    if (users.has(email)) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password and save user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    };
    users.set(email, user);

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    refreshTokens.add(refreshToken);
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      message: "Account created successfully",
      accessToken,
      user: tokenPayload,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = users.get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    refreshTokens.add(refreshToken);
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      message: "Login successful",
      accessToken,
      user: tokenPayload,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Called automatically by the frontend when access token expires
// ─────────────────────────────────────────────────────────────────────────────
const refresh = (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    if (!refreshTokens.has(token)) {
      return res
        .status(403)
        .json({ error: "Refresh token is invalid or revoked" });
    }

    const decoded = verifyRefreshToken(token);
    const user = [...users.values()].find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }

    const tokenPayload = { id: user.id, email: user.email, name: user.name };
    const newAccessToken = generateAccessToken(tokenPayload);

    // Rotate refresh token (invalidate old, issue new)
    refreshTokens.delete(token);
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });
    refreshTokens.add(newRefreshToken);
    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      accessToken: newAccessToken,
      user: tokenPayload,
    });
  } catch (err) {
    // Expired or tampered refresh token — force re-login
    const token = req.cookies.refreshToken;
    if (token) refreshTokens.delete(token);
    res.clearCookie("refreshToken");
    return res
      .status(403)
      .json({ error: "Session expired, please login again" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    refreshTokens.delete(token); // revoke the token
  }
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected route)
// ─────────────────────────────────────────────────────────────────────────────
const me = (req, res) => {
  // req.user is set by the authenticate middleware
  res.json({ user: req.user });
};

module.exports = { register, login, refresh, logout, me };
