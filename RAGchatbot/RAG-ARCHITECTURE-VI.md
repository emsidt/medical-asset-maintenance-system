# 🏗️ Kiến Trúc Hệ Thống RAG Chatbot - Quản Lý Bảo Trì Thiết Bị Y Tế

> Tài liệu mô tả chi tiết kiến trúc và các luồng xử lý (flow) của hệ thống RAG Chatbot,
> dựa trên mã nguồn thực tế tại repository `RAGchatbot/`.

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Công Nghệ Sử Dụng](#2-công-nghệ-sử-dụng)
3. [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4. [Sơ Đồ Kiến Trúc Tổng Quan](#4-sơ-đồ-kiến-trúc-tổng-quan)
5. [Luồng Khởi Động Ứng Dụng](#5-luồng-khởi-động-ứng-dụng)
6. [Luồng Xác Thực (Authentication)](#6-luồng-xác-thực-authentication)
7. [Luồng Tạo Phiên Chat](#7-luồng-tạo-phiên-chat)
8. [Luồng Xử Lý Tin Nhắn (Core Flow)](#8-luồng-xử-lý-tin-nhắn-core-flow)
9. [Luồng Phân Loại Ý Định (Intent Classification)](#9-luồng-phân-loại-ý-định-intent-classification)
10. [Luồng RAG - Hỏi Đáp Quy Trình (Q_AND_A)](#10-luồng-rag---hỏi-đáp-quy-trình-q_and_a)
11. [Luồng Tra Cứu Sửa Chữa (REPAIR_STATUS)](#11-luồng-tra-cứu-sửa-chữa-repair_status)
12. [Luồng Báo Hỏng Thiết Bị (CREATE_REPAIR_REQUEST)](#12-luồng-báo-hỏng-thiết-bị-create_repair_request)
13. [Luồng Chat Tự Do (GENERAL)](#13-luồng-chat-tự-do-general)
14. [Luồng Nạp Dữ Liệu (Data Ingestion)](#14-luồng-nạp-dữ-liệu-data-ingestion)
15. [Mô Hình Dữ Liệu](#15-mô-hình-dữ-liệu)
16. [Phân Quyền RBAC](#16-phân-quyền-rbac)
17. [Biến Môi Trường](#17-biến-môi-trường)
18. [Ranh Giới Module](#18-ranh-giới-module)

---

## 1. Tổng Quan Hệ Thống

Hệ thống là một **RAG Chatbot thông minh** phục vụ quản lý bảo trì thiết bị y tế trong bệnh viện, được xây dựng trên FastAPI với kiến trúc **Intent-based Routing** (định tuyến dựa trên ý định).

### Bốn chức năng nghiệp vụ chính:

| # | Ý Định (Intent) | Mô Tả |
|---|---|---|
| 1 | **Q_AND_A** | Hỏi đáp quy trình kỹ thuật, hướng dẫn sử dụng thiết bị dựa trên tài liệu (RAG thực thụ) |
| 2 | **REPAIR_STATUS** | Tra cứu trạng thái sửa chữa thiết bị từ cơ sở dữ liệu MySQL (có phân quyền RBAC) |
| 3 | **CREATE_REPAIR_REQUEST** | Tạo phiếu báo hỏng thiết bị trực tiếp qua chat |
| 4 | **GENERAL** | Chào hỏi, trò chuyện tự do, giới thiệu chức năng chatbot |

---

## 2. Công Nghệ Sử Dụng

| Thành Phần | Công Nghệ |
|---|---|
| Web Framework | **FastAPI** |
| ASGI Server | **Uvicorn** |
| LLM Provider | **Google Gemini** (`gemini-2.5-flash`) via `langchain-google-genai` |
| Intent Classifier | **Gemini** (JSON mode, `temperature=0.0`) |
| Embedding Model | **HuggingFace** `sentence-transformers/all-MiniLM-L6-v2` |
| Vector Store | **ChromaDB** (persistent, top-k=5) |
| Relational DB | **MySQL** via SQLAlchemy Async + `aiomysql` |
| Authentication | **JWT Bearer** (HS256, scope `rag:chat`) |
| Streaming | **Server-Sent Events (SSE)** |
| Schema Validation | **Pydantic** |

---

## 3. Cấu Trúc Thư Mục

```
RAGchatbot/
├── app/
│   ├── __main__.py               # Entry point FastAPI, lifespan, include router
│   ├── init_db.py                # Khởi tạo bảng database khi startup
│   ├── api/
│   │   └── chat_routes.py        # POST /sessions và POST /stream
│   ├── auth/
│   │   └── auth.py               # JWT Bearer xác thực, RagPrincipal
│   ├── core/
│   │   ├── config.py             # Load GOOGLE_API_KEY từ .env
│   │   ├── database.py           # Async SQLAlchemy engine/session
│   │   ├── prompt.py             # Prompt template RAG cho Q_AND_A
│   │   └── security.py
│   ├── models/
│   │   ├── chat_session.py       # Model: rag_chat_sessions
│   │   └── chat_message.py       # Model: rag_chat_messages
│   ├── repositories/
│   │   ├── session_repository.py # CRUD phiên chat
│   │   └── message_repository.py # CRUD tin nhắn
│   ├── schemas/
│   │   ├── chat.py               # ChatStreamRequest
│   │   └── session.py            # CreateSessionResponse
│   └── services/
│       ├── chat_service.py       # Điều phối: lưu tin nhắn + stream SSE
│       ├── rag_service.py        # Dispatcher trung tâm: phân loại → xử lý → LLM
│       ├── router_service.py     # Phân loại ý định (Intent Classifier) bằng Gemini
│       ├── db_query_service.py   # Truy vấn MySQL: thiết bị, phiếu sửa chữa, RBAC
│       ├── llm_service.py        # Khởi tạo Gemini LLM client
│       ├── retriever_service.py  # ChromaDB retriever (top-k=5)
│       └── embedding_service.py  # HuggingFace embedding + Chroma vector store
├── data/
│   ├── failure-QA-data/          # CSV dữ liệu hỏi đáp lỗi thiết bị
│   └── system-guide-data/        # CSV dữ liệu hướng dẫn hệ thống
├── scripts/
│   └── ingest_csv.py             # Script nạp dữ liệu CSV → ChromaDB
├── vector_db/                    # ChromaDB persistent storage
├── requirements.txt
└── .env
```

---

## 4. Sơ Đồ Kiến Trúc Tổng Quan

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client / Frontend"]
        FE["Giao diện người dùng"]
    end

    subgraph FASTAPI["⚡ FastAPI Server"]
        direction TB
        ROUTES["API Layer<br/>chat_routes.py"]
        AUTH["Auth Layer<br/>JWT Bearer HS256"]
        
        subgraph SERVICES["📦 Service Layer"]
            direction TB
            CHAT_SVC["chat_service.py<br/>Điều phối SSE Stream"]
            RAG_SVC["rag_service.py<br/>Dispatcher Trung Tâm"]
            ROUTER_SVC["router_service.py<br/>Intent Classifier"]
            DB_QUERY_SVC["db_query_service.py<br/>Truy vấn CSDL"]
            LLM_SVC["llm_service.py<br/>Gemini Client"]
            RETRIEVER_SVC["retriever_service.py<br/>ChromaDB Retriever"]
        end

        subgraph REPOS["📂 Repository Layer"]
            SESSION_REPO["session_repository.py"]
            MESSAGE_REPO["message_repository.py"]
        end
    end

    subgraph EXTERNAL["🌐 Dịch Vụ Bên Ngoài"]
        GEMINI["Google Gemini API<br/>gemini-2.5-flash"]
    end

    subgraph DATA["💾 Tầng Lưu Trữ"]
        MYSQL[("MySQL<br/>rag_chat_sessions<br/>rag_chat_messages<br/>assets<br/>service_requests<br/>users")]
        CHROMA[("ChromaDB<br/>Vector Store<br/>FAQ & Hướng dẫn")]
    end

    FE -->|"POST /sessions<br/>POST /stream<br/>+ Bearer JWT"| ROUTES
    ROUTES --> AUTH
    AUTH --> CHAT_SVC
    CHAT_SVC --> RAG_SVC
    RAG_SVC --> ROUTER_SVC
    ROUTER_SVC -->|"Phân loại Intent"| GEMINI
    RAG_SVC -->|"Q_AND_A"| RETRIEVER_SVC
    RAG_SVC -->|"REPAIR_STATUS<br/>CREATE_REPAIR_REQUEST"| DB_QUERY_SVC
    RAG_SVC -->|"Stream tokens"| LLM_SVC
    LLM_SVC --> GEMINI
    RETRIEVER_SVC --> CHROMA
    DB_QUERY_SVC --> MYSQL
    CHAT_SVC --> MESSAGE_REPO
    CHAT_SVC --> SESSION_REPO
    MESSAGE_REPO --> MYSQL
    SESSION_REPO --> MYSQL

    style CLIENT fill:#1a1a2e,stroke:#e94560,color:#fff
    style FASTAPI fill:#16213e,stroke:#0f3460,color:#fff
    style SERVICES fill:#0f3460,stroke:#533483,color:#fff
    style REPOS fill:#0f3460,stroke:#533483,color:#fff
    style EXTERNAL fill:#533483,stroke:#e94560,color:#fff
    style DATA fill:#1a1a2e,stroke:#e94560,color:#fff
```

---

## 5. Luồng Khởi Động Ứng Dụng

```mermaid
sequenceDiagram
    participant UV as Uvicorn
    participant APP as FastAPI App
    participant LS as Lifespan
    participant DB as MySQL
    participant EMB as Embedding Model
    participant VDB as ChromaDB

    UV->>APP: Khởi động ứng dụng
    APP->>LS: Bắt đầu lifespan context
    LS->>DB: init_models() → Tạo bảng nếu chưa tồn tại
    DB-->>LS: ✅ Bảng đã sẵn sàng
    
    Note over EMB,VDB: Các service import-level initialization
    EMB->>EMB: Load HuggingFace<br/>all-MiniLM-L6-v2
    VDB->>VDB: Kết nối ChromaDB<br/>persist_directory=./vector_db

    LS-->>APP: ✅ Startup hoàn tất
    APP->>APP: Include chat_routes router
    APP-->>UV: ✅ Sẵn sàng nhận request
```

**Lệnh khởi chạy:**
```bash
uvicorn app.__main__:app --reload
```

---

## 6. Luồng Xác Thực (Authentication)

```mermaid
sequenceDiagram
    participant C as Client
    participant R as FastAPI Route
    participant A as Auth Module

    C->>R: Request + Authorization: Bearer <JWT>
    R->>A: get_current_principal(credentials)
    
    A->>A: jwt.decode(token, RAG_JWT_SECRET,<br/>algorithm=HS256,<br/>issuer=medical-backend,<br/>audience=rag-service)
    
    alt Token không hợp lệ
        A-->>R: ❌ HTTPException 401
        R-->>C: 401 Invalid RAG token
    else Token hợp lệ nhưng thiếu scope
        A->>A: Kiểm tra scope == "rag:chat"
        A-->>R: ❌ HTTPException 403
        R-->>C: 403 Missing rag:chat scope
    else Token hợp lệ
        A->>A: Tạo RagPrincipal(username, role, scope)
        A-->>R: ✅ RagPrincipal
    end
```

**Cấu trúc JWT Token yêu cầu:**

| Trường | Giá Trị | Mô Tả |
|--------|---------|-------|
| `sub` | username | Tên đăng nhập người dùng |
| `role` | ADMIN / MANAGER / DOCTOR / ENGINEER | Vai trò trong hệ thống |
| `scope` | `rag:chat` | Quyền truy cập chatbot (bắt buộc) |
| `iss` | `medical-backend` | Nhà phát hành token |
| `aud` | `rag-service` | Đối tượng token hướng đến |

---

## 7. Luồng Tạo Phiên Chat

```mermaid
sequenceDiagram
    participant C as Client
    participant R as POST /sessions
    participant A as Auth
    participant SR as session_repository
    participant DB as MySQL

    C->>R: POST /sessions + Bearer JWT
    R->>A: Xác thực JWT
    A-->>R: ✅ RagPrincipal(username, role)
    R->>SR: create_session(db, user_id, user_role, title="New Chat")
    SR->>DB: INSERT INTO rag_chat_sessions
    DB-->>SR: ✅ Session record
    SR-->>R: ChatSession object
    R-->>C: 200 OK<br/>{ sessionId, title, createdAt }
```

---

## 8. Luồng Xử Lý Tin Nhắn (Core Flow)

Đây là luồng chính khi người dùng gửi tin nhắn qua `POST /stream`. Hệ thống sử dụng mô hình **Intent-based Routing** để định tuyến xử lý.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as POST /stream
    participant A as Auth
    participant CS as chat_service
    participant MR as message_repository
    participant RS as rag_service<br/>(Dispatcher)
    participant RT as router_service<br/>(Intent Classifier)
    participant G as Gemini API
    participant DB as MySQL
    participant VDB as ChromaDB

    C->>R: POST /stream<br/>{ sessionId, message } + Bearer JWT
    R->>A: Xác thực JWT
    A-->>R: ✅ RagPrincipal

    R->>CS: stream_chat(db, sessionId, message, username, role)
    
    Note over CS: Bước 1: Lưu tin nhắn người dùng
    CS->>MR: save_message(role="user", content=message)
    MR->>DB: INSERT INTO rag_chat_messages
    
    Note over CS: Bước 2: Tải lịch sử hội thoại
    CS->>MR: get_message_from_session(sessionId)
    MR->>DB: SELECT * FROM rag_chat_messages WHERE session_id=...
    DB-->>MR: Danh sách tin nhắn
    MR-->>CS: history[]

    Note over CS: Bước 3: Gọi Dispatcher trung tâm
    CS->>RS: ask_question(question, sessionId, history, db, username, role)
    
    Note over RS: Bước 3a: Phân loại ý định
    RS->>RT: classify_intent(question, history)
    RT->>G: Gemini JSON mode (temperature=0.0)
    G-->>RT: { "intent": "...", "parameters": {...} }
    RT-->>RS: intent + params
    
    Note over RS: Bước 3b: Xử lý theo Intent (xem chi tiết ở các mục 10-13)
    
    alt Q_AND_A
        RS->>VDB: retriever.ainvoke(search_query)
        VDB-->>RS: Top-5 documents
        RS->>RS: Format RAG Prompt + context + question
    else REPAIR_STATUS
        RS->>DB: query_repair_status (với RBAC)
        DB-->>RS: Danh sách phiếu sửa chữa
        RS->>RS: Format Prompt + db_context
    else CREATE_REPAIR_REQUEST
        RS->>DB: query_assets → create_repair_request
        DB-->>RS: Kết quả tạo phiếu
        RS->>RS: Format Prompt xác nhận
    else GENERAL
        RS->>RS: Format Prompt giới thiệu chatbot
    end

    Note over RS: Bước 3c: Stream phản hồi từ LLM
    RS->>G: llm.astream(messages)
    
    loop Streaming tokens
        G-->>RS: chunk.content
        RS-->>CS: yield token
        CS-->>C: event: token\ndata: <token>
    end

    Note over CS: Bước 4: Lưu câu trả lời hoàn chỉnh
    CS->>MR: save_message(role="assistant", content=full_answer)
    MR->>DB: INSERT INTO rag_chat_messages
    
    Note over CS: Bước 5: Gửi sự kiện hoàn tất
    CS-->>C: event: done\ndata: <assistant_message_id>
```

---

## 9. Luồng Phân Loại Ý Định (Intent Classification)

Hệ thống sử dụng **Gemini LLM ở chế độ JSON** (`response_mime_type="application/json"`, `temperature=0.0`) để phân loại ý định với độ chính xác cao.

```mermaid
graph TD
    INPUT["📩 Tin nhắn người dùng"]
    
    CLASSIFIER["🤖 Gemini Intent Classifier<br/>temperature=0.0<br/>JSON output mode"]
    
    INPUT --> CLASSIFIER
    
    CLASSIFIER -->|"Hỏi quy trình,<br/>hướng dẫn kỹ thuật"| QA["📚 Q_AND_A<br/>params: search_query"]
    CLASSIFIER -->|"Hỏi tiến độ<br/>sửa chữa"| RS["🔍 REPAIR_STATUS<br/>params: query_term"]
    CLASSIFIER -->|"Báo hỏng<br/>thiết bị"| CR["🛠️ CREATE_REPAIR_REQUEST<br/>params: asset_name, description"]
    CLASSIFIER -->|"Chào hỏi,<br/>chat tự do"| GN["💬 GENERAL<br/>params: {}"]

    QA --> DISPATCH["⚡ rag_service.py<br/>Dispatcher xử lý"]
    RS --> DISPATCH
    CR --> DISPATCH
    GN --> DISPATCH

    style INPUT fill:#e94560,stroke:#1a1a2e,color:#fff
    style CLASSIFIER fill:#533483,stroke:#1a1a2e,color:#fff
    style QA fill:#0f3460,stroke:#1a1a2e,color:#fff
    style RS fill:#0f3460,stroke:#1a1a2e,color:#fff
    style CR fill:#0f3460,stroke:#1a1a2e,color:#fff
    style GN fill:#0f3460,stroke:#1a1a2e,color:#fff
    style DISPATCH fill:#16213e,stroke:#e94560,color:#fff
```

### System Prompt cho Intent Classifier

Classifier nhận một `SystemMessage` mô tả chi tiết 4 nhóm intent và định dạng output JSON bắt buộc:

```json
{
  "intent": "Q_AND_A" | "REPAIR_STATUS" | "CREATE_REPAIR_REQUEST" | "GENERAL",
  "parameters": { ... }
}
```

### Ví dụ phân loại:

| Tin nhắn | Intent | Parameters |
|----------|--------|------------|
| "Cách sửa lỗi E01 máy thở?" | `Q_AND_A` | `{"search_query": "lỗi E01 máy thở"}` |
| "Phiếu sửa chữa số 12 thế nào?" | `REPAIR_STATUS` | `{"query_term": "12"}` |
| "Báo hỏng máy ECG bị chập nguồn" | `CREATE_REPAIR_REQUEST` | `{"asset_name": "máy ECG", "description": "chập nguồn"}` |
| "Chào bạn" | `GENERAL` | `{}` |

---

## 10. Luồng RAG - Hỏi Đáp Quy Trình (Q_AND_A)

Đây là luồng **RAG thực thụ** — truy xuất tài liệu từ ChromaDB rồi đưa vào prompt cho LLM.

```mermaid
sequenceDiagram
    participant RS as rag_service<br/>(Dispatcher)
    participant RET as retriever_service<br/>(ChromaDB)
    participant EMB as Embedding Model<br/>(all-MiniLM-L6-v2)
    participant VDB as ChromaDB<br/>(vector_db/)
    participant LLM as Gemini LLM

    Note over RS: Intent = Q_AND_A<br/>params.search_query = "lỗi E01 máy thở"
    
    RS->>RET: retriever.ainvoke(search_query)
    RET->>EMB: Encode search_query → vector
    EMB-->>RET: query embedding [384-dim]
    RET->>VDB: Similarity search (top-k=5)
    VDB-->>RET: 5 tài liệu có điểm tương đồng cao nhất
    RET-->>RS: docs[]

    Note over RS: Xây dựng RAG Prompt
    RS->>RS: context_str = join(doc.page_content for doc in docs)
    RS->>RS: RAG_PROMPT.format(context=context_str, question=question)
    RS->>RS: Thêm vào messages[] (history + formatted prompt)

    RS->>LLM: llm.astream(messages)
    
    loop Stream tokens
        LLM-->>RS: chunk.content
        RS-->>RS: yield token
    end
```

### RAG Prompt Template (`app/core/prompt.py`):

```
Bạn là chatbot AI cho hệ thống quản lí, bảo trì thiết bị y tế.
Nhiệm vụ: trả lời dựa hoàn toàn vào ngữ cảnh được cung cấp.

QUY TẮC:
1) Chính xác tuyệt đối - chỉ dùng thông tin trong NGỮ CẢNH
2) Thành thật - nếu không có đủ thông tin, nói rõ
3) Ngắn gọn, rõ ràng - dùng bullet points
4) Giọng điệu chuyên nghiệp, lịch sự

Ngữ cảnh: {context}
Câu hỏi: {question}
```

---

## 11. Luồng Tra Cứu Sửa Chữa (REPAIR_STATUS)

Luồng này truy vấn **trực tiếp MySQL** với bộ lọc bảo mật **RBAC** dựa trên vai trò người dùng.

```mermaid
sequenceDiagram
    participant RS as rag_service
    participant DQ as db_query_service
    participant DB as MySQL
    participant LLM as Gemini LLM

    Note over RS: Intent = REPAIR_STATUS<br/>params.query_term = "máy siêu âm"

    RS->>DQ: query_repair_status(db, query_term, username, user_role)
    
    Note over DQ: Bước 1: Xác định user_id
    DQ->>DB: SELECT id FROM users WHERE username = :username
    DB-->>DQ: user_id

    Note over DQ: Bước 2: Xây dựng truy vấn có RBAC
    DQ->>DQ: Áp dụng bộ lọc theo vai trò

    alt DOCTOR
        DQ->>DQ: WHERE sr.reported_by_id = user_id<br/>(Chỉ xem phiếu mình tạo)
    else ENGINEER
        DQ->>DQ: WHERE sr.assigned_engineer_id = user_id<br/>(Chỉ xem phiếu được giao)
    else ADMIN / MANAGER
        DQ->>DQ: Không lọc (xem toàn bộ)
    end

    DQ->>DB: SELECT sr.*, a.name, a.code, u.username<br/>FROM service_requests sr<br/>JOIN assets a ... JOIN users u ...<br/>WHERE [search_filter] AND [rbac_filter]
    DB-->>DQ: rows[]
    DQ-->>RS: records[]

    Note over RS: Format kết quả thành prompt
    RS->>RS: Tạo prompt mô tả từng phiếu sửa chữa<br/>(mã phiếu, thiết bị, trạng thái, ưu tiên, ...)
    RS->>RS: Thêm HumanMessage(prompt) vào messages[]

    RS->>LLM: llm.astream(messages)
    loop Stream tokens
        LLM-->>RS: chunk.content (phản hồi tự nhiên bằng tiếng Việt)
    end
```

---

## 12. Luồng Báo Hỏng Thiết Bị (CREATE_REPAIR_REQUEST)

Luồng phức tạp nhất — bao gồm nhiều bước xác nhận trước khi tạo phiếu trong database.

```mermaid
flowchart TD
    START["📩 Intent = CREATE_REPAIR_REQUEST<br/>params: asset_name, description"]
    
    CHECK_INFO{"Đủ thông tin?<br/>asset_name AND description<br/>không rỗng?"}
    
    START --> CHECK_INFO
    
    CHECK_INFO -->|"❌ Thiếu thông tin"| ASK_MORE["🔄 Yêu cầu người dùng<br/>bổ sung thông tin:<br/>1. Tên/Mã thiết bị<br/>2. Mô tả sự cố"]
    
    CHECK_INFO -->|"✅ Đủ thông tin"| QUERY_ASSET["🔍 query_assets(db, asset_name)<br/>Tìm thiết bị trong MySQL"]
    
    QUERY_ASSET --> CHECK_RESULT{"Kết quả<br/>tìm kiếm?"}
    
    CHECK_RESULT -->|"0 kết quả"| NOT_FOUND["❌ Không tìm thấy thiết bị<br/>Gợi ý kiểm tra lại<br/>mã máy/tên thiết bị"]
    
    CHECK_RESULT -->|"> 1 kết quả"| MULTI["📋 Hiển thị danh sách<br/>thiết bị trùng khớp<br/>Yêu cầu chọn chính xác<br/>Mã thiết bị (Code)"]
    
    CHECK_RESULT -->|"= 1 kết quả"| CREATE["✅ create_repair_request()"]
    
    CREATE --> INSERT_SR["INSERT INTO service_requests<br/>(status=PENDING, priority=LOW)"]
    INSERT_SR --> UPDATE_ASSET["UPDATE assets<br/>SET status = 'BROKEN'"]
    UPDATE_ASSET --> COMMIT["COMMIT transaction"]
    
    COMMIT --> SUCCESS{"Thành công?"}
    
    SUCCESS -->|"✅"| CONFIRM["🎉 Xác nhận tạo phiếu<br/>Thông tin: mã phiếu, thiết bị,<br/>trạng thái, mô tả sự cố"]
    
    SUCCESS -->|"❌ Exception"| ERROR["⚠️ Thông báo lỗi<br/>ROLLBACK transaction<br/>Hướng dẫn thử lại"]

    ASK_MORE --> LLM["🤖 Gemini Stream Response"]
    NOT_FOUND --> LLM
    MULTI --> LLM
    CONFIRM --> LLM
    ERROR --> LLM

    style START fill:#e94560,stroke:#1a1a2e,color:#fff
    style CREATE fill:#2ecc71,stroke:#1a1a2e,color:#fff
    style ERROR fill:#e74c3c,stroke:#1a1a2e,color:#fff
    style LLM fill:#533483,stroke:#1a1a2e,color:#fff
```

---

## 13. Luồng Chat Tự Do (GENERAL)

```mermaid
sequenceDiagram
    participant RS as rag_service
    participant LLM as Gemini LLM

    Note over RS: Intent = GENERAL<br/>(chào hỏi, hỏi chức năng, chat tự do)

    RS->>RS: Tạo System Prompt giới thiệu chatbot:<br/>1. Hỏi đáp quy trình kỹ thuật (RAG)<br/>2. Tra cứu trạng thái sửa chữa<br/>3. Báo hỏng thiết bị qua chat
    RS->>RS: Thêm HumanMessage vào messages[]

    RS->>LLM: llm.astream(messages)
    loop Stream tokens
        LLM-->>RS: chunk.content
    end
```

---

## 14. Luồng Nạp Dữ Liệu (Data Ingestion)

Luồng **offline** — chạy một lần để nạp dữ liệu CSV vào ChromaDB trước khi sử dụng RAG.

```mermaid
flowchart LR
    subgraph SOURCE["📄 Nguồn Dữ Liệu CSV"]
        CSV1["failure-QA-data.csv<br/>Hỏi đáp lỗi thiết bị"]
        CSV2["system-guide-data.csv<br/>Hướng dẫn hệ thống"]
    end

    subgraph PROCESS["⚙️ scripts/ingest_csv.py"]
        LOAD["CSVLoader<br/>Đọc CSV (UTF-8)"]
        PARSE["Tách question/answer<br/>từ page_content"]
        FORMAT["Tạo Document:<br/>page_content: Q&A<br/>metadata: source, language=vi"]
    end

    subgraph STORE["💾 Vector Store"]
        EMB["HuggingFace Embeddings<br/>all-MiniLM-L6-v2"]
        CHROMA["ChromaDB<br/>./vector_db/"]
    end

    CSV1 --> LOAD
    CSV2 --> LOAD
    LOAD --> PARSE
    PARSE --> FORMAT
    FORMAT --> EMB
    EMB -->|"vector_store.add_documents()"| CHROMA

    style SOURCE fill:#1a1a2e,stroke:#e94560,color:#fff
    style PROCESS fill:#16213e,stroke:#0f3460,color:#fff
    style STORE fill:#0f3460,stroke:#533483,color:#fff
```

**Lệnh chạy nạp dữ liệu:**
```bash
cd RAGchatbot
python -m scripts.ingest_csv
```

### Cấu trúc Document sau khi format:
```
question: Cách khắc phục lỗi E01 máy thở?
answer: Kiểm tra nguồn điện, reset hệ thống, ...
```

---

## 15. Mô Hình Dữ Liệu

### Sơ đồ ERD (Bảng liên quan đến RAG Chatbot)

```mermaid
erDiagram
    rag_chat_sessions {
        string id PK "UUID"
        string user_id "Username người tạo"
        string user_role "Vai trò: ADMIN/DOCTOR/..."
        string title "Tiêu đề phiên chat"
        datetime created_at
        datetime updated_at
    }

    rag_chat_messages {
        string id PK "UUID"
        string session_id FK "→ rag_chat_sessions.id"
        string role "user | assistant"
        text content "Nội dung tin nhắn"
        json metadata_json "Metadata tùy chọn"
        datetime created_at
    }

    users {
        int id PK
        string username
        string role "ADMIN | MANAGER | DOCTOR | ENGINEER"
    }

    assets {
        int id PK
        string code "Mã thiết bị"
        string name "Tên thiết bị"
        string status "ACTIVE | BROKEN | ..."
    }

    service_requests {
        int id PK
        int asset_id FK "→ assets.id"
        int reported_by_id FK "→ users.id"
        int assigned_engineer_id FK "→ users.id"
        text description "Mô tả sự cố"
        string status "PENDING | IN_PROGRESS | COMPLETED"
        string priority "LOW | MEDIUM | HIGH"
        datetime created_at
        datetime completed_at
    }

    rag_chat_sessions ||--o{ rag_chat_messages : "chứa"
    users ||--o{ service_requests : "báo hỏng"
    users ||--o{ service_requests : "được giao"
    assets ||--o{ service_requests : "liên quan"
```

---

## 16. Phân Quyền RBAC

Hệ thống áp dụng **Role-Based Access Control** ở 2 tầng:

### Tầng 1: JWT Authentication (API Gateway)
- Mọi request phải có JWT token với `scope: rag:chat`
- Token chứa `username` và `role` của người dùng

### Tầng 2: Database Query Filtering (Data Layer)

```mermaid
graph TD
    REQ["🔍 Truy vấn phiếu sửa chữa"]
    
    REQ --> ROLE{"Vai trò<br/>người dùng?"}
    
    ROLE -->|DOCTOR| DOC["👨‍⚕️ DOCTOR<br/>Chỉ xem phiếu MÌNH TẠO<br/>WHERE reported_by_id = user_id"]
    ROLE -->|ENGINEER| ENG["🔧 ENGINEER<br/>Chỉ xem phiếu ĐƯỢC GIAO<br/>WHERE assigned_engineer_id = user_id"]
    ROLE -->|ADMIN| ADM["👑 ADMIN<br/>Xem TOÀN BỘ phiếu<br/>Không lọc"]
    ROLE -->|MANAGER| MGR["📊 MANAGER<br/>Xem TOÀN BỘ phiếu<br/>Không lọc"]

    style DOC fill:#3498db,stroke:#1a1a2e,color:#fff
    style ENG fill:#e67e22,stroke:#1a1a2e,color:#fff
    style ADM fill:#e94560,stroke:#1a1a2e,color:#fff
    style MGR fill:#2ecc71,stroke:#1a1a2e,color:#fff
```

---

## 17. Biến Môi Trường

| Biến | Bắt Buộc | Giá Trị Mặc Định | Mô Tả |
|------|----------|-------------------|--------|
| `GOOGLE_API_KEY` | ✅ | — | API key Google Gemini |
| `RAG_JWT_SECRET` | ✅ | — | Secret key mã hóa JWT |
| `RAG_JWT_ISSUER` | ❌ | `medical-backend` | Nhà phát hành JWT |
| `RAG_JWT_AUDIENCE` | ❌ | `rag-service` | Đối tượng JWT |
| `DATABASE_URL` | ✅ | Hard-coded | Connection string MySQL |

---

## 18. Ranh Giới Module

```mermaid
graph LR
    subgraph API["🌐 API Layer"]
        A1["chat_routes.py"]
    end

    subgraph AUTH["🔐 Auth Layer"]
        A2["auth.py"]
    end

    subgraph CORE["⚙️ Core"]
        C1["config.py"]
        C2["database.py"]
        C3["prompt.py"]
    end

    subgraph SERVICE["📦 Service Layer"]
        S1["chat_service.py<br/>Điều phối SSE"]
        S2["rag_service.py<br/>Dispatcher"]
        S3["router_service.py<br/>Intent Classifier"]
        S4["db_query_service.py<br/>CSDL + RBAC"]
        S5["llm_service.py<br/>Gemini Client"]
        S6["retriever_service.py<br/>Vector Search"]
        S7["embedding_service.py<br/>Embedding"]
    end

    subgraph REPO["📂 Repository"]
        R1["session_repository"]
        R2["message_repository"]
    end

    subgraph DATA_LAYER["💾 Data"]
        D1[("MySQL")]
        D2[("ChromaDB")]
    end

    A1 --> AUTH
    A1 --> S1
    S1 --> S2
    S1 --> R2
    S2 --> S3
    S2 --> S4
    S2 --> S5
    S2 --> S6
    S4 --> D1
    S6 --> D2
    R1 --> D1
    R2 --> D1

    style API fill:#e94560,stroke:#1a1a2e,color:#fff
    style AUTH fill:#f39c12,stroke:#1a1a2e,color:#fff
    style CORE fill:#16213e,stroke:#0f3460,color:#fff
    style SERVICE fill:#0f3460,stroke:#533483,color:#fff
    style REPO fill:#16213e,stroke:#0f3460,color:#fff
    style DATA_LAYER fill:#1a1a2e,stroke:#e94560,color:#fff
```

| Module | Trách Nhiệm |
|--------|-------------|
| `app/api` | HTTP endpoints, dependency injection, response type |
| `app/auth` | Xác thực JWT và tạo RagPrincipal |
| `app/core` | Config, database engine, prompt template dùng chung |
| `app/models` | SQLAlchemy table mapping (ORM) |
| `app/repositories` | CRUD/query database |
| `app/schemas` | Pydantic request/response models |
| `app/services` | Business logic: dispatching, intent classification, RAG, LLM streaming, DB query |
| `scripts` | Xử lý dữ liệu offline (ingestion) |
| `data` | Nguồn dữ liệu CSV gốc |
| `vector_db` | ChromaDB persisted vectors |

---

> 📝 **Ghi chú**: Tài liệu này phản ánh chính xác mã nguồn hiện tại tại thời điểm viết. Code đã tích hợp đầy đủ RAG retrieval trong nhánh `Q_AND_A`, truy vấn database có RBAC cho `REPAIR_STATUS` và `CREATE_REPAIR_REQUEST`.
