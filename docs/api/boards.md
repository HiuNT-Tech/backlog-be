# Boards API

All board endpoints require an authenticated user via `accessToken` cookie or Bearer token.

## GET /v1/boards

### Summary

Return boards where the current user is an active member.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Path params: none.

Query params: none.

Body: none.

### Success Response

Status: `200 OK`

```json
[
  {
    "id": 1,
    "title": "Pro IP Partner Customer",
    "boardCode": "PIPC",
    "description": "",
    "type": "PUBLIC",
    "members": [{ "userId": 1, "role": "ADMIN" }],
    "columns": [],
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
]
```

### Error Responses

| Status | When                            | Response notes                            |
| ------ | ------------------------------- | ----------------------------------------- |
| 401    | Missing or invalid access token | Standard error response with `requestId`. |
| 410    | Access token expired            | FE should call refresh token then retry.  |

### FE Integration

- Interface: `Board[]`
- API function: dashboard board list
- Query key: boards

## POST /v1/boards

### Summary

Create a board, add the current user as `ADMIN`, and create default columns.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: authenticated user

### Request

Body:

```json
{
  "title": "Pro IP Partner Customer",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC"
}
```

Validation:

- `title`: string, 3..50.
- `boardCode`: string, 2..16, uppercase letters, numbers, and underscores only.
- `description`: optional string, max 255.
- `type`: `PUBLIC | PRIVATE`.

### Success Response

Status: `201 Created`

Returns the created board with ordered default columns.

### Error Responses

| Status | When                            | Response notes                  |
| ------ | ------------------------------- | ------------------------------- |
| 400    | Invalid payload                 | Validation errors in `message`. |
| 401    | Missing or invalid access token | Standard error response.        |
| 409    | `boardCode` already exists      | Standard error response.        |
| 410    | Access token expired            | FE should refresh then retry.   |

### FE Integration

- Interface: `Board`
- Invalidate after mutation: boards
- Redirect target: `/boards/:id` or matching FE board detail route.

## GET /v1/boards/:id

### Summary

Return a board with ordered columns and each column's ordered cards.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Path params:

| Field | Type   | Notes     |
| ----- | ------ | --------- |
| id    | number | Board id. |

Query params:

| Field          | Type   | Required | Notes                     |
| -------------- | ------ | -------- | ------------------------- |
| assigneeUserId | number | no       | Filter cards by assignee. |

### Success Response

Status: `200 OK`

```json
{
  "id": 1,
  "title": "Pro IP Partner Customer",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC",
  "members": [{ "userId": 1, "role": "ADMIN" }],
  "columns": [
    {
      "id": 1,
      "boardId": 1,
      "title": "To Do",
      "statusColor": 7,
      "position": 0,
      "cards": [
        {
          "id": 1,
          "boardId": 1,
          "columnId": 1,
          "cardNumber": 4119,
          "cardCode": "PIPC-4119",
          "title": "Issue title",
          "description": "",
          "priorityId": 2,
          "assigneeUserId": 1,
          "position": 0,
          "createdAt": "2026-05-25T00:00:00.000Z",
          "updatedAt": "2026-05-25T00:00:00.000Z"
        }
      ],
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

### Error Responses

| Status | When                               | Response notes                |
| ------ | ---------------------------------- | ----------------------------- |
| 403    | Current user is not a board member | Standard error response.      |
| 404    | Board not found                    | Standard error response.      |
| 410    | Access token expired               | FE should refresh then retry. |

### FE Integration

- Interface: `Board`
- Query key: board detail by id
- Cards are already grouped under `columns[].cards`.

## PUT /v1/boards/:id

### Summary

Update board metadata and optionally reorder columns.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Body:

```json
{
  "title": "Pro IP Partner Customer",
  "boardCode": "PIPC",
  "description": "",
  "type": "PUBLIC",
  "columns": [{ "id": 1, "position": 0 }]
}
```

Validation:

- `boardCode` can change only before any cards exist on the board.
- `columns[].id` must belong to the board.
- `columns[].position` must be `>= 0`.

### Success Response

Status: `200 OK`

Returns updated board detail.

### Error Responses

| Status | When                                  | Response notes           |
| ------ | ------------------------------------- | ------------------------ |
| 400    | Invalid payload or invalid column ids | Standard error response. |
| 403    | Current user is not `ADMIN` or `PM`   | Standard error response. |
| 404    | Board not found                       | Standard error response. |
| 409    | `boardCode` conflicts                 | Standard error response. |

### FE Integration

- Interface: `Board`
- Invalidate after mutation: board detail, boards list.
- Used for column drag reorder with `{ columns: [{ id, position }] }`.

## GET /v1/boards/:id/usersBoard

### Summary

Return board members joined with user profile fields.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Query params:

| Field  | Type                             | Required | Notes                                    |
| ------ | -------------------------------- | -------- | ---------------------------------------- |
| search | string                           | no       | Matches email, displayName, or userCode. |
| role   | `ADMIN \| PM \| MEMBER \| GUEST` | no       | Filter board role.                       |
| skip   | number                           | no       | Default `0`.                             |
| limit  | number                           | no       | Default `10`, max `100`.                 |

### Success Response

Status: `200 OK`

```json
{
  "total": 1,
  "items": [
    {
      "userId": 1,
      "role": "ADMIN",
      "email": "user@example.com",
      "username": "user",
      "displayName": "User",
      "avatar": null,
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ]
}
```

### Error Responses

| Status | When                               | Response notes           |
| ------ | ---------------------------------- | ------------------------ |
| 403    | Current user is not a board member | Standard error response. |
| 404    | Board not found                    | Standard error response. |

### FE Integration

- Interface: `{ total: number; items: BoardUser[] }`
- Query key: board users by board id and filters.
