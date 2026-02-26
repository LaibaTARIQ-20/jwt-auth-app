const jwt = require("jsonwebtoken");

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // required for sameSite none
  sameSite: "none", // required for cross-domain
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
};
