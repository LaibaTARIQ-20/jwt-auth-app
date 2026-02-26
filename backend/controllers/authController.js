const bcrypt = require('bcryptjs');
const { users, refreshTokens } = require('./store');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} = require('../middleware/tokenUtils');

// ── REGISTER ──────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (users.has(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const id = Date.now().toString();
  const user = { id, name, email, hashedPassword };
  users.set(email, user);

  const payload = { id, name, email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  refreshTokens.add(refreshToken);

  // Store BOTH tokens in cookies — no need to return accessToken in body
  res
    .status(201)
    .cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    .json({
      message: 'Account created successfully',
      user: { id, name, email },
    });
};

// ── LOGIN ──────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = users.get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.hashedPassword);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const payload = { id: user.id, name: user.name, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  refreshTokens.add(refreshToken);

  // Store BOTH tokens in cookies
  res
    .status(200)
    .cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    .json({
      message: 'Logged in successfully',
      user: { id: user.id, name: user.name, email: user.email },
    });
};

// ── REFRESH ────────────────────────────────────────────
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized request' });
  }

  if (!refreshTokens.has(token)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  try {
    const decoded = verifyRefreshToken(token);

    // Rotate refresh token
    refreshTokens.delete(token);
    const newRefreshToken = generateRefreshToken({
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
    });
    refreshTokens.add(newRefreshToken);

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
    });

    // Set BOTH new tokens in cookies
    res
      .status(200)
      .cookie('accessToken', newAccessToken, ACCESS_COOKIE_OPTIONS)
      .cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS)
      .json({
        message: 'Access token refreshed',
        user: { id: decoded.id, name: decoded.name, email: decoded.email },
      });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// ── LOGOUT ─────────────────────────────────────────────
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) refreshTokens.delete(token);

  const clearOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };

  res
    .status(200)
    .clearCookie('accessToken', clearOptions)
    .clearCookie('refreshToken', clearOptions)
    .json({ message: 'Logged out successfully' });
};

// ── ME (protected route) ───────────────────────────────
const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, refresh, logout, me };