# API docs contract

This folder is the BE/FE API contract source for the backlog domain.

Swagger is enabled outside production:

```txt
Swagger UI: http://localhost:8017/docs
OpenAPI JSON: http://localhost:8017/docs-json
API server: http://localhost:8017/v1
```

Rules:

- One Markdown file per API domain.
- One endpoint section per route using `## METHOD /v1/path`.
- Every endpoint must document request payload, response payload, errors, and FE integration notes.
- Swagger decorators and Markdown docs must describe the same request/response contract.
- Use clean contract fields: `id`, `position`, `PUBLIC | PRIVATE`, `ADMIN | PM | MEMBER | GUEST`.
- Use `boardCode` for project keys and `cardCode` for issue keys such as `PIPC-4119`.
- Do not document legacy `_id`, `columnOrderIds`, or `cardOrderIds` unless explicitly describing removed behavior.

Validation:

```bash
python /home/hiunt/Documents/Backlog/.codex/skills/api-docs-contract/scripts/check_api_docs.py /home/hiunt/Documents/Backlog/be_02/docs/api
```
