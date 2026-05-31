# Status API

## GET /v1

### Summary

Return a minimal API reachability payload.

### Auth

- Required: no
- Mechanism: public
- Permission: none

### Request

Path params: none.

Query params: none.

Body: none.

Validation: none.

### Success Response

Status: `200 OK`

```json
{
  "status": "ok"
}
```

### Error Responses

| Status | When                                | Response notes                            |
| ------ | ----------------------------------- | ----------------------------------------- |
| 500    | API process has an unexpected error | Standard error response with `requestId`. |

### FE Integration

- Interface: inline `{ status: "ok" }`
- API function: root smoke test only
- Query key: none
- Invalidate after mutation: none
- Screens: dev health check, deployment smoke test

## GET /v1/status

### Summary

Smoke-test endpoint for FE/dev tooling to confirm the API v1 process is reachable.

### Auth

- Required: no
- Mechanism: public
- Permission: none

### Request

Path params: none.

Query params: none.

Body: none.

Validation: none.

### Success Response

Status: `200 OK`

```json
{
  "message": "APIs V1 are ready to use."
}
```

Field notes:

| Field   | Type   | Nullable | Notes                  |
| ------- | ------ | -------- | ---------------------- |
| message | string | no       | Static status message. |

### Error Responses

| Status | When                                | Response notes                            |
| ------ | ----------------------------------- | ----------------------------------------- |
| 500    | API process has an unexpected error | Standard error response with `requestId`. |

### FE Integration

- Interface: inline `{ message: string }`
- API function: health/status smoke test only
- Query key: none
- Invalidate after mutation: none
- Screens: dev health check, deployment smoke test

### Examples

Request:

```bash
curl http://localhost:8017/v1/status
```

Response:

```json
{
  "message": "APIs V1 are ready to use."
}
```

## GET /v1/health

### Summary

Health endpoint for checking service dependencies.

### Auth

- Required: no
- Mechanism: public
- Permission: none

### Request

Path params: none.

Query params: none.

Body: none.

Validation: none.

### Success Response

Status: `200 OK`

Response shape is owned by `HealthService`.

```json
{
  "status": "ok",
  "timestamp": "2026-05-31T00:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "postgres": "up",
    "redis": "up"
  }
}
```

Field notes:

| Field             | Type   | Nullable | Notes                        |
| ----------------- | ------ | -------- | ---------------------------- |
| status            | string | no       | `ok` when dependencies pass. |
| timestamp         | string | no       | ISO timestamp.               |
| uptime            | number | no       | Process uptime in seconds.   |
| services.postgres | string | no       | `up` or `down`.              |
| services.redis    | string | no       | `up` or `down`.              |

### Error Responses

| Status | When                                | Response notes                            |
| ------ | ----------------------------------- | ----------------------------------------- |
| 500    | Dependency check fails unexpectedly | Standard error response with `requestId`. |

### FE Integration

- Interface: health-check only
- API function: deployment/ops smoke test only
- Query key: none
- Invalidate after mutation: none
- Screens: none

### Examples

Request:

```bash
curl http://localhost:8017/v1/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-31T00:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "postgres": "up",
    "redis": "up"
  }
}
```
