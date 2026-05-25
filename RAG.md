# RAG Chatbot Authorization Design

Tài liệu này mô tả thiết kế tích hợp chatbot RAG cho Medical Asset & Maintenance Management System theo mô hình:

- Frontend mở chatbot lần đầu sẽ gọi Backend để xin quyền truy cập RAG.
- Backend chỉ xác thực người dùng hiện tại và cấp một RAG access token ngắn hạn.
- Frontend dùng RAG access token đó để giao tiếp trực tiếp với RAG service.
- RAG service tự quản lý session, messages, streaming, lịch sử hội thoại và dữ liệu cần thiết cho chatbot.
- Backend không proxy streaming và không lưu chat session/chat message.

---

## Mục tiêu thiết kế

Thiết kế mới thay thế mô hình cũ `Frontend -> Backend proxy -> RAG`.

Mô hình mong muốn:

```text
Frontend
  | 1. JWT của hệ thống
  v
Backend
  | 2. Xác thực JWT, kiểm tra role/permission
  | 3. Cấp RAG token ngắn hạn
  v
Frontend
  | 4. Authorization: Bearer <rag_token>
  v
RAG Service
  | 5. Tự quản session, message, streaming, persistence
  v
LLM / Vector DB / Chat DB
```

Điểm quan trọng:

- Backend là authorization broker, không phải chat proxy.
- RAG token không phải JWT đăng nhập chính của hệ thống.
- RAG token nên sống ngắn, ví dụ 5 đến 15 phút.
- RAG service phải validate token trước mọi API chat/session.
- RAG service lưu toàn bộ thông tin hội thoại, không lưu ở Backend Spring Boot.

---

## Kiến trúc tổng quan

```text
+------------------+        +-----------------------+
| Frontend Next.js |        | Backend Spring Boot   |
|                  |        |                       |
| ChatbotPanel     | -----> | POST /api/rag/token   |
|                  |  JWT   | - authenticated       |
|                  |        | - role/permission     |
+--------+---------+        | - mint RAG token      |
         |                  +-----------+-----------+
         |                              |
         |  RAG token response          |
         v                              |
+------------------+                    |
| Frontend Next.js |                    |
|                  |                    |
| Direct call to   |                    |
| RAG service      |                    |
+--------+---------+                    |
         | Authorization: Bearer <rag_token>
         v
+-------------------------------+
| RAG Service FastAPI           |
|                               |
| POST /api/chat/sessions       |
| POST /api/chat/stream         |
| GET  /api/chat/sessions/{id}  |
|                               |
| - validates RAG token         |
| - owns session/message state  |
| - streams answer              |
| - persists chat history       |
+-------------------------------+
```

---

## Data Flow

### 1. Người dùng mở chatbot lần đầu

Frontend đang có session đăng nhập của hệ thống, trong đó có `accessToken` do Backend cấp.

Frontend gọi:

```http
POST /api/rag/token
Authorization: Bearer <system_access_token>
```

Backend:

- Xác thực JWT hiện tại.
- Lấy `username`, `role`, có thể thêm `departmentId` nếu hệ thống có.
- Kiểm tra user có quyền dùng chatbot hay không.
- Tạo RAG token ngắn hạn.
- Trả về URL RAG public và token.

Response:

```json
{
  "ragBaseUrl": "http://localhost:5000",
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "user": {
    "username": "doctor",
    "role": "DOCTOR"
  }
}
```

### 2. Frontend tạo hoặc mở lại chat session

Frontend gọi trực tiếp RAG:

```http
POST http://localhost:5000/api/chat/sessions
Authorization: Bearer <rag_access_token>
Content-Type: application/json
```

RAG tạo session và lưu ở database của RAG.

Response:

```json
{
  "sessionId": "rag_session_01HX...",
  "title": "New chat",
  "createdAt": "2026-05-25T10:00:00Z"
}
```

### 3. Frontend gửi message và nhận streaming

Frontend gọi trực tiếp RAG:

```http
POST http://localhost:5000/api/chat/stream
Authorization: Bearer <rag_access_token>
Content-Type: application/json
Accept: text/event-stream
```

Body:

