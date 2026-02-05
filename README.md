# Project Management System (Server)

Node.js/Express API for a simple project management system with JWT authentication, role-based access control, and MongoDB persistence.

## Features

- **Auth:** Access tokens (Bearer) + rotating refresh tokens (HttpOnly cookie)
- **RBAC:** `ADMIN`, `MANAGER`, `STAFF`
- **Invites:** Admin can invite users; users register via invite token
- **User management (Admin):** List users, change role/status, delete user (prevents removing the last active admin)
- **Projects:** Create/list projects (any authenticated user), update/delete projects (admin-only, soft delete)
- **Security & DX:** Helmet, CORS (credentials), rate limiting, request validation (Zod), request logging (morgan)

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`), password hashing (`bcryptjs`)
- Validation (`zod`), security middleware (`helmet`), rate limiting (`express-rate-limit`)

## Getting started

### Prerequisites

- Node.js (LTS recommended)
- A MongoDB instance (local or hosted)

### Install

```bash
npm install
```

### Configure environment

Create a `.env` file in the project root:

```dotenv
PORT=5000
MONGO_URI=mongodb://localhost:27017/project-management

# Comma-separated list of allowed origins (e.g. "http://localhost:3000,https://app.example.com")
# If omitted, CORS will reflect the request origin.
CORS_ORIGIN=http://localhost:3000

# JWT signing secrets (REQUIRED for production; dev fallbacks exist but are not safe)
ACCESS_TOKEN_SECRET=change-me
REFRESH_TOKEN_SECRET=change-me

# Token lifetimes (supported units: ms|s|m|h|d)
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

# Refresh cookie configuration
# For cross-site SPAs you will typically need: COOKIE_SAMESITE=None and HTTPS (secure cookies).
COOKIE_SAMESITE=Strict
# COOKIE_DOMAIN=localhost

# Optional JWT claims used for signing/verification
# JWT_ISSUER=project-management-system
# JWT_AUDIENCE=web-client

# Invite settings
INVITE_TOKEN_BYTES=32
INVITE_EXPIRES_HOURS=48

NODE_ENV=development
```

### Run

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

### Health check

`GET /health` returns:

```json
{"ok": true}
```

## Authentication overview

- **Access token**: returned in JSON and sent via `Authorization: Bearer <token>`
- **Refresh token**: stored as an **HttpOnly** cookie named `refreshToken`
- **Rotation**: `/auth/refresh` revokes the current refresh token and issues a new token pair
- **Logout**: `/auth/logout` clears the cookie and revokes the current refresh token (if present)

### Quick cURL flow (cookie jar)

```bash
# 1) Login (stores refresh cookie in jar.txt)
curl -sS -c jar.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' \
  http://localhost:5000/auth/login

# 2) Refresh (sends + updates refresh cookie)
curl -sS -b jar.txt -c jar.txt -X POST http://localhost:5000/auth/refresh
```

More examples: `auth.md`.

## API

All error responses are JSON in the form:

```json
{"message": "..."}
```

### Auth (`/auth`)

| Method | Path                        | Auth     | Role    | Notes                                                                                     |
| ------ | --------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `POST` | `/auth/login`               | No       | -       | Returns `{ accessToken, user }` and sets `refreshToken` cookie                            |
| `POST` | `/auth/refresh`             | Cookie   | -       | Rotates refresh token and returns `{ accessToken, user }`                                 |
| `POST` | `/auth/logout`              | Optional | -       | Clears refresh cookie; returns `204`                                                      |
| `GET`  | `/auth/me`                  | Bearer   | Any     | Returns `{ user }`                                                                        |
| `POST` | `/auth/invite`              | Bearer   | `ADMIN` | Creates an invite; response includes invite token/link (email sending is not implemented) |
| `POST` | `/auth/register-via-invite` | No       | -       | Completes registration from invite token; sets refresh cookie                             |

### Users (`/users`) — Admin only

All `/users` routes require `Authorization: Bearer <accessToken>` and `ADMIN` role.

| Method   | Path                  | Description                     |
| -------- | --------------------- | ------------------------------- | ---------- | ------- |
| `GET`    | `/users?page=&limit=` | List users (paginated)          |
| `PATCH`  | `/users/:id/role`     | Update a user's role (`ADMIN    | MANAGER    | STAFF`) |
| `PATCH`  | `/users/:id/status`   | Update a user's status (`ACTIVE | INACTIVE`) |
| `DELETE` | `/users/:id`          | Delete a user                   |

### Projects (`/projects`)

All `/projects` routes require `Authorization: Bearer <accessToken>`.

| Method   | Path            | Role    | Description                          |
| -------- | --------------- | ------- | ------------------------------------ |
| `POST`   | `/projects`     | Any     | Create a project                     |
| `GET`    | `/projects`     | Any     | List non-deleted projects            |
| `PATCH`  | `/projects/:id` | `ADMIN` | Update project fields / archive      |
| `DELETE` | `/projects/:id` | `ADMIN` | Soft delete (marks `isDeleted=true`) |

## Admin recovery / seeding

If all admins are removed or deactivated, you can recover access using:

```bash
node src/scripts/seedAdmin.js
```

This creates an admin if none exists, or promotes/reactivates an existing user by email. Details: `docs/admin-recovery.md`.

## Project structure

- `src/server.js` – bootstraps the server and DB connection
- `src/app.js` – Express app, middleware, and routes
- `src/routes/` – route definitions + validation
- `src/controllers/` – request handlers
- `src/models/` – Mongoose models
- `src/middleware/` – auth/RBAC, validation, error handling
- `src/scripts/` – maintenance scripts (admin recovery)

## License

ISC
