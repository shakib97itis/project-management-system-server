# Auth API

All responses **never** include a password field.

## GET `/auth/me`

Returns the currently authenticated user's profile (fresh from the DB).

**Auth:** `Authorization: Bearer <accessToken>`

**Response**

```json
{
  "user": { "id": "string", "name": "string", "email": "string", "role": "ADMIN|MANAGER|STAFF", "status": "ACTIVE|INACTIVE" }
}
```

**Curl**

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:5000/auth/me
```

## POST `/auth/refresh`

Rotates the refresh token cookie and returns a new access token **and** the current user profile.

**Auth:** `refreshToken` HttpOnly cookie (set by `/auth/login` or `/auth/register-via-invite`)

**Response**

```json
{
  "accessToken": "string",
  "user": { "id": "string", "name": "string", "email": "string", "role": "ADMIN|MANAGER|STAFF", "status": "ACTIVE|INACTIVE" }
}
```

**Curl (using cookie jar)**

```bash
# 1) Login (stores refresh cookie in jar.txt)
curl -sS -c jar.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  http://localhost:5000/auth/login

# 2) Refresh (sends + updates refresh cookie; prints JSON with accessToken + user)
curl -sS -b jar.txt -c jar.txt -X POST http://localhost:5000/auth/refresh
```