```json
{
  "sessionId": "rag_session_01HX...",
  "message": "Thiết bị nào sắp đến hạn bảo trì?"
}
```

RAG:

- Validate token.
- Kiểm tra token có được phép truy cập session này không.
- Lưu user message.
- Gọi retriever/vector DB/tools/LLM.
- Stream assistant response về frontend.
- Lưu assistant message sau khi hoàn tất.

SSE response:

```text
event: token
data: Thiết

event: token
data:  bị

event: done
data: {"messageId":"msg_01HX..."}
```

---

## Backend Scope

Backend chỉ cần các thành phần sau:

```text
backend/src/main/java/com/medical/system/
  controller/
    RagAuthController.java
  service/
    RagTokenService.java
  dto/rag/
    RagTokenResponse.java
```

Không cần các thành phần sau trong Backend:

- `ChatController`
- `RagProxyService`
- `ChatbotService`
- `ChatSession`
- `ChatMessage`
- `ChatSessionRepository`
- `ChatMessageRepository`
- WebFlux dependency chỉ để proxy stream

Backend vẫn có thể ghi audit log tối thiểu, ví dụ: user nào xin token lúc nào. Nhưng nội dung hội thoại không nằm ở Backend.

---

## Backend API

### POST `/api/rag/token`

Cấp token ngắn hạn để frontend truy cập RAG service.

Request:

```http
POST /api/rag/token
Authorization: Bearer <system_access_token>
```

Response:

```json
{
  "ragBaseUrl": "http://localhost:5000",
  "tokenType": "Bearer",
  "accessToken": "<rag_access_token>",
  "expiresIn": 900,
  "user": {
    "username": "doctor",
    "role": "DOCTOR"
  }
}
```

Quy tắc:

- Endpoint yêu cầu authenticated user.
- Token chỉ dùng cho RAG, không dùng gọi API chính của Backend.
- Token phải có claim `aud = "rag-service"` để RAG phân biệt với JWT đăng nhập chính.
- Token nên có `sub`, `role`, `scope`, `iat`, `exp`, `jti`.

Ví dụ claim:

```json
{
  "iss": "medical-backend",
  "aud": "rag-service",
  "sub": "doctor",
  "role": "DOCTOR",
  "scope": "rag:chat",
  "jti": "0f2b9f6e-9c5d-4c3e-8a3b-1d2c3f4a5b6c",
  "iat": 1779684000,
  "exp": 1779684900
}
```

---

## Backend Implementation Sketch

### `application.yml`

```yaml
rag:
  service:
    public-url: ${RAG_PUBLIC_URL:http://localhost:5000}
  jwt:
    secret: ${RAG_JWT_SECRET:change-this-to-a-long-random-secret-at-least-32-bytes}
    expiration-ms: ${RAG_JWT_EXPIRATION_MS:900000}
    issuer: medical-backend
    audience: rag-service
```

`RAG_JWT_SECRET` nên khác `JWT_SECRET` của hệ thống chính. Nếu dùng production, ưu tiên RSA key pair/JWKS thay vì shared secret.

### `RagTokenResponse.java`

```java
package com.medical.system.dto.rag;

public record RagTokenResponse(
        String ragBaseUrl,
        String tokenType,
        String accessToken,
        long expiresIn,
        RagUser user
) {
    public record RagUser(String username, String role) {
    }
}
```

### `RagTokenService.java`

```java
package com.medical.system.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class RagTokenService {

    @Value("${rag.jwt.secret}")
    private String ragJwtSecret;

    @Value("${rag.jwt.expiration-ms}")
    private long expirationMs;

    @Value("${rag.jwt.issuer}")
    private String issuer;

    @Value("${rag.jwt.audience}")
    private String audience;

    public String generateRagToken(String username, String role) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(expirationMs);

        return Jwts.builder()
                .setIssuer(issuer)
                .setAudience(audience)
                .setSubject(username)
                .claim("role", role)
                .claim("scope", "rag:chat")
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiresAt))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public long getExpiresInSeconds() {
        return expirationMs / 1000;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(ragJwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
```

### `RagAuthController.java`

