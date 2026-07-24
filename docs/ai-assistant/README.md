# AI Assistant — Kế hoạch triển khai

> Lập ngày 2026-07-24. Đã verify bằng code thực tế của cả FE và BE (không suy đoán).
> Cú pháp SDK Gemini đã tra tài liệu mới nhất (`@google/genai`) qua context7.
> Folder plan chi tiết, mỗi phase một file. Đọc file này trước để nắm tổng thể.

Mục tiêu: một trợ lý AI hội thoại giúp người dùng **điều tra/thống kê, tìm kiếm, và tạo/sửa/xoá ticket**
bằng ngôn ngữ tự nhiên, **tôn trọng đúng phân quyền board hiện có**.

## Quyết định đã chốt
| Hạng mục | Lựa chọn |
|---|---|
| Phạm vi | Full CRUD (search + thống kê + tạo + sửa + **xoá**) |
| Provider (tạm) | **Google Gemini** — `gemini-2.5-flash` (free tier) |
| Kế hoạch tương lai | **Sẽ đổi sang Claude API** khi có điều kiện → thiết kế adapter để swap dễ |
| UI | Trang riêng `/assistant` per-board |
| Nơi chạy agent | **BE (NestJS)**, không phải FE |

## Nguyên tắc thiết kế cốt lõi: LLM là adapter tách rời
Vì sẽ đổi Gemini → Claude sau, **toàn bộ logic gắn với LLM gói trong một interface `LlmProvider`**.
Tools, service, phân quyền, FE, statistics… **hoàn toàn không biết** đang dùng provider nào.
Đổi provider = viết 1 file adapter mới + đổi 1 biến env. Không đụng phần còn lại.

```
                         ┌──────────────────────────────────────────┐
tools (neutral)  ──────► │  LlmProvider (interface)                  │
{name, desc, schema, run}│    ├─ GeminiProvider   (dùng bây giờ)     │
                         │    └─ ClaudeProvider   (thêm sau)         │
                         └──────────────────────────────────────────┘
```

## Kiến trúc (1 dòng)
Agent chạy ở BE trong module `ai-assistant`; `AiChatService` gọi `LlmProvider` (hiện là Gemini);
mỗi tool map thẳng vào service hiện có và đi qua `BoardAccessService` để tôn trọng role;
FE là trang `/assistant` nhận trả lời qua **SSE**, render markdown.

```
FE (Next.js 16)                          BE (NestJS 11) — module `ai-assistant`
app/(main)/project/[projectId]/assistant  POST /v1/ai/chat (SSE)
  → fetch + ReadableStream (cookie auth)  → AiChatService → LlmProvider (Gemini)
  → react-markdown                            tools → CardsService / BoardsService
                                                    → BoardAccessService (ensureMember/ensureRole)
```

## Các phase
| Phase | File | Nội dung | Phụ thuộc |
|---|---|---|---|
| 1 | [phase-1-be-foundation.md](phase-1-be-foundation.md) | Module `ai-assistant` + config + `LlmProvider` interface + GeminiProvider + endpoint `/ai/chat` (chat echo) | — |
| 2 | [phase-2-tools-readonly.md](phase-2-tools-readonly.md) | Vòng lặp function-calling + tools read-only: `search_cards`, `get_board_context`, `get_statistics` | Phase 1 |
| 3 | [phase-3-tools-write.md](phase-3-tools-write.md) | Tools ghi: `create_card`, `update_card` | Phase 2 |
| 4 | [phase-4-delete.md](phase-4-delete.md) | Endpoint `DELETE cards/:id` (MỚI) + tool `delete_card` + confirm flow | Phase 3 |
| 5 | [phase-5-frontend.md](phase-5-frontend.md) | Trang `/assistant` + hook `use-ai-chat` (SSE) + gate role + i18n | Phase 1 (song song 2–4) |
| 6 | [phase-6-polish.md](phase-6-polish.md) | Lịch sử hội thoại, xử lý lỗi, tinh chỉnh prompt, test, **adapter đổi sang Claude** | Phase 2–5 |

## Domain facts (bắt buộc nhớ khi code)
- **Không có field "status"** — status của card = `column` (columns có `title` + `statusColor`).
- `priority` là `Int?` thô: **1=LOW, 2=MEDIUM, 3=HIGH** (`src/common/enums/priority.enum.ts`).
- "Quá hạn" = `dueDate < now` AND card không ở cột done (done nhận biết qua `column.title`, không có cờ).
- `estimatedHours`/`actualHours` lưu dạng **string** — parse cẩn thận khi thống kê.
- Response bọc single resource trong `{item}`, list là `{items, total}` (ResponseInterceptor).
- Base URL BE: `http://localhost:8017/v1` (prefix `v1`, port 8017).
- **BE hiện CHƯA có endpoint xoá card** — phải build ở Phase 4.
- FE dùng **pnpm**; BE dùng **npm**.

## Phân quyền (bám memory fe-be-permission-mismatch)
- `BOARD_CONTRIBUTOR_ROLES = [ADMIN, PM, MEMBER]` (`board-access.service.ts:17`) → **GUEST read-only**.
- `BOARD_MANAGER_ROLES = [ADMIN, PM]` (`board-access.service.ts:8`).
- Read: `ensureMember`. Write (create/update/delete card): `ensureRole(..., BOARD_CONTRIBUTOR_ROLES)`.
- Agent chạy dưới danh tính user hiện tại (`@CurrentUser()` → `userId`). **Không bao giờ bypass.**

## Provider hiện tại: Gemini (`@google/genai`)
- Lấy API key **miễn phí** ở Google AI Studio (aistudio.google.com), không cần thẻ.
- Client: `new GoogleGenAI({ apiKey })`. Model: `gemini-2.5-flash` (free tier, hỗ trợ function calling + streaming).
- ⚠️ **Riêng tư free tier:** Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm. App gửi dữ liệu ticket thật
  → cân nhắc. Tier trả phí thì không. Với data demo/nội bộ thường chấp nhận được.
- Rate limit free tier có giới hạn requests/phút & tokens/ngày nhưng rộng cho dev.

## Đổi sang Claude sau này (đã thiết kế sẵn)
Khi có điều kiện, chỉ cần: (1) viết `ClaudeProvider` implement `LlmProvider` (dùng `@anthropic-ai/sdk`
+ Tool Runner), (2) đổi env `AI_PROVIDER=claude` + thêm `ANTHROPIC_API_KEY`. Chi tiết ở Phase 6.
