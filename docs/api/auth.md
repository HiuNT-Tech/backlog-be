# Auth API

## POST /v1/auth/register

### Summary

Register a user and send an email verification link.

### Auth

- Required: no
- Mechanism: public
- Permission: none
- Rate limit: 5 requests per configured window

### Request

Path params: none.

Query params: none.

Body:

```json
{
  "email": "user@example.com",
  "displayName": "User",
  "password": "password123",
  "phone": "0900000000"
}
```

Validation:

- `email`: email, normalized.
- `displayName`: optional string, min 2, normalized. Defaults to email prefix when omitted.
- `password`: string, min 8.
- `phone`: optional string.

### Success Response

Status: `201 Created`

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": false,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

Field notes:

| Field       | Type            | Nullable | Notes                             |
| ----------- | --------------- | -------- | --------------------------------- |
| id          | number          | no       | User id.                          |
| email       | string          | no       | Normalized email.                 |
| displayName | string          | no       | Display name.                     |
| avatar      | string          | yes      | Avatar URL.                       |
| userCode    | string          | yes      | Optional user code.               |
| role        | `USER \| ADMIN` | no       | Global user role.                 |
| isActive    | boolean         | no       | `false` until email verification. |
| createdAt   | ISO string      | no       | Creation timestamp.               |
| updatedAt   | ISO string      | no       | Update timestamp.                 |

### Error Responses

| Status | When                                       | Response notes                            |
| ------ | ------------------------------------------ | ----------------------------------------- |
| 400    | Invalid payload                            | Validation errors in `message`.           |
| 409    | Email already exists                       | `errorCode` can be `USER_EMAIL_EXISTS`.   |
| 500    | Verification email cannot be prepared/sent | Standard error response with `requestId`. |

### FE Integration

- Interface: `RegisterUserRequest`, `RegisterUserResponse`
- API function: `FE/lib/apis/auth.ts -> AuthService.register`
- Query key: none
- Invalidate after mutation: none
- Screens: `/register`, `/login?registeredEmail=...`

### Examples

Request:

```bash
curl -X POST http://localhost:8017/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "user",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": false,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

## POST /v1/auth/login

### Summary

Authenticate an active user, set auth cookies, and return user data plus tokens.

### Auth

- Required: no
- Mechanism: public
- Permission: active user account
- Rate limit: 5 requests per configured window

### Request

Path params: none.

Query params: none.

Body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Validation:

- `email`: email, normalized.
- `password`: string, min 8.

### Success Response

Status: `200 OK`

Also sets httpOnly cookies:

- `accessToken`
- `refreshToken`

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z",
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Field notes:

| Field        | Type            | Nullable | Notes                                                 |
| ------------ | --------------- | -------- | ----------------------------------------------------- |
| id           | number          | no       | User id.                                              |
| email        | string          | no       | User email.                                           |
| displayName  | string          | no       | Display name.                                         |
| avatar       | string          | yes      | Avatar URL.                                           |
| userCode     | string          | yes      | Optional user code.                                   |
| role         | `USER \| ADMIN` | no       | Global user role.                                     |
| isActive     | boolean         | no       | Must be true to login.                                |
| accessToken  | string          | no       | Returned for compatibility; FE primarily uses cookie. |
| refreshToken | string          | no       | Returned for compatibility; FE primarily uses cookie. |

### Error Responses

| Status | When                                       | Response notes                            |
| ------ | ------------------------------------------ | ----------------------------------------- |
| 400    | Invalid payload                            | Validation errors in `message`.           |
| 401    | Invalid email/password or inactive account | `errorCode` can be `INVALID_CREDENTIALS`. |

### FE Integration

- Interface: `LoginUserRequest`, `LoginUserResponse`
- API function: `FE/lib/apis/auth.ts -> AuthService.login`
- Query key: current user cache if used
- Invalidate after mutation: current user/session state
- Screens: `/login`, authenticated layout

### Examples

Request:

```bash
curl -X POST http://localhost:8017/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z",
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

## POST /v1/auth/verify-account

### Summary

Verify a newly registered account by email and verification token.

### Auth

- Required: no
- Mechanism: public
- Permission: matching verification token
- Rate limit: 5 requests per configured window

### Request

Path params: none.

Query params: none.

Body:

```json
{
  "email": "user@example.com",
  "token": "verification-token"
}
```

Validation:

- `email`: email, normalized.
- `token`: string.

### Success Response