```java
package com.medical.system.controller;

import com.medical.system.dto.rag.RagTokenResponse;
import com.medical.system.service.RagTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag")
public class RagAuthController {

    private final RagTokenService ragTokenService;

    @Value("${rag.service.public-url}")
    private String ragPublicUrl;

    public RagAuthController(RagTokenService ragTokenService) {
        this.ragTokenService = ragTokenService;
    }

    @PostMapping("/token")
    public RagTokenResponse issueToken(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String username = jwt.getSubject();
        String role = jwt.getClaimAsString("role");

        String ragToken = ragTokenService.generateRagToken(username, role);

        return new RagTokenResponse(
                ragPublicUrl,
                "Bearer",
                ragToken,
                ragTokenService.getExpiresInSeconds(),
                new RagTokenResponse.RagUser(username, role)
        );
    }
}
```

SecurityConfig hiện tại có `.anyRequest().authenticated()`, nên `/api/rag/token` tự động cần đăng nhập. Nếu muốn rõ ràng hơn, có thể thêm:

```java
.requestMatchers("/api/rag/**").authenticated()
```

---

## RAG Service Scope

RAG service sở hữu toàn bộ dữ liệu chatbot:

```text
rag-service/
  main.py
  auth.py
  models.py
  database.py
  services/
    chat_service.py
    retrieval_service.py
  repositories/
    session_repository.py
    message_repository.py
```

RAG nên có database riêng, ví dụ PostgreSQL hoặc MySQL riêng schema:

```text
rag_chat_sessions
  id
  user_id
  user_role
  title
  created_at
  updated_at

rag_chat_messages
  id
  session_id
  role
  content
  metadata_json
  created_at
```

Nếu muốn lưu vector/document:

```text
rag_documents
rag_document_chunks
rag_embeddings
```

Hoặc dùng vector store riêng như Qdrant, Milvus, Weaviate, pgvector.

---

## RAG API

### POST `/api/chat/sessions`

Tạo session mới.

Request:

```http
Authorization: Bearer <rag_access_token>
```

Response:

```json
{
  "sessionId": "rag_session_01HX...",
  "title": "New chat",
  "createdAt": "2026-05-25T10:00:00Z"
}
```

### GET `/api/chat/sessions`

Lấy danh sách session của user hiện tại.

### GET `/api/chat/sessions/{sessionId}/messages`

Lấy lịch sử message của session.

### POST `/api/chat/stream`

Gửi message và nhận streaming response.

Request:

```json
{
  "sessionId": "rag_session_01HX...",
  "message": "Máy X-quang nào đang cần bảo trì?",
  "context": {
    "assetId": 1
  }
}
```

Response là SSE:

```text
event: token
data: Nội

event: token
data:  dung

event: done
data: {"messageId":"msg_01HX..."}
```

---

## RAG Token Validation in FastAPI

### `.env`

```env
RAG_JWT_SECRET=change-this-to-a-long-random-secret-at-least-32-bytes
RAG_JWT_ISSUER=medical-backend
RAG_JWT_AUDIENCE=rag-service
RAG_ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_API_KEY=your-google-api-key
```

### `auth.py`

```python
import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer()


class RagPrincipal:
    def __init__(self, username: str, role: str, scope: str):
        self.username = username
        self.role = role
        self.scope = scope


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]
) -> RagPrincipal:
    try:
        payload = jwt.decode(
            credentials.credentials,
            os.environ["RAG_JWT_SECRET"],
            algorithms=["HS256"],
            issuer=os.getenv("RAG_JWT_ISSUER", "medical-backend"),
            audience=os.getenv("RAG_JWT_AUDIENCE", "rag-service"),
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid RAG token") from exc

    scope = payload.get("scope")
    if scope != "rag:chat":
        raise HTTPException(status_code=403, detail="Missing rag:chat scope")

    return RagPrincipal(
        username=payload["sub"],
        role=payload["role"],
        scope=scope,
    )
```

### `main.py`

