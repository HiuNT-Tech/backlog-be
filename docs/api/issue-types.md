# Issue Types API

All issue-type endpoints require an authenticated user via `accessToken` cookie or Bearer token.

## GET /v1/boards/:id/issue-types

### Summary

Return paginated active issue types for a board.

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

| Field   | Type   | Required | Default | Notes                      |
| ------- | ------ | -------- | ------- | -------------------------- |
| keyword | string | no       | none    | Search by issue-type name. |
| skip    | number | no       | `0`     | Offset, minimum `0`.       |
| limit   | number | no       | `10`    | Page size, 1..100.         |

Body: none.

### Success Response

Status: `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "boardId": 1,
      "name": "Bug",
      "statusColor": 1,
      "issueCount": 2,
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Error Responses

| Status | When                               | Response notes                |
| ------ | ---------------------------------- | ----------------------------- |
| 400    | Invalid path or query params       | Standard error response.      |
| 401    | Missing or invalid access token    | Standard error response.      |
| 403    | Current user is not a board member | Standard error response.      |
| 404    | Board not found                    | Standard error response.      |
| 410    | Access token expired               | FE should refresh then retry. |

### FE Integration

- Interface: `{ items: IssueType[]; count: number }`
- Query key: issue types by board id and filters.

## POST /v1/boards/:id/issue-types

### Summary

Create an issue type for a board.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field | Type   | Notes     |
| ----- | ------ | --------- |
| id    | number | Board id. |

Body:

```json
{
  "name": "Bug",
  "statusColor": 1
}
```

Validation:

- `name`: string, 3..50, unique per board among active issue types.
- `statusColor`: optional number, 1..10, default `1`.

### Success Response

Status: `201 Created`

Returns the created issue type with `issueCount: 0`.

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 400    | Invalid payload                     | Standard error response.      |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board not found                     | Standard error response.      |
| 409    | Issue type name already exists      | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `IssueType`
- Invalidate after mutation: issue types by board id, board detail/cards if issue-type filters are shown.

## PUT /v1/boards/:id/issue-types/:issueTypeId

### Summary

Update issue type name or display color.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field       | Type   | Notes          |
| ----------- | ------ | -------------- |
| id          | number | Board id.      |
| issueTypeId | number | Issue type id. |

Body:

```json
{
  "name": "Task",
  "statusColor": 2
}
```

All body fields are optional. Validation is the same as create.

### Success Response

Status: `200 OK`

Returns the updated issue type.

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 400    | Invalid payload                     | Standard error response.      |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board or issue type not found       | Standard error response.      |
| 409    | Issue type name already exists      | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `IssueType`
- Invalidate after mutation: issue types by board id, cards/board detail if issue type is rendered there.

## DELETE /v1/boards/:id/issue-types/:issueTypeId

### Summary

Soft delete a board issue type.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field       | Type   | Notes          |
| ----------- | ------ | -------------- |
| id          | number | Board id.      |
| issueTypeId | number | Issue type id. |

Body: none.

### Success Response

Status: `200 OK`

```json
{
  "deleteResult": "Issue type deleted successfully!"
}
```

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board or issue type not found       | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `{ deleteResult: string }`
- Invalidate after mutation: issue types by board id, cards/board detail if issue type is rendered there.
