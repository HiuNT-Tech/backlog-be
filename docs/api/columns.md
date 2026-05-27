# Columns API

All column endpoints require an authenticated user via `accessToken` cookie or Bearer token.

## GET /v1/columns

### Summary

Return ordered active columns for a board.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Query params:

| Field   | Type   | Required | Notes     |
| ------- | ------ | -------- | --------- |
| boardId | number | yes      | Board id. |

### Success Response

Status: `200 OK`

```json
[
  {
    "id": 1,
    "boardId": 1,
    "title": "To Do",
    "statusColor": 7,
    "position": 0,
    "_count": { "cards": 3 },
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
]
```

### Error Responses

| Status | When                               | Response notes                |
| ------ | ---------------------------------- | ----------------------------- |
| 400    | Missing or invalid `boardId`       | Standard error response.      |
| 403    | Current user is not a board member | Standard error response.      |
| 404    | Board not found                    | Standard error response.      |
| 410    | Access token expired               | FE should refresh then retry. |

### FE Integration

- Interface: `Column[]`
- Query key: columns by board id.

## POST /v1/columns

### Summary

Create a new board column/status at the end of the board.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Body:

```json
{
  "boardId": 1,
  "title": "Review",
  "statusColor": 7
}
```

Validation:

- `boardId`: number.
- `title`: string, 2..50.
- `statusColor`: number, 1..10.

### Success Response

Status: `201 Created`

```json
{
  "id": 5,
  "boardId": 1,
  "title": "Review",
  "statusColor": 7,
  "position": 4,
  "cards": [],
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

### Error Responses

| Status | When                                | Response notes           |
| ------ | ----------------------------------- | ------------------------ |
| 400    | Invalid payload                     | Standard error response. |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response. |
| 404    | Board not found                     | Standard error response. |

### FE Integration

- Interface: `Column`
- Invalidate after mutation: columns by board id, board detail.

## PUT /v1/columns/:id

### Summary

Update column metadata and optionally reorder cards inside the column.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field | Type   | Notes      |
| ----- | ------ | ---------- |
| id    | number | Column id. |

Body:

```json
{
  "title": "Done",
  "statusColor": 4,
  "cards": [{ "id": 1, "position": 0 }]
}
```

Validation:

- `title`: optional string, 2..50.
- `statusColor`: optional number, 1..10.
- `cards[].id` must belong to this column.
- `cards[].position` must be `>= 0`.

### Success Response

Status: `200 OK`

Returns the updated column.

### Error Responses

| Status | When                                   | Response notes           |
| ------ | -------------------------------------- | ------------------------ |
| 400    | Invalid payload or cards not in column | Standard error response. |
| 403    | Current user is not `ADMIN` or `PM`    | Standard error response. |
| 404    | Column not found                       | Standard error response. |

### FE Integration

- Interface: `Column`
- Used for card reorder within the same column.
- Invalidate after mutation: board detail, columns by board id.

## DELETE /v1/columns/:id

### Summary

Soft delete a column and its cards, then normalize remaining column positions.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field | Type   | Notes      |
| ----- | ------ | ---------- |
| id    | number | Column id. |

Body: none.

### Success Response

Status: `200 OK`

```json
{
  "deleteResult": "Column and its Cards deleted successfully!"
}
```

### Error Responses

| Status | When                                | Response notes           |
| ------ | ----------------------------------- | ------------------------ |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response. |
| 404    | Column not found                    | Standard error response. |

### FE Integration

- Interface: `{ deleteResult: string }`
- Invalidate after mutation: board detail, columns by board id.