```python
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import RagPrincipal, get_current_principal

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


class CreateSessionResponse(BaseModel):
    sessionId: str
    title: str
    createdAt: str


class ChatStreamRequest(BaseModel):
    sessionId: str
    message: str
    context: dict | None = None


@app.post("/api/chat/sessions", response_model=CreateSessionResponse)
async def create_session(
    principal: Annotated[RagPrincipal, Depends(get_current_principal)]
):
    # TODO: create session in RAG database with principal.username and principal.role
    return CreateSessionResponse(
        sessionId="rag_session_demo",
        title="New chat",
        createdAt="2026-05-25T10:00:00Z",
    )


async def stream_answer(request: ChatStreamRequest, principal: RagPrincipal):
    # TODO:
    # 1. verify session belongs to principal.username
    # 2. save user message
    # 3. run retrieval + LLM
    # 4. yield SSE tokens
    # 5. save assistant message
    yield "event: token\ndata: Xin chào\n\n"
    yield "event: done\ndata: {\"messageId\":\"msg_demo\"}\n\n"


@app.post("/api/chat/stream")
async def chat_stream(
    request: ChatStreamRequest,
    principal: Annotated[RagPrincipal, Depends(get_current_principal)],
):
    return StreamingResponse(
        stream_answer(request, principal),
        media_type="text/event-stream",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Frontend Scope

Frontend cần quản lý các state:

- `ragBaseUrl`
- `ragAccessToken`
- `ragTokenExpiresAt`
- `sessionId`
- messages hiển thị tạm thời trong UI

Nguồn dữ liệu lâu dài vẫn nằm ở RAG. Khi mở lại chatbot, frontend có thể gọi RAG để load session/messages.

### Flow trong `ChatbotPanel`

1. User click mở chatbot.
2. Nếu chưa có RAG token hoặc token sắp hết hạn, gọi Backend `/api/rag/token`.
3. Nếu chưa có session, gọi RAG `/api/chat/sessions`.
4. Khi user gửi message, gọi RAG `/api/chat/stream`.
5. Render token streaming vào UI.
6. Nếu RAG trả `401`, xin token mới từ Backend rồi retry một lần.

### Frontend implementation sketch

```typescript
type RagTokenResponse = {
  ragBaseUrl: string;
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
  user: {
    username: string;
    role: string;
  };
};

async function requestRagToken(systemAccessToken: string): Promise<RagTokenResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rag/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${systemAccessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Cannot issue RAG token");
  }

  return res.json();
}

async function createRagSession(ragBaseUrl: string, ragToken: string) {
  const res = await fetch(`${ragBaseUrl}/api/chat/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ragToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Cannot create RAG session");
  }

  return res.json() as Promise<{ sessionId: string }>;
}
```

Streaming bằng `fetch` được khuyến nghị hơn `EventSource` nếu cần gửi `Authorization` header. `EventSource` native không hỗ trợ custom headers.

```typescript
async function streamChatMessage(params: {
  ragBaseUrl: string;
  ragToken: string;
  sessionId: string;
  message: string;
  onToken: (token: string) => void;
}) {
  const res = await fetch(`${params.ragBaseUrl}/api/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.ragToken}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      sessionId: params.sessionId,
      message: params.message,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error("RAG stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) continue;
      params.onToken(dataLine.replace(/^data:\s?/, ""));
    }
  }
}
```

---

## CORS

Backend chỉ cần cho phép frontend gọi `/api/rag/token`.

RAG service phải cho phép frontend origin gọi trực tiếp:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
```

Không dùng `allow_origins=["*"]` trong production.

---

## Environment Variables

### Backend

```env
JWT_SECRET=system-login-jwt-secret
RAG_PUBLIC_URL=http://localhost:5000
RAG_JWT_SECRET=rag-token-signing-secret-at-least-32-bytes
RAG_JWT_EXPIRATION_MS=900000
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Frontend không cần hardcode RAG URL nếu Backend trả `ragBaseUrl` trong response.

### RAG

```env
RAG_JWT_SECRET=rag-token-signing-secret-at-least-32-bytes
RAG_JWT_ISSUER=medical-backend
RAG_JWT_AUDIENCE=rag-service
RAG_ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_API_KEY=your-google-api-key
```

`RAG_JWT_SECRET` ở Backend và RAG phải giống nhau nếu dùng HS256.

---

## Docker Compose Notes

RAG service cần expose port để browser gọi trực tiếp:

```yaml
rag-service:
  build:
    context: ./rag-service
  ports:
    - "5000:5000"
  environment:
    - RAG_JWT_SECRET=${RAG_JWT_SECRET}
    - RAG_JWT_ISSUER=medical-backend
    - RAG_JWT_AUDIENCE=rag-service
    - RAG_ALLOWED_ORIGINS=http://localhost:3000
    - GOOGLE_API_KEY=${GOOGLE_API_KEY}
