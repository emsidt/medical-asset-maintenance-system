# 🏗️ Kiến Trúc Hệ Thống RAG Chatbot — Quản Lý Bảo Trì Thiết Bị Y Tế

> Tài liệu mô tả chi tiết kiến trúc và các luồng xử lý (flow) của hệ thống RAG Chatbot,
> dựa trên mã nguồn thực tế tại thư mục `RAGchatbot/`.

---

## 📑 Mục Lục

1.  [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2.  [Công Nghệ Sử Dụng](#2-công-nghệ-sử-dụng)
3.  [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4.  [Sơ Đồ Kiến Trúc Tổng Quan](#4-sơ-đồ-kiến-trúc-tổng-quan)
5.  [Luồng Khởi Động Ứng Dụng](#5-luồng-khởi-động-ứng-dụng)
6.  [Luồng Xác Thực (Authentication)](#6-luồng-xác-thực-authentication)
7.  [Luồng Tạo Phiên Chat](#7-luồng-tạo-phiên-chat)
8.  [Luồng Xử Lý Tin Nhắn (Core Flow)](#8-luồng-xử-lý-tin-nhắn-core-flow)
9.  [Luồng Phân Loại Ý Định (Intent Classification)](#9-luồng-phân-loại-ý-định-intent-classification)
10. [Luồng RAG — Hỏi Đáp Quy Trình (Q_AND_A)](#10-luồng-rag--hỏi-đáp-quy-trình-q_and_a)
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

| #   | Ý Định (Intent)           | Mô Tả                                                                                     |
| --- | ------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | **Q_AND_A**               | Hỏi đáp quy trình kỹ thuật, hướng dẫn sử dụng thiết bị dựa trên tài liệu (RAG thực thụ) |
| 2   | **REPAIR_STATUS**         | Tra cứu trạng thái sửa chữa thiết bị từ cơ sở dữ liệu MySQL (có phân quyền RBAC)        |
| 3   | **CREATE_REPAIR_REQUEST** | Tạo phiếu báo hỏng thiết bị trực tiếp qua chat                                           |
| 4   | **GENERAL**               | Chào hỏi, trò chuyện tự do, giới thiệu chức năng chatbot                                  |

---

## 2. Công Nghệ Sử Dụng

| Thành Phần        | Công Nghệ                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Web Framework      | **FastAPI**                                                        |
| ASGI Server        | **Uvicorn**                                                        |
| LLM Provider       | **Google Gemini** (`gemini-2.5-flash`) via `langchain-google-genai` |
| Intent Classifier  | **Gemini** (JSON mode, `temperature=0.0`)                          |
| Embedding Model    | **HuggingFace** `sentence-transformers/all-MiniLM-L6-v2`           |
| Vector Store       | **ChromaDB** (persistent, top-k=5)                                 |
| Relational DB      | **MySQL** via SQLAlchemy Async + `aiomysql`                        |
| Authentication     | **JWT Bearer** (HS256, scope `rag:chat`)                           |
| Streaming          | **Server-Sent Events (SSE)**                                       |
| Schema Validation  | **Pydantic**                                                       |

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

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          🖥️  CLIENT / FRONTEND                                 │
│                         ┌─────────────────────┐                                 │
│                         │  Giao diện người dùng │                                │
│                         └─────────┬───────────┘                                 │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │ POST /sessions
                                    │ POST /stream
                                    │ + Bearer JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ⚡ FASTAPI SERVER                                      │
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                                   │
│  │ API Layer        │───▶│ Auth Layer       │                                   │
│  │ chat_routes.py   │    │ JWT Bearer HS256 │                                   │
│  └────────┬─────────┘    └──────────────────┘                                   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐      │
│  │                       📦  SERVICE LAYER                               │      │
│  │                                                                       │      │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐  │      │
│  │  │ chat_service.py  │───▶│ rag_service.py   │──▶│ router_service   │  │      │
│  │  │ Điều phối SSE    │    │ Dispatcher       │   │ Intent Classifier│  │      │
│  │  └──────────────────┘    └───────┬──────────┘   └──────────────────┘  │      │
│  │                                  │                                    │      │
│  │                    ┌─────────────┼─────────────┐                      │      │
│  │                    ▼             ▼             ▼                      │      │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐      │      │
│  │  │ retriever_svc    │ │ db_query_svc     │ │ llm_service.py   │      │      │
│  │  │ ChromaDB Search  │ │ CSDL + RBAC      │ │ Gemini Client    │      │      │
│  │  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘      │      │
│  │           │                    │                     │                │      │
│  └───────────┼────────────────────┼─────────────────────┼────────────────┘      │
│              │                    │                     │                        │
│  ┌───────────┼────────────────────┼─────────────────────┼────────────────┐      │
│  │           │     📂  REPOSITORY LAYER                 │                │      │
│  │           │    ┌──────────────────┐  ┌──────────────────┐             │      │
│  │           │    │ session_repo     │  │ message_repo     │             │      │
│  │           │    └────────┬─────────┘  └────────┬─────────┘             │      │
│  └───────────┼─────────────┼─────────────────────┼───────────────────────┘      │
└──────────────┼─────────────┼─────────────────────┼──────────────────────────────┘
               │             │                     │
               ▼             ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          💾  TẦNG LƯU TRỮ                                       │
│                                                                                  │
│   ┌──────────────────┐         ┌──────────────────────────────────────────┐       │
│   │ ChromaDB         │         │ MySQL                                   │       │
│   │ Vector Store     │         │ rag_chat_sessions | rag_chat_messages   │       │
│   │ FAQ & Hướng dẫn  │         │ assets | service_requests | users       │       │
│   └──────────────────┘         └──────────────────────────────────────────┘       │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │ 🌐  Google       │
               ◀─────────│ Gemini API       │
                          │ gemini-2.5-flash │
                          └──────────────────┘
```

---

## 5. Luồng Khởi Động Ứng Dụng

```
  Uvicorn              FastAPI App           Lifespan            MySQL           Embedding/ChromaDB
    │                      │                    │                  │                    │
    │── Khởi động ────────▶│                    │                  │                    │
    │                      │── Bắt đầu ────────▶│                  │                    │
    │                      │   lifespan          │                  │                    │
    │                      │                    │── init_models() ─▶│                    │
    │                      │                    │   Tạo bảng nếu   │                    │
    │                      │                    │   chưa tồn tại   │                    │
    │                      │                    │◀─ ✅ Sẵn sàng ───│                    │
    │                      │                    │                  │                    │
    │                      │                    │     [Các service import-level init]    │
    │                      │                    │                  │    Load HuggingFace │
    │                      │                    │                  │    all-MiniLM-L6-v2 │
    │                      │                    │                  │    Kết nối ChromaDB │
    │                      │                    │                  │    ./vector_db      │
    │                      │                    │                  │                    │
    │                      │◀─ ✅ Startup ──────│                  │                    │
    │                      │   hoàn tất         │                  │                    │
    │                      │                    │                  │                    │
    │                      │── Include chat_routes router          │                    │
    │                      │                    │                  │                    │
    │◀─ ✅ Sẵn sàng ──────│                    │                  │                    │
    │   nhận request       │                    │                  │                    │
```

**Lệnh khởi chạy:**
```bash
uvicorn app.__main__:app --reload
```

---

## 6. Luồng Xác Thực (Authentication)

```
  Client                  FastAPI Route             Auth Module (auth.py)
    │                          │                          │
    │── Request ──────────────▶│                          │
    │   + Authorization:       │                          │
    │     Bearer <JWT>         │── get_current_principal()▶│
    │                          │                          │
    │                          │                          │── jwt.decode(token,
    │                          │                          │     RAG_JWT_SECRET,
    │                          │                          │     algorithm=HS256,
    │                          │                          │     issuer=medical-backend,
    │                          │                          │     audience=rag-service)
    │                          │                          │
    │                          │                  ┌───────┴───────┐
    │                          │                  │   Token OK?   │
    │                          │                  └───┬───────┬───┘
    │                          │                      │       │
    │                          │              ❌ Không │       │ ✅ Có
    │                          │◀─ 401 ───────────────┘       │
    │◀─ 401 Invalid ──────────│                               │
    │   RAG token              │                       ┌──────┴──────┐
    │                          │                       │ scope ==    │
    │                          │                       │ "rag:chat"? │
    │                          │                       └──┬──────┬───┘
    │                          │                   ❌ Không│      │ ✅ Có
    │                          │◀─ 403 ────────────────────┘      │
    │◀─ 403 Missing ──────────│                                   │
    │   rag:chat scope         │                                   │
    │                          │                    Tạo RagPrincipal│
    │                          │◀─ ✅ RagPrincipal(username, ──────┘
    │                          │       role, scope)
```

**Cấu trúc JWT Token yêu cầu:**

| Trường  | Giá Trị                                  | Mô Tả                              |
| ------- | ---------------------------------------- | ----------------------------------- |
| `sub`   | username                                 | Tên đăng nhập người dùng           |
| `role`  | ADMIN / MANAGER / DOCTOR / ENGINEER      | Vai trò trong hệ thống             |
| `scope` | `rag:chat`                               | Quyền truy cập chatbot (bắt buộc)  |
| `iss`   | `medical-backend`                        | Nhà phát hành token                |
| `aud`   | `rag-service`                            | Đối tượng token hướng đến          |

---

## 7. Luồng Tạo Phiên Chat

```
  Client           POST /sessions         Auth           session_repository        MySQL
    │                    │                  │                    │                    │
    │── POST /sessions ─▶│                  │                    │                    │
    │   + Bearer JWT     │── Xác thực JWT ─▶│                    │                    │
    │                    │◀─ ✅ RagPrincipal│                    │                    │
    │                    │   (username,role) │                    │                    │
    │                    │                  │                    │                    │
    │                    │── create_session(db, user_id, ───────▶│                    │
    │                    │     user_role, title="New Chat")       │                    │
    │                    │                  │                    │── INSERT INTO ─────▶│
    │                    │                  │                    │   rag_chat_sessions │
    │                    │                  │                    │◀─ ✅ Session ──────│
    │                    │◀─ ChatSession ───────────────────────│                    │
    │                    │                  │                    │                    │
    │◀─ 200 OK ─────────│                  │                    │                    │
    │   { sessionId,     │                  │                    │                    │
    │     title,         │                  │                    │                    │
    │     createdAt }    │                  │                    │                    │
```

---

## 8. Luồng Xử Lý Tin Nhắn (Core Flow)

Đây là luồng chính khi người dùng gửi tin nhắn qua `POST /stream`. Hệ thống sử dụng mô hình **Intent-based Routing** để định tuyến xử lý.

```
  Client        POST /stream     Auth      chat_service    message_repo     rag_service      router_service    Gemini API
    │                │             │             │               │               │                 │               │
    │── POST /stream▶│             │             │               │               │                 │               │
    │  {sessionId,   │── Xác thực─▶│             │               │               │                 │               │
    │   message}     │◀─ ✅ ───────│             │               │               │                 │               │
    │  + Bearer JWT  │             │             │               │               │                 │               │
    │                │── stream_chat() ─────────▶│               │               │                 │               │
    │                │             │             │               │               │                 │               │
    │                │             │  ┌──────────┴──────────┐    │               │                 │               │
    │                │             │  │ Bước 1: Lưu tin nhắn│    │               │                 │               │
    │                │             │  │ người dùng           │    │               │                 │               │
    │                │             │  └──────────┬──────────┘    │               │                 │               │
    │                │             │             │── save_message▶│               │                 │               │
    │                │             │             │  (role="user") │── INSERT ────▶│(MySQL)          │               │
    │                │             │             │               │               │                 │               │
    │                │             │  ┌──────────┴──────────┐    │               │                 │               │
    │                │             │  │ Bước 2: Tải lịch sử │    │               │                 │               │
    │                │             │  │ hội thoại            │    │               │                 │               │
    │                │             │  └──────────┬──────────┘    │               │                 │               │
    │                │             │             │── get_message ▶│               │                 │               │
    │                │             │             │  _from_session │── SELECT ────▶│(MySQL)          │               │
    │                │             │             │◀─ history[] ──│               │                 │               │
    │                │             │             │               │               │                 │               │
    │                │             │  ┌──────────┴──────────┐    │               │                 │               │
    │                │             │  │ Bước 3: Gọi         │    │               │                 │               │
    │                │             │  │ Dispatcher trung tâm │    │               │                 │               │
    │                │             │  └──────────┬──────────┘    │               │                 │               │
    │                │             │             │── ask_question(question, sessionId, ────────────▶│               │
    │                │             │             │     history, db, username, role)                  │               │
    │                │             │             │               │               │                 │               │
    │                │             │             │               │  ┌────────────┴────────────┐    │               │
    │                │             │             │               │  │ Bước 3a: Phân loại      │    │               │
    │                │             │             │               │  │ ý định                   │    │               │
    │                │             │             │               │  └────────────┬────────────┘    │               │
    │                │             │             │               │               │── classify_intent()────────────▶│
    │                │             │             │               │               │                 │  Gemini JSON  │
    │                │             │             │               │               │                 │  temperature  │
    │                │             │             │               │               │                 │  = 0.0        │
    │                │             │             │               │               │◀─ {intent, parameters} ────────│
    │                │             │             │               │               │                 │               │
    │                │             │             │               │  ┌────────────┴────────────┐    │               │
    │                │             │             │               │  │ Bước 3b: Xử lý theo    │    │               │
    │                │             │             │               │  │ Intent (xem mục 10-13)  │    │               │
    │                │             │             │               │  └────────────┬────────────┘    │               │
    │                │             │             │               │               │                 │               │
    │                │             │             │               │               │ (Tùy intent:    │               │
    │                │             │             │               │               │  Q_AND_A → ChromaDB             │
    │                │             │             │               │               │  REPAIR_STATUS → MySQL + RBAC   │
    │                │             │             │               │               │  CREATE_REPAIR_REQUEST → MySQL  │
    │                │             │             │               │               │  GENERAL → Prompt trực tiếp)    │
    │                │             │             │               │               │                 │               │
    │                │             │             │               │  ┌────────────┴────────────┐    │               │
    │                │             │             │               │  │ Bước 3c: Stream phản hồi│    │               │
    │                │             │             │               │  │ từ LLM                   │    │               │
    │                │             │             │               │  └────────────┬────────────┘    │               │
    │                │             │             │               │               │── llm.astream(messages) ───────▶│
    │                │             │             │               │               │                 │               │
    │                │             │             │               │    ┌──── loop: Streaming tokens ────┐           │
    │                │             │             │               │    │          │◀─ chunk.content ────│           │
    │                │             │◀─ yield token ─────────────│    │          │                 │   │           │
    │◀─ event:token ─│             │             │               │    └─────────────────────────────────┘           │
    │   data:<token>  │             │             │               │               │                 │               │
    │                │             │             │               │               │                 │               │
    │                │             │  ┌──────────┴──────────┐    │               │                 │               │
    │                │             │  │ Bước 4: Lưu câu     │    │               │                 │               │
    │                │             │  │ trả lời hoàn chỉnh   │    │               │                 │               │
    │                │             │  └──────────┬──────────┘    │               │                 │               │
    │                │             │             │── save_message▶│               │                 │               │
    │                │             │             │(role="assistant"│── INSERT ───▶│(MySQL)          │               │
    │                │             │             │ content=full)  │               │                 │               │
    │                │             │             │               │               │                 │               │
    │                │             │  ┌──────────┴──────────┐    │               │                 │               │
    │                │             │  │ Bước 5: Gửi sự kiện │    │               │                 │               │
    │                │             │  │ hoàn tất             │    │               │                 │               │
    │                │             │  └──────────┬──────────┘    │               │                 │               │
    │◀─ event:done ──│             │             │               │               │                 │               │
    │   data:<msg_id> │             │             │               │               │                 │               │
```

---

## 9. Luồng Phân Loại Ý Định (Intent Classification)

Hệ thống sử dụng **Gemini LLM ở chế độ JSON** (`response_mime_type="application/json"`, `temperature=0.0`) để phân loại ý định với độ chính xác cao.

```
                        ┌─────────────────────┐
                        │  📩 Tin nhắn         │
                        │  người dùng          │
                        └──────────┬──────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────┐
                  │  🤖 Gemini Intent Classifier   │
                  │  temperature = 0.0             │
                  │  response_mime_type = JSON      │
                  └──┬─────────┬─────────┬──────┬──┘
                     │         │         │      │
        ┌────────────┘         │         │      └────────────┐
        ▼                      ▼         ▼                   ▼
 ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  ┌──────────────┐
 │ 📚 Q_AND_A   │  │ 🔍 REPAIR_  │  │ 🛠️ CREATE_REPAIR_ │  │ 💬 GENERAL   │
 │              │  │    STATUS    │  │    REQUEST        │  │              │
 │ params:      │  │ params:      │  │ params:           │  │ params: {}   │
 │ search_query │  │ query_term   │  │ asset_name,       │  │              │
 │              │  │              │  │ description       │  │              │
 └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘  └──────┬───────┘
        │                 │                    │                   │
        └────────┬────────┴────────┬───────────┘                   │
                 │                 │                               │
                 ▼                 ▼                               ▼
        ┌──────────────────────────────────────────────────────────────┐
        │              ⚡ rag_service.py — Dispatcher xử lý           │
        └──────────────────────────────────────────────────────────────┘
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

| Tin nhắn                             | Intent                  | Parameters                                                       |
| ------------------------------------ | ----------------------- | ---------------------------------------------------------------- |
| "Cách sửa lỗi E01 máy thở?"        | `Q_AND_A`               | `{"search_query": "lỗi E01 máy thở"}`                           |
| "Phiếu sửa chữa số 12 thế nào?"    | `REPAIR_STATUS`         | `{"query_term": "12"}`                                           |
| "Báo hỏng máy ECG bị chập nguồn"   | `CREATE_REPAIR_REQUEST` | `{"asset_name": "máy ECG", "description": "chập nguồn"}`        |
| "Chào bạn"                          | `GENERAL`               | `{}`                                                             |

---

## 10. Luồng RAG — Hỏi Đáp Quy Trình (Q_AND_A)

Đây là luồng **RAG thực thụ** — truy xuất tài liệu từ ChromaDB rồi đưa vào prompt cho LLM.

```
  rag_service          retriever_service       Embedding Model          ChromaDB            Gemini LLM
  (Dispatcher)         (ChromaDB)             (all-MiniLM-L6-v2)      (vector_db/)
    │                       │                       │                      │                    │
    │ Intent = Q_AND_A      │                       │                      │                    │
    │ search_query =        │                       │                      │                    │
    │ "lỗi E01 máy thở"    │                       │                      │                    │
    │                       │                       │                      │                    │
    │── retriever.ainvoke()▶│                       │                      │                    │
    │   (search_query)      │── Encode query ──────▶│                      │                    │
    │                       │                       │── query embedding    │                    │
    │                       │                       │   [384-dim]          │                    │
    │                       │◀──────────────────────│                      │                    │
    │                       │                       │                      │                    │
    │                       │── Similarity search ─────────────────────────▶│                    │
    │                       │   (top-k=5)           │                      │                    │
    │                       │◀─ 5 tài liệu tương đồng cao nhất ───────────│                    │
    │                       │                       │                      │                    │
    │◀─ docs[] ────────────│                       │                      │                    │
    │                       │                       │                      │                    │
    │ ┌─────────────────────────────────────────┐   │                      │                    │
    │ │ Xây dựng RAG Prompt:                    │   │                      │                    │
    │ │ 1. context_str = join(doc.page_content) │   │                      │                    │
    │ │ 2. RAG_PROMPT.format(context, question) │   │                      │                    │
    │ │ 3. Thêm vào messages[] (history +       │   │                      │                    │
    │ │    formatted prompt)                    │   │                      │                    │
    │ └─────────────────────────────────────────┘   │                      │                    │
    │                       │                       │                      │                    │
    │── llm.astream(messages) ─────────────────────────────────────────────────────────────────▶│
    │                       │                       │                      │                    │
    │              ┌──── loop: Stream tokens ──────────────────────────────────────────┐        │
    │              │        │                       │                      │           │        │
    │◀─ chunk.content ─────────────────────────────────────────────────────────────────│───────│
    │   yield token │        │                       │                      │           │        │
    │              └──────────────────────────────────────────────────────────────────────┘      │
```

### RAG Prompt Template (`app/core/prompt.py`):

```
Bạn là chatbot AI cho hệ thống quản lí, bảo trì, theo dõi và sửa sữa thiết bị y tế.
Bạn là một trợ lý ảo thông minh và thân thiện.
Nhiệm vụ của bạn là trả lời các câu hỏi của người dùng dựa hoàn toàn vào các ngữ cảnh được cung cấp bên dưới

QUY TẮC TRẢ LỜI:
1) Chính xác tuyệt đối: Chỉ sử dụng thông tin trong phần NGỮ CẢNH. Không tự bịa thông tin hoặc dùng kiến thức ngoài.
2) Lưu ý lịch sử hỏi đáp để phục vụ cho phần "Câu hỏi"
2) Thành thật: Nếu ngữ cảnh không có đủ thông tin để trả lời câu hỏi, hãy nói rõ.
3) Ngắn gọn, rõ ràng: Trả lời trực tiếp vào vấn đề. Sử dụng danh sách (bullet points).
4) Giọng điệu: Thể hiện sự chuyên nghiệp, lịch sự và hữu ích.

Ngữ cảnh: {context}
Câu hỏi: {question}
```

---

## 11. Luồng Tra Cứu Sửa Chữa (REPAIR_STATUS)

Luồng này truy vấn **trực tiếp MySQL** với bộ lọc bảo mật **RBAC** dựa trên vai trò người dùng.

```
  rag_service           db_query_service                  MySQL                     Gemini LLM
    │                        │                              │                           │
    │ Intent = REPAIR_STATUS │                              │                           │
    │ query_term =           │                              │                           │
    │ "máy siêu âm"         │                              │                           │
    │                        │                              │                           │
    │── query_repair_status()▶│                              │                           │
    │   (db, query_term,     │                              │                           │
    │    username, user_role)│                              │                           │
    │                        │                              │                           │
    │                        │ ┌──────────────────────┐     │                           │
    │                        │ │ Bước 1: Xác định     │     │                           │
    │                        │ │ user_id               │     │                           │
    │                        │ └──────────┬───────────┘     │                           │
    │                        │            │                  │                           │
    │                        │── SELECT id FROM users ──────▶│                           │
    │                        │   WHERE username = :username  │                           │
    │                        │◀─ user_id ───────────────────│                           │
    │                        │                              │                           │
    │                        │ ┌──────────────────────┐     │                           │
    │                        │ │ Bước 2: Xây dựng     │     │                           │
    │                        │ │ truy vấn có RBAC     │     │                           │
    │                        │ └──────────┬───────────┘     │                           │
    │                        │            │                  │                           │
    │                        │   ┌────────┴────────┐        │                           │
    │                        │   │ Vai trò?        │        │                           │
    │                        │   └─┬──────┬──────┬─┘        │                           │
    │                        │     │      │      │          │                           │
    │                        │  DOCTOR  ENGINEER  ADMIN/     │                           │
    │                        │     │      │     MANAGER     │                           │
    │                        │     ▼      ▼      ▼          │                           │
    │                        │  WHERE   WHERE   Không       │                           │
    │                        │  reported assigned lọc       │                           │
    │                        │  _by_id  _engineer           │                           │
    │                        │  =user_id _id=               │                           │
    │                        │          user_id             │                           │
    │                        │                              │                           │
    │                        │── SELECT sr.*, a.name, ... ─▶│                           │
    │                        │   FROM service_requests sr    │                           │
    │                        │   JOIN assets a ...           │                           │
    │                        │   JOIN users u ...            │                           │
    │                        │   WHERE [search] AND [rbac]  │                           │
    │                        │   ORDER BY sr.created_at DESC│                           │
    │                        │◀─ rows[] ───────────────────│                           │
    │◀─ records[] ──────────│                              │                           │
    │                        │                              │                           │
    │ ┌────────────────────────────────────────────┐        │                           │
    │ │ Format kết quả thành prompt:               │        │                           │
    │ │ - Mã phiếu, thiết bị, trạng thái,         │        │                           │
    │ │   ưu tiên, người báo, ngày báo, ...        │        │                           │
    │ │ Thêm HumanMessage(prompt) vào messages[]   │        │                           │
    │ └────────────────────────────────────────────┘        │                           │
    │                        │                              │                           │
    │── llm.astream(messages) ──────────────────────────────────────────────────────────▶│
    │                        │                              │                           │
    │     ┌── loop: Stream tokens ──────────────────────────────────────────────┐       │
    │◀────│── chunk.content (phản hồi tự nhiên bằng tiếng Việt) ───────────────│──────│
    │     └─────────────────────────────────────────────────────────────────────┘       │
```

---

## 12. Luồng Báo Hỏng Thiết Bị (CREATE_REPAIR_REQUEST)

Luồng phức tạp nhất — bao gồm nhiều bước xác nhận trước khi tạo phiếu trong database.

```
         ┌─────────────────────────────────────┐
         │ 📩 Intent = CREATE_REPAIR_REQUEST   │
         │ params: asset_name, description     │
         └──────────────────┬──────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ Đủ thông tin?       │
                  │ asset_name AND      │
                  │ description != rỗng │
                  └──┬──────────────┬───┘
                     │              │
              ❌ Thiếu            ✅ Đủ
                     │              │
                     ▼              ▼
          ┌──────────────┐  ┌──────────────────────────┐
          │ 🔄 Yêu cầu  │  │ 🔍 query_assets(db,      │
          │ bổ sung:     │  │    asset_name)            │
          │ 1. Tên/Mã    │  │ Tìm thiết bị trong MySQL │
          │    thiết bị  │  └────────────┬─────────────┘
          │ 2. Mô tả     │               │
          │    sự cố     │               ▼
          └──────┬───────┘     ┌─────────────────┐
                 │             │ Kết quả tìm     │
                 │             │ kiếm?           │
                 │             └──┬──────┬────┬──┘
                 │                │      │    │
                 │          0 kết quả  >1    =1
                 │                │      │    │
                 │                ▼      ▼    ▼
                 │     ┌──────────┐ ┌──────┐ ┌──────────────────────────────┐
                 │     │❌ Không  │ │📋 DS │ │ ✅ create_repair_request()   │
                 │     │tìm thấy │ │nhiều │ │                              │
                 │     │Gợi ý    │ │thiết │ │ 1. INSERT INTO               │
                 │     │kiểm tra │ │bị    │ │    service_requests          │
                 │     │lại mã   │ │Yêu   │ │    (status=PENDING,          │
                 │     │máy      │ │cầu   │ │     priority=LOW)            │
                 │     │         │ │chọn  │ │                              │
                 │     │         │ │chính │ │ 2. UPDATE assets             │
                 │     │         │ │xác   │ │    SET status='BROKEN'       │
                 │     │         │ │Code  │ │                              │
                 │     └────┬────┘ └──┬───┘ │ 3. COMMIT transaction        │
                 │          │         │     └──────────┬───────────────────┘
                 │          │         │                │
                 │          │         │         ┌──────┴──────┐
                 │          │         │         │ Thành công? │
                 │          │         │         └──┬───────┬──┘
                 │          │         │            │       │
                 │          │         │         ✅ OK    ❌ Lỗi
                 │          │         │            │       │
                 │          │         │            ▼       ▼
                 │          │         │    ┌─────────┐ ┌──────────────┐
                 │          │         │    │🎉 Xác   │ │⚠️ Thông báo │
                 │          │         │    │nhận tạo │ │lỗi           │
                 │          │         │    │phiếu:   │ │ROLLBACK      │
                 │          │         │    │mã phiếu,│ │Hướng dẫn     │
                 │          │         │    │thiết bị,│ │thử lại       │
                 │          │         │    │trạng    │ └──────┬───────┘
                 │          │         │    │thái     │        │
                 │          │         │    └────┬────┘        │
                 │          │         │         │             │
                 ▼          ▼         ▼         ▼             ▼
          ┌────────────────────────────────────────────────────────┐
          │           🤖 Gemini Stream Response                   │
          │           (Phản hồi bằng tiếng Việt)                  │
          └────────────────────────────────────────────────────────┘
```

---

## 13. Luồng Chat Tự Do (GENERAL)

```
  rag_service                                              Gemini LLM
    │                                                          │
    │ Intent = GENERAL                                         │
    │ (chào hỏi, hỏi chức năng, chat tự do)                  │
    │                                                          │
    │ ┌──────────────────────────────────────────────┐         │
    │ │ Tạo System Prompt giới thiệu chatbot:       │         │
    │ │ 1. Hỏi đáp quy trình kỹ thuật (RAG)        │         │
    │ │ 2. Tra cứu trạng thái sửa chữa             │         │
    │ │ 3. Báo hỏng thiết bị qua chat              │         │
    │ │                                              │         │
    │ │ Thêm HumanMessage vào messages[]             │         │
    │ └──────────────────────────────────────────────┘         │
    │                                                          │
    │── llm.astream(messages) ────────────────────────────────▶│
    │                                                          │
    │     ┌── loop: Stream tokens ────────────────────┐        │
    │◀────│── chunk.content ──────────────────────────│───────│
    │     └───────────────────────────────────────────┘        │
```

---

## 14. Luồng Nạp Dữ Liệu (Data Ingestion)

Luồng **offline** — chạy một lần để nạp dữ liệu CSV vào ChromaDB trước khi sử dụng RAG.

```
  ┌─────────────────────────┐       ┌──────────────────────────────┐       ┌──────────────────────┐
  │ 📄 NGUỒN DỮ LIỆU CSV   │       │ ⚙️ scripts/ingest_csv.py     │       │ 💾 VECTOR STORE      │
  │                         │       │                              │       │                      │
  │ failure-QA-data.csv     │──────▶│ 1. CSVLoader (UTF-8)         │       │ HuggingFace          │
  │ (Hỏi đáp lỗi thiết bị) │       │    Đọc từng file CSV         │       │ Embeddings           │
  │                         │       │                              │       │ all-MiniLM-L6-v2     │
  │ system-guide-data.csv   │──────▶│ 2. Tách question/answer      │──────▶│                      │
  │ (Hướng dẫn hệ thống)   │       │    từ page_content           │       │         │            │
  │                         │       │                              │       │         ▼            │
  └─────────────────────────┘       │ 3. Tạo Document:             │       │ ChromaDB             │
                                    │    page_content: Q&A         │       │ ./vector_db/         │
                                    │    metadata:                 │       │ (vector_store        │
                                    │      source, language=vi     │       │  .add_documents())   │
                                    │                              │       │                      │
                                    └──────────────────────────────┘       └──────────────────────┘
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

```
  ┌─────────────────────────────────────┐          ┌─────────────────────────────────────────┐
  │         rag_chat_sessions           │          │           rag_chat_messages              │
  ├─────────────────────────────────────┤          ├─────────────────────────────────────────┤
  │ PK  id           VARCHAR(36) UUID   │──── 1:N ─▶│ PK  id            VARCHAR(36) UUID      │
  │     user_id      VARCHAR(255)       │          │ FK  session_id    → rag_chat_sessions.id │
  │     user_role    VARCHAR(50)        │          │     role          VARCHAR(50)            │
  │     title        VARCHAR(255)       │          │                   "user" | "assistant"   │
  │     created_at   DATETIME           │          │     content       TEXT                   │
  │     updated_at   DATETIME           │          │     metadata_json JSON (nullable)        │
  └─────────────────────────────────────┘          │     created_at    DATETIME               │
                                                   └─────────────────────────────────────────┘


  ┌──────────────────────────────┐         ┌──────────────────────────────────────────────────┐
  │           users              │         │              service_requests                     │
  ├──────────────────────────────┤         ├──────────────────────────────────────────────────┤
  │ PK  id        INT            │──┐      │ PK  id                   INT                     │
  │     username  VARCHAR        │  │      │ FK  asset_id             → assets.id              │
  │     role      VARCHAR        │  ├─ 1:N▶│ FK  reported_by_id       → users.id               │
  │               ADMIN |        │  │      │ FK  assigned_engineer_id → users.id               │
  │               MANAGER |      │  │      │     description          TEXT                     │
  │               DOCTOR |       │  └─ 1:N▶│     status               PENDING | IN_PROGRESS   │
  │               ENGINEER       │         │                          | COMPLETED              │
  └──────────────────────────────┘         │     priority             LOW | MEDIUM | HIGH      │
                                           │     created_at           DATETIME                 │
  ┌──────────────────────────────┐         │     completed_at         DATETIME (nullable)      │
  │           assets             │         └──────────────────────────────────────────────────┘
  ├──────────────────────────────┤                  ▲
  │ PK  id      INT              │──────── 1:N ─────┘
  │     code    VARCHAR          │
  │     name    VARCHAR          │
  │     status  ACTIVE | BROKEN  │
  │             | ...            │
  └──────────────────────────────┘
```

### Quan hệ:

- `rag_chat_sessions` **1 : N** `rag_chat_messages` (một phiên chứa nhiều tin nhắn)
- `users` **1 : N** `service_requests` (người dùng báo hỏng nhiều phiếu)
- `users` **1 : N** `service_requests` (kỹ thuật viên được giao nhiều phiếu)
- `assets` **1 : N** `service_requests` (một thiết bị có nhiều phiếu sửa chữa)

---

## 16. Phân Quyền RBAC

Hệ thống áp dụng **Role-Based Access Control** ở 2 tầng:

### Tầng 1: JWT Authentication (API Gateway)
- Mọi request phải có JWT token với `scope: rag:chat`
- Token chứa `username` và `role` của người dùng

### Tầng 2: Database Query Filtering (Data Layer)

```
                        ┌─────────────────────┐
                        │ 🔍 Truy vấn phiếu   │
                        │ sửa chữa            │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Vai trò           │
                        │   người dùng?       │
                        └──┬────┬────┬────┬───┘
                           │    │    │    │
                  DOCTOR   │    │    │    │ MANAGER
                           │    │    │    │
                           ▼    │    │    ▼
              ┌──────────────┐  │    │  ┌──────────────┐
              │ 👨‍⚕️ DOCTOR    │  │    │  │ 📊 MANAGER   │
              │ Chỉ xem phiếu│  │    │  │ Xem TOÀN BỘ │
              │ MÌNH TẠO     │  │    │  │ phiếu        │
              │ WHERE         │  │    │  │ Không lọc    │
              │ reported_by_id│  │    │  └──────────────┘
              │ = user_id     │  │    │
              └──────────────┘  │    │
                         ENGINEER    ADMIN
                                │    │
                                ▼    ▼
              ┌──────────────┐  ┌──────────────┐
              │ 🔧 ENGINEER  │  │ 👑 ADMIN     │
              │ Chỉ xem phiếu│  │ Xem TOÀN BỘ │
              │ ĐƯỢC GIAO    │  │ phiếu        │
              │ WHERE         │  │ Không lọc    │
              │ assigned_     │  └──────────────┘
              │ engineer_id   │
              │ = user_id     │
              └──────────────┘
```

---

## 17. Biến Môi Trường

| Biến               | Bắt Buộc | Giá Trị Mặc Định | Mô Tả                     |
| ------------------- | -------- | ----------------- | -------------------------- |
| `GOOGLE_API_KEY`    | ✅        | —                 | API key Google Gemini      |
| `RAG_JWT_SECRET`    | ✅        | —                 | Secret key mã hóa JWT     |
| `RAG_JWT_ISSUER`    | ❌        | `medical-backend` | Nhà phát hành JWT          |
| `RAG_JWT_AUDIENCE`  | ❌        | `rag-service`     | Đối tượng JWT              |
| `DATABASE_URL`      | ✅        | Hard-coded        | Connection string MySQL    |

---

## 18. Ranh Giới Module

```
  ┌─────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                         │
  │   ┌──────────────┐         ┌──────────────┐                                             │
  │   │ 🌐 API Layer │────────▶│ 🔐 Auth Layer│                                             │
  │   │ chat_routes  │         │ auth.py      │                                             │
  │   └──────┬───────┘         └──────────────┘                                             │
  │          │                                                                              │
  │          ▼                                                                              │
  │   ┌──────────────────────────────────────────────────────────────────────────────┐      │
  │   │                        📦 SERVICE LAYER                                      │      │
  │   │                                                                              │      │
  │   │   ┌──────────────────┐                                                       │      │
  │   │   │ chat_service.py  │──────┐                                                │      │
  │   │   │ Điều phối SSE    │      │                                                │      │
  │   │   └──────────────────┘      ▼                                                │      │
  │   │                      ┌──────────────────┐                                    │      │
  │   │                      │ rag_service.py   │                                    │      │
  │   │                      │ Dispatcher       │                                    │      │
  │   │                      └─┬──────┬─────┬───┘                                    │      │
  │   │                        │      │     │                                        │      │
  │   │              ┌─────────┘      │     └─────────┐                              │      │
  │   │              ▼                ▼               ▼                              │      │
  │   │  ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐                  │      │
  │   │  │ router_service   │ │ db_query_svc │ │ llm_service.py   │                  │      │
  │   │  │ Intent Classifier│ │ CSDL + RBAC  │ │ Gemini Client    │                  │      │
  │   │  └──────────────────┘ └──────┬───────┘ └────────┬─────────┘                  │      │
  │   │                              │                  │                            │      │
  │   │  ┌──────────────────┐        │                  │                            │      │
  │   │  │ retriever_svc    │        │                  │                            │      │
  │   │  │ Vector Search    │        │                  │    ┌──────────────────┐     │      │
  │   │  └──────────┬───────┘        │                  │    │ embedding_svc    │     │      │
  │   │             │                │                  │    │ Embedding        │     │      │
  │   └─────────────┼────────────────┼──────────────────┼────┴──────────────────┘     │      │
  │                 │                │                  │                             │      │
  │   ┌─────────────┼────────────────┼──────────────────┼────────────────────────┐    │      │
  │   │             │   📂 REPOSITORY LAYER             │                        │    │      │
  │   │             │   ┌──────────────────┐  ┌──────────────────┐               │    │      │
  │   │             │   │ session_repo     │  │ message_repo     │               │    │      │
  │   │             │   └────────┬─────────┘  └────────┬─────────┘               │    │      │
  │   └─────────────┼────────────┼─────────────────────┼─────────────────────────┘    │      │
  │                 │            │                     │                              │      │
  └─────────────────┼────────────┼─────────────────────┼──────────────────────────────┘      │
                    │            │                     │                                     │
                    ▼            ▼                     ▼                                     │
  ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
  │                           💾 DATA LAYER                                               │   │
  │                                                                                       │   │
  │        ┌──────────────────┐              ┌──────────────────┐                          │   │
  │        │ ChromaDB         │              │ MySQL            │                          │   │
  │        └──────────────────┘              └──────────────────┘                          │   │
  │                                                                                       │   │
  └───────────────────────────────────────────────────────────────────────────────────────┘   │
                                                                                              │
                                      ┌──────────────────┐                                    │
                                      │ 🌐 Google Gemini │◀───────────────────────────────────┘
                                      │ API (External)   │
                                      └──────────────────┘
```

### Bảng trách nhiệm Module:

| Module             | Trách Nhiệm                                                                           |
| ------------------ | -------------------------------------------------------------------------------------- |
| `app/api`          | HTTP endpoints, dependency injection, response type                                    |
| `app/auth`         | Xác thực JWT và tạo RagPrincipal                                                      |
| `app/core`         | Config, database engine, prompt template dùng chung                                    |
| `app/models`       | SQLAlchemy table mapping (ORM)                                                         |
| `app/repositories` | CRUD/query database                                                                    |
| `app/schemas`      | Pydantic request/response models                                                       |
| `app/services`     | Business logic: dispatching, intent classification, RAG, LLM streaming, DB query       |
| `scripts`          | Xử lý dữ liệu offline (ingestion)                                                     |
| `data`             | Nguồn dữ liệu CSV gốc                                                                 |
| `vector_db`        | ChromaDB persisted vectors                                                             |

---

> 📝 **Ghi chú**: Tài liệu này phản ánh chính xác mã nguồn hiện tại tại thời điểm viết. Code đã tích hợp đầy đủ RAG retrieval trong nhánh `Q_AND_A`, truy vấn database có RBAC cho `REPAIR_STATUS` và `CREATE_REPAIR_REQUEST`.
