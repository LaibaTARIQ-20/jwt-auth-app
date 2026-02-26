const { verifyAccessToken } = require('./tokenUtils');

const protect = (req, res, next) => {
  try {
    // Read from cookie first, then Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized request' });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

module.exports = { protect };