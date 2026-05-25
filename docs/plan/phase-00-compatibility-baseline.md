# Phase 00 - Compatibility baseline

## Muc tieu

Lam `be_02` tuong thich voi cach FE hien tai dang goi API truoc khi migrate cac domain service. Neu bo qua phase nay, cac module board/card co viet xong van de vo FE vi sai prefix, sai port, sai response shape hoac guard khong doc cookie.

## Hien trang can chu y

- FE goi API qua `API_ROOT = http://localhost:8017` va path `/v1/...`.
- `be_02` mac dinh dang dung `PORT=3000`, `API_PREFIX=api/v1`.
- FE dung cookie `accessToken`/`refreshToken`, khong gui Bearer header.
- FE interceptor refresh token khi BE tra HTTP `410`.
- Global `ResponseInterceptor` cua `be_02` dang boc non-paginated response thanh `{ item: data }`, trong khi FE dang expect raw data.

## Cong viec

### 1. Chot runtime local cho FE

Sua `.env` local cua `be_02`:

```env
PORT=8017
API_PREFIX=v1
FRONTEND_URL=http://localhost:3000
WEBSITE_DOMAIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

Neu can giu port 3000 cho backend moi thi phai sua FE `utils/constants.ts`, nhung muc tieu phase nay la khong sua FE.

### 2. Giu raw response cho legacy FE endpoints

Can co mot trong hai cach:

- Cach A: bo global `ResponseInterceptor` khoi `main.ts` trong giai doan migrate.
- Cach B: them decorator, vi du `@RawResponse()`, de bypass interceptor cho cac controller FE dang dung.

Khuyen nghi phase dau dung cach A cho nhanh va it rui ro voi FE. Sau khi migrate xong co the chuan hoa lai response o phase cleanup.

Endpoint can raw response:

```txt
/v1/auth/*
/v1/boards/*
/v1/columns/*
/v1/cards/*
```

### 3. JWT guard doc cookie

Update JWT strategy hoac custom extractor de doc:

```txt
req.cookies.accessToken
Authorization: Bearer <token>
```

Thu tu uu tien:

1. `accessToken` cookie, vi FE hien dung cookie.
2. Bearer token, de khong mat kha nang test bang Swagger/Postman.

### 4. Access token expired tra HTTP 410

FE dang co logic:

```txt
Neu response.status === 410 thi goi /v1/auth/refresh_token roi retry request cu.
```

Can map loi JWT expired thanh:

```json
{
  "statusCode": 410,
  "message": "Need to refresh token."
}
```

Loi token khac van tra `401`.

### 5. Them endpoint status cu

BE cu co:

```txt
GET /v1/status
```

Response:

```json
{ "message": "APIs V1 are ready to use." }
```

`be_02` hien co `/v1/health`; phase nay nen them `/v1/status` de smoke test va deploy check de hon.

### 6. Kiem tra auth contract

Auth FE hien dang goi:

```txt
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/verify-account
DELETE /v1/auth/logout
GET /v1/auth/refresh_token
```

Can dam bao:

- Register tra object co `email` de FE redirect `/login?registeredEmail=...`.
- Login tra user raw kem `accessToken`, `refreshToken`.
- Login set cookie `accessToken`, `refreshToken`.
- Refresh set lai ca access token va refresh token cookie.
- Logout clear cookies.

## Files du kien dung

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

## Kiem thu

### Command

```bash
npm run build
npx prisma validate
```

### Curl smoke test

```bash
curl http://localhost:8017/v1/status
```

Expected:

```json
{ "message": "APIs V1 are ready to use." }
```

### Auth smoke test

1. Login thanh cong set cookie.
2. Goi protected endpoint bang cookie khong co Bearer token.
3. Sua token expired de xac nhan tra `410`.
4. FE interceptor goi refresh token va retry request.

## Definition of done

- FE co the giu `API_ROOT=http://localhost:8017`.
- `/v1/status` chay.
- Auth endpoints tra raw response, khong boc `{ item: ... }`.
- Protected endpoint doc duoc `accessToken` cookie.
- JWT expired tra `410`, invalid token tra `401`.
