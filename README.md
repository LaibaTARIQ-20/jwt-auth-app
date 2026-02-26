# JWT Authentication System

> Full-stack authentication with automatic token refresh — Node.js + Express backend, Next.js 14 frontend.

![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Core Concepts](#3-core-concepts)
4. [Authentication Flows](#4-authentication-flows)
5. [API Reference](#5-api-reference)
6. [Security](#6-security)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Setup & Running](#8-setup--running)
9. [Upgrading to a Database](#9-upgrading-to-a-database)

---

## 1. Project Overview

This project implements a complete, production-ready JWT authentication system. It covers the full auth lifecycle: registration, login, protected routes, automatic silent token refresh, and secure logout.

### What it does

- **Registers users** — hashes passwords with bcrypt, stores user data, issues tokens
- **Logs users in** — validates credentials, returns a short-lived access token + sets a long-lived httpOnly refresh token cookie
- **Protects routes** — middleware validates the Bearer access token on every protected API call
- **Auto-refreshes tokens** — frontend silently gets a new access token when the old one expires, with zero user disruption
- **Securely logs out** — revokes the refresh token server-side and clears the cookie

### Tech Stack

| Layer | Technology |
|---|---|
| Backend Runtime | Node.js (CommonJS) |
| Backend Framework | Express.js v5 |
| Authentication | jsonwebtoken (JWT) |
| Password Hashing | bcryptjs (cost factor 12) |
| Frontend Framework | Next.js 14 (App Router) |
| Frontend Language | TypeScript |
| Styling | Tailwind CSS |
| HTTP Client | Axios with interceptors |
| Security | helmet, cors, express-rate-limit |
| Cookie Handling | cookie-parser |

---

## 2. Project Structure

### Backend

```
backend/
  server.js                   Main Express app entry point
  .env                        Environment variables (secrets)
  controllers/
    authController.js         register, login, refresh, logout, me
    store.js                  In-memory users Map + refreshTokens Set
  middleware/
    authMiddleware.js          Protect routes — verifies Bearer token
    tokenUtils.js             generate/verify access & refresh tokens
  routes/
    authRoutes.js             POST /register /login /refresh /logout, GET /me
    userRoutes.js             GET /profile (protected example route)
```

### Frontend

```
frontend/src/
  middleware.ts               Next.js route guard (runs on Edge runtime)
  app/
    layout.tsx                Root layout — wraps all pages with AuthProvider
    page.tsx                  Root redirect to /dashboard
    globals.css               Tailwind base styles
    login/page.tsx            Login form page
    register/page.tsx         Registration form page
    dashboard/page.tsx        Protected dashboard page
  components/
    AuthShell.tsx             Reusable card wrapper for auth pages
    Input.tsx                 Reusable input with label + error state
  context/
    AuthContext.tsx           Global auth state (user, loading, login, logout)
  lib/
    apiClient.ts              Axios instance with auto-refresh interceptor
    auth.ts                   Auth helper functions (loginUser, registerUser...)
```

---

## 3. Core Concepts

### 3.1 JSON Web Tokens (JWT)

A JWT is a compact, self-contained token that encodes claims as a JSON object. It has three dot-separated parts:

```
header.payload.signature
```

Example decoded payload:

```json
{
  "id": "1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1700000000,
  "exp": 1700000900
}
```

The server signs the token with a secret key. On each request, the server re-verifies the signature — if it matches, the token is trusted without any database lookup.

---

### 3.2 Two-Token Strategy

This project uses two tokens with very different lifetimes and storage locations:

| | Access Token | Refresh Token |
|---|---|---|
| **Lifetime** | 15 minutes | 7 days |
| **Storage** | JavaScript memory | httpOnly cookie |
| **Sent via** | `Authorization: Bearer` header | Cookie header (automatic) |
| **Purpose** | Authenticate API requests | Get new access tokens |
| **XSS risk** | Low (memory only) | None (JS cannot read it) |
| **CSRF risk** | None (not a cookie) | Low (sameSite: strict) |

> **Why two tokens?** Short-lived access tokens limit damage if stolen. Long-lived refresh tokens are stored in httpOnly cookies that JavaScript cannot read, protecting them from XSS attacks.

---

### 3.3 httpOnly Cookies

The refresh token is stored as an `httpOnly`, `secure`, `sameSite=strict` cookie:

- **`httpOnly`** — JavaScript cannot access it at all (`document.cookie` will not show it)
- **`secure`** — only sent over HTTPS in production
- **`sameSite: strict`** — only sent when the request originates from the same site, blocking CSRF
- **`path: /`** — sent with all requests to the domain

```js
// tokenUtils.js
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
```

---

### 3.4 Refresh Token Rotation

Every time a refresh token is used, the old one is immediately invalidated and a new one is issued:

- A stolen refresh token can only be used **once** before it becomes invalid
- The server keeps all valid refresh tokens in a `Set` and checks before use
- On each successful refresh: `delete old token → generate new token → store new token`

---

## 4. Authentication Flows

### 4.1 Registration

```
User submits form  →  POST /api/auth/register  { name, email, password }

Backend:
  1. Validate input (required fields, password min length)
  2. Check email is not already registered
  3. Hash password:  bcrypt.hash(password, 12)
  4. Save user:      users.set(email, { id, name, email, hashedPassword })
  5. Generate accessToken  (15m)  signed with ACCESS_TOKEN_SECRET
  6. Generate refreshToken (7d)   signed with REFRESH_TOKEN_SECRET
  7. Store refreshToken in refreshTokens Set
  8. Set refreshToken as httpOnly cookie
  9. Return { accessToken, user: { id, name, email } }

Frontend:
  1. Receives accessToken  →  stores in memory (_accessToken variable)
  2. Receives user         →  stores in AuthContext state
  3. router.push('/dashboard')
```

---

### 4.2 Login

```
User submits form  →  POST /api/auth/login  { email, password }

Backend:
  1. Validate input
  2. Look up user by email
  3. bcrypt.compare(password, user.hashedPassword)
  4. If match:    generate both tokens (same as registration steps 5–9)
  5. If no match: return 401 "Invalid email or password"

Frontend: same as registration steps 1–3
```

---

### 4.3 Authenticated Request

```
Frontend calls any protected endpoint (e.g. GET /api/auth/me)

apiClient.ts request interceptor:
  →  reads _accessToken from memory
  →  adds header: Authorization: Bearer <accessToken>

Backend authMiddleware.js:
  →  reads Authorization header
  →  jwt.verify(token, ACCESS_TOKEN_SECRET)
  →  valid:   sets req.user = decoded payload, calls next()
  →  expired: returns 401 { error: "Token expired" }
  →  invalid: returns 401 { error: "Invalid token" }
```

---

### 4.4 Auto Token Refresh ⚡

This happens completely automatically — the user sees nothing.

```
1.  Frontend calls GET /api/auth/me
    → access token has expired
    → backend returns 401

2.  apiClient.ts response interceptor catches the 401:
    → checks original._retry flag (prevents infinite loop)
    → sets isRefreshing = true
    → queues any other concurrent requests that also fail

3.  Interceptor calls POST /api/auth/refresh
    → browser automatically sends httpOnly refreshToken cookie

4.  Backend refresh endpoint:
    → reads refreshToken from cookie
    → checks it exists in refreshTokens Set
    → jwt.verify(token, REFRESH_TOKEN_SECRET)
    → generates new accessToken
    → ROTATES refreshToken:
        refreshTokens.delete(oldToken)
        refreshTokens.add(newToken)
        res.cookie('refreshToken', newToken, ...)
    → returns { accessToken, user }

5.  Interceptor receives new accessToken:
    → setAccessToken(newToken)  — updates memory
    → processQueue(null, newToken)  — retries all queued requests
    → retries original request with new Authorization header

6.  Original request succeeds ✓
```

> **Queue mechanism:** If 5 requests fail simultaneously with 401, only ONE refresh call is made. The other 4 are queued and retried together once the new token arrives.

---

### 4.5 Session Restore on Page Refresh

```
User refreshes the browser tab

1.  AuthContext mounts  →  loading = true
2.  Calls refreshSession()  →  POST /api/auth/refresh
    → httpOnly cookie sent automatically by browser
3.  Cookie valid:   setUser(data.user), loading = false  ✓
4.  No cookie/expired:  user = null,  loading = false

5.  Dashboard useEffect watches [user, loading]:
    → loading true:              shows spinner (waits)
    → loading false + user:      renders dashboard ✓
    → loading false + no user:   router.push('/login')
```

---

### 4.6 Logout

```
User clicks Logout  →  POST /api/auth/logout

Backend:
  1. Read refreshToken from cookie
  2. refreshTokens.delete(token)   ← revokes it server-side
  3. res.clearCookie('refreshToken')
  4. Return { message: "Logged out successfully" }

Frontend:
  1. clearAccessToken()  →  _accessToken = null
  2. setUser(null)       →  clears AuthContext state
  3. router.push('/login')

Result: both tokens are now invalid. Even if the access token
was stolen, it expires within 15 minutes maximum.
```

---

## 5. API Reference

### Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Create new user account |
| `POST` | `/api/auth/login` | None | Login with email + password |
| `POST` | `/api/auth/refresh` | Cookie | Get new access token |
| `POST` | `/api/auth/logout` | Cookie | Revoke session |
| `GET` | `/api/auth/me` | Bearer Token | Get current user |
| `GET` | `/api/user/profile` | Bearer Token | Get user profile |
| `GET` | `/api/health` | None | Server health check |

---

### Request / Response Examples

**POST `/api/auth/register`**

```json
// Request body
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "mypassword"
}

// Response 201
{
  "message": "Account created successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1700000000000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
// + Set-Cookie: refreshToken=eyJ...; HttpOnly; Path=/; SameSite=Strict
```

**POST `/api/auth/refresh`**

```json
// Request: no body needed — cookie is sent automatically

// Response 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1700000000000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
// + Rotated Set-Cookie: refreshToken=eyJ...(new token)
```

**Error responses**

```json
// 400 Bad Request
{ "error": "Name, email and password are required" }

// 401 Unauthorized
{ "error": "Invalid email or password" }

// 401 Token issue
{ "error": "Token expired" }

// 403 Forbidden
{ "error": "Refresh token is invalid or revoked" }

// 409 Conflict
{ "error": "Email already registered" }
```

---

## 6. Security

### Protection Summary

| Threat | Protection |
|---|---|
| XSS stealing tokens | Access token in memory only; refresh token in httpOnly cookie (JS cannot read) |
| CSRF attacks | `sameSite=strict` on cookie; access token sent via header (not cookie) |
| Brute force | `express-rate-limit`: max 100 requests per 15 min per IP |
| Token replay | Refresh token rotation — each token usable only once |
| Password theft | bcrypt with cost factor 12 — one-way hash, never stored plain |
| Header injection | `helmet` sets 11 security headers on every response |
| CORS violations | `cors` configured with explicit origin whitelist |

### Environment Variables

These secrets must never be committed to version control:

```env
ACCESS_TOKEN_SECRET=your_very_long_random_secret_min_32_chars
REFRESH_TOKEN_SECRET=another_different_secret_min_32_chars
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
PORT=5000
```

> Use **two different** secrets for access and refresh tokens. If one is compromised, the other remains secure.

### Current Limitation — In-Memory Store

```js
// controllers/store.js
const users = new Map();          // lost on server restart
const refreshTokens = new Set();  // lost on server restart
```

- All users and tokens are wiped when the server restarts
- Cannot run multiple backend instances (tokens not shared between processes)
- Replace with a real database before going to production (see [Section 9](#9-upgrading-to-a-database))

---

## 7. Frontend Architecture

### 7.1 Token Storage

The access token lives in a plain JavaScript variable — intentionally **not** in `localStorage`:

```ts
// lib/apiClient.ts
let _accessToken: string | null = null;

export const setAccessToken = (token: string) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };
```

Memory storage means XSS scripts cannot steal the token. The token is lost on tab close/refresh, but the httpOnly cookie silently restores it via the refresh endpoint.

---

### 7.2 AuthContext

Provides global auth state to the entire app:

```ts
interface AuthContextType {
  user: User | null;   // null = not logged in
  loading: boolean;    // true while checking session on mount
  login:    (email, password) => Promise<void>;
  register: (name, email, password) => Promise<void>;
  logout:   () => Promise<void>;
}
```

On mount, `AuthContext` calls `refreshSession()` to restore the session using the httpOnly cookie. The `loading` flag is critical — it prevents the dashboard from redirecting to `/login` before the session restore completes.

---

### 7.3 Axios Interceptors

**Request interceptor** — attaches token before every request:

```ts
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Response interceptor** — catches 401s and refreshes automatically:

```ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    // call /auth/refresh → update token → retry original request
  }
);
```

---

### 7.4 Route Protection — Two Layers

**Layer 1 — `src/middleware.ts` (Next.js Edge middleware)**

Runs before the page renders. Checks for the `refreshToken` cookie:

```ts
if (isProtected && !hasSession)  → redirect to /login
if (isAuthRoute && hasSession)   → redirect to /dashboard
```

**Layer 2 — Dashboard `useEffect` (client-side backup)**

```ts
useEffect(() => {
  // Wait for loading to complete before deciding to redirect
  // Redirecting while loading=true kicks out valid users
  if (!loading && !user) {
    router.push('/login');
  }
}, [user, loading, router]);
```

---

## 8. Setup & Running

### Backend

```bash
cd backend
npm install
```

Create `.env` (copy from `.env.example` and fill in your secrets):

```env
PORT=5000
CLIENT_URL=http://localhost:3000
ACCESS_TOKEN_SECRET=your_very_long_random_secret_here
REFRESH_TOKEN_SECRET=another_very_long_random_secret_here
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=development
```

Start the server:

```bash
npm start
# or with auto-reload:
npx nodemon server.js
```

---

### Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000` — you will be redirected to `/dashboard`, then to `/login` since you have no session yet.

---

### Testing the Full Flow

| Step | Action | Expected result |
|---|---|---|
| 1 | Go to `/register`, fill form | Redirected to dashboard |
| 2 | Click "Test API" button | Calls `GET /auth/me`, shows user JSON |
| 3 | Refresh the page | Dashboard stays — session restored via cookie |
| 4 | Click Logout | Redirected to `/login`, cookie cleared |
| 5 | Visit `/dashboard` directly | Middleware redirects back to `/login` |
| 6 | Set `ACCESS_TOKEN_EXPIRES_IN=10s` | Watch auto-refresh in Network tab after 10 seconds |

---

## 9. Upgrading to a Database

Only **two files** need to change when adding persistence. Everything else — server, middleware, routes, and the entire frontend — stays the same.

### MongoDB (Mongoose)

```bash
npm install mongoose
```

```js
// models/User.js
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
module.exports = mongoose.model('User', UserSchema);

// models/RefreshToken.js
const TokenSchema = new mongoose.Schema({
  token: { type: String, unique: true },
  userId: String,
  expiresAt: Date,
});
module.exports = mongoose.model('RefreshToken', TokenSchema);
```

Then update `authController.js` to use `User.findOne()`, `user.save()`, `RefreshToken.create()`, etc.

---

### PostgreSQL (Prisma)

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
model User {
  id       String         @id @default(cuid())
  name     String
  email    String         @unique
  password String
  tokens   RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
}
```

Then update `authController.js` to use `prisma.user.findUnique()`, `prisma.refreshToken.create()`, etc.

---

## License

MIT