```

Backend cần biết public URL của RAG, tức URL mà browser truy cập được:

```yaml
backend:
  environment:
    - RAG_PUBLIC_URL=http://localhost:5000
    - RAG_JWT_SECRET=${RAG_JWT_SECRET}
```

Lưu ý: `http://rag-service:5000` chỉ dùng được giữa container với container. Browser trên máy người dùng không gọi được hostname `rag-service`, nên response token cho frontend phải trả `http://localhost:5000` ở local hoặc domain public ở production.

---

## Security Checklist

- [ ] RAG token sống ngắn, ví dụ 5-15 phút.
- [ ] RAG token có `aud = rag-service`.
- [ ] RAG token có `scope = rag:chat`.
- [ ] RAG validate `iss`, `aud`, `exp`, chữ ký và scope.
- [ ] RAG kiểm tra session thuộc về `sub` trong token.
- [ ] RAG CORS chỉ allow frontend origin thật.
- [ ] Không đưa `GOOGLE_API_KEY` hoặc secret nào xuống frontend.
- [ ] Không dùng JWT đăng nhập chính để gọi trực tiếp RAG.
- [ ] Không log nội dung chat nhạy cảm ở Backend.
- [ ] Production nên cân nhắc RS256/JWKS thay vì shared secret HS256.

---

## Testing

### 1. Login lấy system JWT

```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"doctor\",\"password\":\"doctor123\"}"
```

### 2. Xin RAG token từ Backend

```bash
curl -X POST "http://localhost:8080/api/rag/token" \
  -H "Authorization: Bearer <system_access_token>"
```

### 3. Tạo RAG session trực tiếp

```bash
curl -X POST "http://localhost:5000/api/chat/sessions" \
  -H "Authorization: Bearer <rag_access_token>"
```

### 4. Test streaming trực tiếp RAG

```bash
curl -N -X POST "http://localhost:5000/api/chat/stream" \
  -H "Authorization: Bearer <rag_access_token>" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{\"sessionId\":\"rag_session_demo\",\"message\":\"Hello\"}"
```

---

## Implementation Checklist

### Backend

- [ ] Thêm `rag.*` config vào `application.yml`.
- [ ] Tạo `RagTokenResponse`.
- [ ] Tạo `RagTokenService`.
- [ ] Tạo `RagAuthController`.
- [ ] Không tạo backend proxy streaming.
- [ ] Không tạo entity/repository chat ở Backend.

### RAG

- [ ] Tạo FastAPI service.
- [ ] Tạo middleware/dependency validate RAG token.
- [ ] Tạo API session/message/stream.
- [ ] Tạo database riêng cho chat session/message.
- [ ] Kiểm tra session ownership theo `sub`.
- [ ] Cấu hình CORS cho frontend.

### Frontend

- [ ] Khi mở chatbot lần đầu, gọi `/api/rag/token`.
- [ ] Lưu token trong React state hoặc memory store, không cần localStorage nếu không cần persistence.
- [ ] Gọi RAG trực tiếp bằng `Authorization: Bearer <rag_token>`.
- [ ] Dùng `fetch` streaming thay vì native `EventSource` nếu cần gửi Authorization header.
- [ ] Khi token hết hạn, xin token mới và retry một lần.

---

## Kết luận

Thiết kế đúng với yêu cầu là Backend chỉ cấp quyền truy cập RAG. Frontend sau đó giao tiếp trực tiếp với RAG bằng RAG token ngắn hạn. RAG là service sở hữu toàn bộ state của chatbot: session, messages, lịch sử hội thoại, truy xuất tài liệu và streaming response.
