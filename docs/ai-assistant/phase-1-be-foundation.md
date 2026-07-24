# Phase 1 — Nền tảng BE (+ LlmProvider adapter)

**Mục tiêu:** Dựng module `ai-assistant`, cấu hình Gemini key, định nghĩa **interface `LlmProvider`**
(để sau đổi sang Claude dễ), viết `GeminiProvider`, và endpoint `POST /v1/ai/chat` trả lời bằng SSE —
chưa có tool, chỉ chat "echo" qua Gemini để chứng minh luồng hoạt động end-to-end.

**Phụ thuộc:** không. **Ước tính:** nhỏ–vừa.

---

## Việc cần làm

### 1.1 Cài SDK
```bash
cd backlog-be
npm install @google/genai
```
> Lưu ý: dùng `@google/genai` (SDK mới), KHÔNG phải `@google/generative-ai` (đã deprecated).

### 1.2 Config
- Thêm vào `.env` và `.env.example`:
  ```
  AI_PROVIDER=gemini          # sau này đổi thành "claude"
  GEMINI_API_KEY=
  AI_MODEL=gemini-2.5-flash
  ```
- Tạo `src/config/ai.config.ts` (namespace `ai`), theo mẫu `src/config/*.config.ts`:
  ```ts
  import { registerAs } from '@nestjs/config';
  export default registerAs('ai', () => ({
    provider: process.env.AI_PROVIDER ?? 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY, // để trống bây giờ, dùng khi đổi Claude
    model: process.env.AI_MODEL ?? 'gemini-2.5-flash',
  }));
  ```
- `src/app.module.ts`: thêm `aiConfig` vào `load: [...]` + Joi (`GEMINI_API_KEY: Joi.string().required()`
  khi `AI_PROVIDER=gemini`).

### 1.3 Interface `LlmProvider` (điểm mấu chốt để swap sau)
`src/modules/ai-assistant/llm/llm-provider.interface.ts`:
```ts
// Tool trung lập — KHÔNG phụ thuộc provider nào
export interface LlmTool {
  name: string;
  description: string;
  schema: Record<string, any>;                 // JSON schema cho params
  run: (input: any) => Promise<unknown>;        // gọi service NestJS
}

export interface LlmStreamChat {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  tools: LlmTool[];
  onToken: (text: string) => void;              // đẩy token ra SSE
}

export abstract class LlmProvider {
  abstract streamChat(opts: LlmStreamChat): Promise<void>;  // tự lo vòng lặp gọi tool
}
```
> Vòng lặp function-calling nằm TRONG provider (mỗi provider có cú pháp riêng). Tools thì trung lập.

### 1.4 `GeminiProvider`
`src/modules/ai-assistant/llm/gemini.provider.ts` (Phase 1 chỉ cần chat, chưa tool):
```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: this.config.getOrThrow('ai.geminiApiKey') });
const stream = await ai.models.generateContentStream({
  model: this.config.get('ai.model'),           // gemini-2.5-flash
  contents: mapMessages(opts.messages),          // {role, parts:[{text}]}[]
  config: { systemInstruction: opts.system },
});
for await (const chunk of stream) {
  if (chunk.text) opts.onToken(chunk.text);
}
```
> Vòng lặp function-calling (nhận `response.functionCalls`, chạy `tool.run`, gửi lại `functionResponse`)
> sẽ thêm ở **Phase 2**. Phase 1 chỉ stream text.

### 1.5 Provider factory
`src/modules/ai-assistant/llm/llm.factory.ts`: chọn provider theo `ai.provider`
(`'gemini'` → GeminiProvider; sau thêm `'claude'` → ClaudeProvider). Đăng ký DI trong module.

### 1.6 Controller + service
- `src/modules/ai-assistant/ai-chat.controller.ts`:
  ```ts
  @Controller('ai')
  export class AiChatController {
    constructor(private readonly aiChat: AiChatService) {}
    @Post('chat')
    async chat(@CurrentUser() user: JwtPayload, @Body() dto: AiChatRequestDto, @Res() res: Response) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      await this.aiChat.streamChat(user, dto, res);
    }
  }
  ```
  - Auth tự động qua `JwtAuthGuard` global (`src/common/common.module.ts`).
- `src/modules/ai-assistant/ai-chat.service.ts`: `ensureMember(dto.boardId, user.userId)` (chặn ngoài board),
  build tools (Phase 2), gọi `this.llm.streamChat({ system, messages, tools, onToken: t => res.write(...) })`,
  kết thúc `res.write('data: [DONE]\n\n'); res.end();`.

### 1.7 DTO
- `src/modules/ai-assistant/dto/ai-chat.dto.ts`: `AiChatRequestDto` — `boardId` (int ≥1),
  `messages` (`{role, content}[]`). class-validator (whitelist global → field lạ bị 400).

---

## Files đụng tới
- `backlog-be/package.json`, `.env`, `.env.example`
- `backlog-be/src/config/ai.config.ts` (mới)
- `backlog-be/src/app.module.ts`
- `backlog-be/src/modules/ai-assistant/` (mới: module, controller, service, dto, `llm/` gồm interface + gemini.provider + factory)

## Acceptance criteria
- [ ] `POST /v1/ai/chat` với cookie hợp lệ + messages → stream SSE token text từ Gemini.
- [ ] User không phải member của board → 403 (`ensureMember`).
- [ ] Thiếu `GEMINI_API_KEY` → app fail sớm ở boot (Joi).
- [ ] Đổi `AI_PROVIDER` sẽ chọn đúng provider qua factory (Claude chưa có, chỉ cần khung).

## Rủi ro
- CORS + cookie cho SSE: BE đã bật CORS credentials (`main.ts`) — đảm bảo origin FE khớp.
- `TimeoutInterceptor` global (`main.ts`) có thể cắt SSE — loại route `/ai/chat` khỏi interceptor nếu cần.
