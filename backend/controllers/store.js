/**
 * In-memory data store.
 * ⚠️  Replace with MongoDB / PostgreSQL / etc. in production.
 * Data is lost on server restart.
 *
 * users Map:  email -> { id, name, email, password (hashed) }
 * refreshTokens Set: valid refresh token strings
 */
const users = new Map();
const refreshTokens = new Set();

module.exports = { users, refreshTokens };
