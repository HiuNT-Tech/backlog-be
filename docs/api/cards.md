# Cards API

All card endpoints require an authenticated user via `accessToken` cookie or Bearer token.

## POST /v1/cards

### Summary

Create a card in a board column.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Body:

```json
{
  "boardId": 1,
  "columnId": 1,
  "title": "Issue title",
  "description": "",
  "priorityId": 2,
  "assigneeUserId": 1,
  "issueTypeId": 1,
  "versionId": 1,
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "4",
  "actualHours": "2"
}
```

Validation:

- `boardId`: number, minimum `1`.
- `columnId`: number, minimum `1`, must belong to the board.
- `title`: string, 3..50.
- `priorityId`: optional number, 1..3.
- `assigneeUserId`: optional board member user id.
- `issueTypeId`: optional issue type id on the board.
- `versionId`: optional version id on the board.
- `startDate` and `dueDate`: optional ISO date strings; `startDate` must be before or equal `dueDate` when both are provided.
- `estimatedHours` and `actualHours`: optional strings, max 32.

### Success Response

Status: `201 Created`

```json
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
  "assignee": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name",
    "avatar": null
  },
  "issueTypeId": 1,
  "issueType": {
    "id": 1,
    "boardId": 1,
    "name": "Bug",
    "statusColor": 1
  },
  "column": {
    "id": 1,
    "boardId": 1,
    "title": "To Do",
    "statusColor": 7,
    "position": 0
  },
  "versionId": 1,
  "version": {
    "id": 1,
    "boardId": 1,
    "name": "v1.0"
  },
  "startDate": "2026-05-25T00:00:00.000Z",
  "dueDate": "2026-05-30T00:00:00.000Z",
  "estimatedHours": "4",
  "actualHours": "2",
  "registeredByUserId": 1,
  "registeredBy": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name",
    "avatar": null
  },
  "createdBy": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name",
    "avatar": null
  },
  "position": 0,
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

### Error Responses

| Status | When                                         | Response notes                |
| ------ | -------------------------------------------- | ----------------------------- |
| 400    | Invalid payload or date range                | Standard error response.      |
| 401    | Missing or invalid access token              | Standard error response.      |
| 403    | User/assignee is not a board member          | Standard error response.      |
| 404    | Board column, issue type, or version missing | Standard error response.      |
| 410    | Access token expired                         | FE should refresh then retry. |

### FE Integration

- Interface: `Card`
- Invalidate after mutation: board detail, board cards, columns/card counts.

## GET /v1/cards/:id

### Summary

Return card detail by id.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Path params:

| Field | Type   | Notes    |
| ----- | ------ | -------- |
| id    | number | Card id. |

Body: none.

### Success Response

Status: `200 OK`

### Error Responses

| Status | When                            | Response notes                |
| ------ | ------------------------------- | ----------------------------- |
| 401    | Missing or invalid access token | Standard error response.      |
| 403    | User is not a board member      | Standard error response.      |
| 404    | Card not found                  | Standard error response.      |
| 410    | Access token expired            | FE should refresh then retry. |

### FE Integration

- Interface: `Card`

## PUT /v1/cards/:id

### Summary

Update mutable card fields.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Path params:

| Field | Type   | Notes    |
| ----- | ------ | -------- |
| id    | number | Card id. |

Body:

```json
{
  "title": "New title",
  "description": "New desc",
  "columnId": 1,
  "priorityId": 3,
  "assigneeUserId": 1,
  "issueTypeId": 1,
  "versionId": 1,
  "startDate": "2026-05-25",
  "dueDate": "2026-05-30",
  "estimatedHours": "5",
  "actualHours": "3"
}
```

All body fields are optional. Validation is the same as create where fields overlap.

### Success Response

Status: `200 OK`

### Error Responses

| Status | When                            | Response notes                |
| ------ | ------------------------------- | ----------------------------- |
| 400    | Invalid payload                 | Standard error response.      |
| 401    | Missing or invalid access token | Standard error response.      |
| 403    | User is not a board member      | Standard error response.      |
| 404    | Card not found                  | Standard error response.      |
| 410    | Access token expired            | FE should refresh then retry. |

### FE Integration

- Interface: `Card`
- Invalidate after mutation: card detail, board detail, board cards.

## GET /v1/boards/:id/cards

### Summary

Return paginated cards for a board with filters.

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

| Field              | Type     | Required | Default | Notes                              |
| ------------------ | -------- | -------- | ------- | ---------------------------------- |
| search             | string   | no       | none    | Search by title.                   |
| cardCode           | string   | no       | none    | Exact or partial card code filter. |
| priorityId         | number[] | no       | none    | Comma-separated ids are accepted.  |
| issueTypeId        | number[] | no       | none    | Comma-separated ids are accepted.  |
| columnId           | number[] | no       | none    | Comma-separated ids are accepted.  |
| assigneeUserId     | number[] | no       | none    | Comma-separated ids are accepted.  |
| registeredByUserId | number[] | no       | none    | Comma-separated ids are accepted.  |
| versionId          | number[] | no       | none    | Comma-separated ids are accepted.  |
| startDate          | string   | no       | none    | ISO date string.                   |
| dueDate            | string   | no       | none    | ISO date string.                   |
| skip               | number   | no       | `0`     | Offset, minimum `0`.               |
| limit              | number   | no       | `10`    | Page size, minimum `1`.            |

### Success Response

Status: `200 OK`

```json
{
  "total": 0,
  "items": []
}
```

### Error Responses

| Status | When                            | Response notes                |
| ------ | ------------------------------- | ----------------------------- |
| 400    | Invalid path or query params    | Standard error response.      |
| 401    | Missing or invalid access token | Standard error response.      |
| 403    | User is not a board member      | Standard error response.      |
| 410    | Access token expired            | FE should refresh then retry. |

### FE Integration

- Interface: `{ total: number; items: Card[] }`
- Query key: board cards by board id and filters.

## PUT /v1/boards/supports/moving_card

### Summary

Move a card between board columns and update positions.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Body:

```json
{
  "currentCardId": 1,
  "prevColumnId": 1,
  "prevCards": [{ "id": 2, "position": 0 }],
  "nextColumnId": 2,
  "nextCards": [
    { "id": 3, "position": 0 },
    { "id": 1, "position": 1 }
  ]
}
```

Validation:

- `currentCardId`, `prevColumnId`, `nextColumnId`: number, minimum `1`.
- `prevCards` and `nextCards`: arrays of `{ id: number; position: number }`.
- `prevCards` must not include `currentCardId`.
- `nextCards` must include `currentCardId`.
- `position`: minimum `0`.

### Success Response

Status: `200 OK`

```json
{
  "updateResult": "Successfully!"
}
```

### Error Responses

| Status | When                            | Response notes                |
| ------ | ------------------------------- | ----------------------------- |
| 400    | Invalid move payload            | Standard error response.      |
| 401    | Missing or invalid access token | Standard error response.      |
| 403    | User is not a board member      | Standard error response.      |
| 404    | Card or column not found        | Standard error response.      |
| 410    | Access token expired            | FE should refresh then retry. |

### FE Integration

- Interface: `{ updateResult: string }`
- Invalidate after mutation: board detail, board cards, columns/card counts.
