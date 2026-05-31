# Versions API

All version endpoints require an authenticated user via `accessToken` cookie or Bearer token.

## GET /v1/boards/:id/versions

### Summary

Return paginated active versions for a board.

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

| Field   | Type   | Required | Default | Notes                   |
| ------- | ------ | -------- | ------- | ----------------------- |
| keyword | string | no       | none    | Search by version name. |
| skip    | number | no       | `0`     | Offset, minimum `0`.    |
| limit   | number | no       | `10`    | Page size, 1..100.      |

Body: none.

### Success Response

Status: `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "boardId": 1,
      "name": "v1.0",
      "startDate": "2026-05-25T00:00:00.000Z",
      "endDate": "2026-05-30T00:00:00.000Z",
      "description": "",
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

- Interface: `{ items: Version[]; count: number }`
- Query key: versions by board id and filters.

## POST /v1/boards/:id/versions

### Summary

Create a board version or milestone.

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
  "name": "v1.0",
  "startDate": "2026-05-25",
  "endDate": "2026-05-30",
  "description": ""
}
```

Validation:

- `name`: string, 3..50.
- `startDate`: optional ISO date string.
- `endDate`: optional ISO date string.
- `startDate` must be before or equal `endDate` when both are provided.
- `description`: optional string, max 500.

### Success Response

Status: `201 Created`

Returns the created version.

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 400    | Invalid payload or date range       | Standard error response.      |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board not found                     | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `Version`
- Invalidate after mutation: versions by board id, board detail/cards if version filters are shown.

## GET /v1/boards/:id/versions/:versionId

### Summary

Return a single board version by id.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board member

### Request

Path params:

| Field     | Type   | Notes       |
| --------- | ------ | ----------- |
| id        | number | Board id.   |
| versionId | number | Version id. |

Body: none.

### Success Response

Status: `200 OK`

Returns the version detail.

### Error Responses

| Status | When                               | Response notes                |
| ------ | ---------------------------------- | ----------------------------- |
| 401    | Missing or invalid access token    | Standard error response.      |
| 403    | Current user is not a board member | Standard error response.      |
| 404    | Board or version not found         | Standard error response.      |
| 410    | Access token expired               | FE should refresh then retry. |

### FE Integration

- Interface: `Version`
- Query key: version by board id and version id.

## PUT /v1/boards/:id/versions/:versionId

### Summary

Update mutable version fields.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field     | Type   | Notes       |
| --------- | ------ | ----------- |
| id        | number | Board id.   |
| versionId | number | Version id. |

Body:

```json
{
  "name": "v1.1",
  "startDate": "2026-06-01",
  "endDate": "2026-06-15",
  "description": "Sprint scope"
}
```

All body fields are optional. Validation is the same as create.

### Success Response

Status: `200 OK`

Returns the updated version.

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 400    | Invalid payload or date range       | Standard error response.      |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board or version not found          | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `Version`
- Invalidate after mutation: versions by board id, version detail.

## DELETE /v1/boards/:id/versions/:versionId

### Summary

Soft delete a board version.

### Auth

- Required: yes
- Mechanism: `accessToken` cookie or Bearer token
- Permission: board `ADMIN` or `PM`

### Request

Path params:

| Field     | Type   | Notes       |
| --------- | ------ | ----------- |
| id        | number | Board id.   |
| versionId | number | Version id. |

Body: none.

### Success Response

Status: `200 OK`

```json
{
  "deleteResult": "Version deleted successfully!"
}
```

### Error Responses

| Status | When                                | Response notes                |
| ------ | ----------------------------------- | ----------------------------- |
| 401    | Missing or invalid access token     | Standard error response.      |
| 403    | Current user is not `ADMIN` or `PM` | Standard error response.      |
| 404    | Board or version not found          | Standard error response.      |
| 410    | Access token expired                | FE should refresh then retry. |

### FE Integration

- Interface: `{ deleteResult: string }`
- Invalidate after mutation: versions by board id, board detail/cards if version filters are shown.
