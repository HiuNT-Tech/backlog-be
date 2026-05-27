# Status API

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
  "status": "ok"
}
```

Field notes:

| Field  | Type   | Nullable | Notes                  |
| ------ | ------ | -------- | ---------------------- |
| status | string | no       | Overall health status. |

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
  "status": "ok"
}
```
