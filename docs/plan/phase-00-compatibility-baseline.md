# Phase 00 - Nền tảng tương thích

## Mục tiêu

Làm `be_02` tương thích với nền tảng runtime FE đang dùng trước khi triển khai các domain service: prefix, port, cookie auth, refresh-token retry và status endpoint. Domain response không giữ Mongo-style legacy; các phase sau dùng contract mới `id`/`position`.

## Hiện trạng cần chú ý

- FE gọi API qua `API_ROOT`/env trỏ `http://localhost:8017` và path `/v1/...`.
- `be_02` mặc định đang dùng `PORT=3000`, `API_PREFIX=api/v1`.
- FE dùng cookie `accessToken`/`refreshToken`, không gửi Bearer header.
- FE interceptor refresh token khi BE trả HTTP `410`.
- Global `ResponseInterceptor` của `be_02` đang bọc non-paginated response thành `{ item: data }`, trong khi FE đang expect raw data.

## Công việc

### [x] 1. Chốt runtime local cho FE

Sửa `.env` local của `be_02`:

```env
PORT=8017
API_PREFIX=v1
FRONTEND_URL=http://localhost:3000
WEBSITE_DOMAIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

Nếu FE đổi cách cấu hình API root thì vẫn giữ base URL trỏ về `http://localhost:8017` trong local.

### [x] 2. Giữ raw response cho domain endpoints

Cần có một trong hai cách:

- Cách A: bỏ global `ResponseInterceptor` khỏi `main.ts` trong giai đoạn triển khai domain.
- Cách B: thêm decorator, ví dụ `@RawResponse()`, để bypass interceptor cho các controller FE đang dùng.

Khuyến nghị phase đầu dùng cách A cho nhanh và ít rủi ro. Sau khi domain chạy ổn có thể chuẩn hóa lại response envelope ở phase cleanup.

Endpoint cần raw response:

```txt
/v1/auth/*
/v1/boards/*
/v1/columns/*
/v1/cards/*
```

### [x] 3. JWT guard đọc cookie

Update JWT strategy hoặc custom extractor để đọc:

```txt
req.cookies.accessToken
Authorization: Bearer <token>
```

Thứ tự ưu tiên:

1. `accessToken` cookie, vì FE hiện dùng cookie.
2. Bearer token, để không mất khả năng test bằng Swagger/Postman.

### [x] 4. Access token expired trả HTTP 410

FE đang có logic:

```txt
Nếu response.status === 410 thì gọi /v1/auth/refresh_token rồi retry request cũ.
```

Cần map lỗi JWT expired thành:

```json
{
  "statusCode": 410,
  "message": "Need to refresh token."
}
```

Lỗi token khác vẫn trả `401`.

### [x] 5. Thêm endpoint status cũ

BE cũ có:

```txt
GET /v1/status
```

Response:

```json
{ "message": "APIs V1 are ready to use." }
```

`be_02` hiện có `/v1/health`; phase này nên thêm `/v1/status` để smoke test và deploy check dễ hơn.

### [x] 6. Kiểm tra auth contract

Auth FE hiện đang gọi:

```txt
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/verify-account
DELETE /v1/auth/logout
GET /v1/auth/refresh_token
```

Cần đảm bảo:

- Register trả object có `email` để FE redirect `/login?registeredEmail=...`.
- Login trả user raw kèm `accessToken`, `refreshToken`.
- Login set cookie `accessToken`, `refreshToken`.
- Refresh set lại cả access token và refresh token cookie.
- Logout clear cookies.

## File dự kiến đụng

```txt
src/main.ts
src/app.controller.ts
src/modules/health/health.controller.ts
src/common/interceptors/response.interceptor.ts
src/common/guards/jwt-auth.guard.ts
src/modules/auth/strategies/jwt.strategy.ts
src/modules/auth/auth.controller.ts
src/config/app.config.ts
.env
.env.example
```

## Kiểm thử

### Command

```bash
npm run build
npx prisma validate
```

### Curl smoke test

```bash
curl http://localhost:8017/v1/status
```

Kỳ vọng:

```json
{ "message": "APIs V1 are ready to use." }
```

### Auth smoke test

1. Login thành công set cookie.
2. Gọi protected endpoint bằng cookie không có Bearer token.
3. Sửa token expired để xác nhận trả `410`.
4. FE interceptor gọi refresh token và retry request.

## Tiêu chí hoàn tất

- FE có thể giữ `API_ROOT=http://localhost:8017`.
- `/v1/status` chạy.
- Auth endpoints trả raw response, không bọc `{ item: ... }`.
- Protected endpoint đọc được `accessToken` cookie.
- JWT expired trả `410`, invalid token trả `401`.


## Progress Summary

- **Tasks Completed:** 6/6
- **Status:** Done