Status: `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

Field notes:

| Field    | Type    | Nullable | Notes                               |
| -------- | ------- | -------- | ----------------------------------- |
| id       | number  | no       | User id.                            |
| isActive | boolean | no       | Expected `true` after verification. |

### Error Responses

| Status | When                               | Response notes                                                              |
| ------ | ---------------------------------- | --------------------------------------------------------------------------- |
| 400    | Invalid payload                    | Validation errors in `message`.                                             |
| 404    | User not found                     | `errorCode` can be `USER_NOT_FOUND`.                                        |
| 406    | Already verified or token mismatch | `errorCode` can be `USER_ALREADY_VERIFIED` or `INVALID_VERIFICATION_TOKEN`. |

### FE Integration

- Interface: verify-account request shape `{ email: string; token: string }`
- API function: `FE/lib/apis/auth.ts -> AuthService.verifyAccount`
- Query key: none
- Invalidate after mutation: none
- Screens: `/account/verification`, `/login?verifiedEmail=...`

### Examples

Request:

```bash
curl -X POST http://localhost:8017/v1/auth/verify-account \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","token":"verification-token"}'
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

## DELETE /v1/auth/logout

### Summary

Revoke the current refresh-token session if present and clear auth cookies.

### Auth

- Required: no
- Mechanism: optional cookie `refreshToken`
- Permission: none

### Request

Path params: none.

Query params: none.

Body: none.

Validation: none.

### Success Response

Status: `200 OK`

Also clears cookies:

- `accessToken`
- `refreshToken`

```json
{
  "message": "Logged out successfully"
}
```

Field notes:

| Field   | Type   | Nullable | Notes                |
| ------- | ------ | -------- | -------------------- |
| message | string | no       | Logout confirmation. |

### Error Responses

| Status | When                    | Response notes                            |
| ------ | ----------------------- | ----------------------------------------- |
| 500    | Unexpected revoke error | Standard error response with `requestId`. |

### FE Integration

- Interface: inline `{ message: string }`
- API function: `FE/lib/apis/auth.ts -> AuthService.logout`
- Query key: current user/session state
- Invalidate after mutation: clear auth/user query cache
- Screens: authenticated layout/logout button

### Examples

Request:

```bash
curl -X DELETE http://localhost:8017/v1/auth/logout --cookie 'refreshToken=<jwt>'
```

Response:

```json
{
  "message": "Logged out successfully"
}
```

## GET /v1/auth/refresh_token

### Summary

Rotate refresh token, set new auth cookies, and return new tokens.

### Auth

- Required: yes
- Mechanism: cookie `refreshToken`
- Permission: active refresh-token session
- Rate limit: 10 requests per configured window

### Request

Path params: none.

Query params: none.

Body: none.

Validation:

- `refreshToken` cookie must exist and match an active stored session.

### Success Response

Status: `200 OK`

Also sets httpOnly cookies:

- `accessToken`
- `refreshToken`

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Field notes:

| Field        | Type   | Nullable | Notes              |
| ------------ | ------ | -------- | ------------------ |
| accessToken  | string | no       | New access token.  |
| refreshToken | string | no       | New refresh token. |

### Error Responses

| Status | When                          | Response notes                      |
| ------ | ----------------------------- | ----------------------------------- |
| 401    | Missing/invalid refresh token | `errorCode` can be `INVALID_TOKEN`. |

### FE Integration

- Interface: `RefreshTokenResponse`
- API function: `FE/lib/apis/auth.ts -> AuthService.refreshToken`
- Query key: none
- Invalidate after mutation: retry original failed request
- Screens: axios interceptor / auth middleware

### Examples

Request:

```bash
curl http://localhost:8017/v1/auth/refresh_token --cookie 'refreshToken=<jwt>'
```

Response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

## GET /v1/auth/me

### Summary

Return the current authenticated user from the access-token cookie or bearer token.

### Auth

- Required: yes
- Mechanism: cookie `accessToken` or bearer token
- Permission: active user account

### Request

Path params: none.

Query params: none.

Body: none.

Validation:

- Access token must contain a valid user id.
- User must exist and be active.

### Success Response

Status: `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

Field notes:

| Field       | Type            | Nullable | Notes                  |
| ----------- | --------------- | -------- | ---------------------- |
| id          | number          | no       | User id.               |
| email       | string          | no       | User email.            |
| displayName | string          | no       | Display name.          |
| avatar      | string          | yes      | Avatar URL.            |
| userCode    | string          | yes      | Optional user code.    |
| role        | `USER \| ADMIN` | no       | Global user role.      |
| isActive    | boolean         | no       | Active account status. |

### Error Responses

| Status | When                                   | Response notes                                               |
| ------ | -------------------------------------- | ------------------------------------------------------------ |
| 401    | Missing/invalid token or inactive user | FE should redirect to login unless refresh flow is possible. |
| 410    | Access token expired                   | FE refresh-token retry.                                      |

### FE Integration

- Interface: `User`
- API function: `FE/lib/apis/auth.ts -> AuthService.me`
- Query key: current user/session state
- Invalidate after mutation: login/logout/profile update
- Screens: authenticated layout, guards

### Examples

Request:

```bash
curl http://localhost:8017/v1/auth/me --cookie 'accessToken=<jwt>'
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "User",
  "avatar": null,
  "userCode": null,
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-05-26T00:00:00.000Z",
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```
