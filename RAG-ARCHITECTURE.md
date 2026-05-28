# Kien truc du an RAG Chatbot

Tai lieu nay mo ta kien truc theo code hien tai cua repository `RAGchatbot`.

## 1. Tong quan

Du an la backend chatbot dung FastAPI, LangChain, Gemini, ChromaDB va MySQL.

He thong co 3 nhom chuc nang chinh:

- API HTTP cho tao phien chat va stream cau tra loi.
- Persistence luu session va message vao MySQL bang SQLAlchemy async.
- Thanh phan AI gom LLM Gemini, LangChain agent, embedding HuggingFace va vector store ChromaDB.

Luu y: code hien tai da khoi tao `retriever` tu ChromaDB, nhung luong hoi dap trong `app/services/rag_service.py` chua dung retriever va chua dua context tu vector DB vao prompt. Vi vay ung dung hien tai hoat dong nhu chatbot streaming co lich su hoi thoai, chua phai RAG day du trong runtime.

## 2. Cong nghe

| Thanh phan | Cong nghe |
|---|---|
| Web framework | FastAPI |
| ASGI server | Uvicorn |
| LLM orchestration | LangChain |
| LLM provider | Google Gemini qua `langchain-google-genai` |
| Model hien tai | `gemini-2.5-flash` |
| Embedding | `sentence-transformers/all-MiniLM-L6-v2` |
| Vector store | ChromaDB |
| Database | MySQL |
| ORM | SQLAlchemy async |
| MySQL async driver | aiomysql |
| Auth | JWT Bearer, HS256 |
| Schema validation | Pydantic |

## 3. Cau truc thu muc

```text
RAGchatbot/
|-- app/
|   |-- __main__.py              # FastAPI app, lifespan, include router
|   |-- init_db.py               # Tao bang database khi app startup
|   |-- api/
|   |   |-- chat_routes.py       # Endpoint /sessions va /stream
|   |-- auth/
|   |   |-- auth.py              # JWT Bearer authentication
|   |-- core/
|   |   |-- config.py            # Load GOOGLE_API_KEY tu .env
|   |   |-- database.py          # Async SQLAlchemy engine/session/Base
|   |   |-- prompt.py            # Prompt RAG, hien chua duoc dung trong runtime
|   |   |-- security.py
|   |-- models/
|   |   |-- chat_session.py      # SQLAlchemy model rag_chat_sessions
|   |   |-- chat_message.py      # SQLAlchemy model rag_chat_messages
|   |-- repositories/
|   |   |-- session_repository.py
|   |   |-- message_repository.py
|   |-- schemas/
|   |   |-- chat.py              # ChatStreamRequest
|   |   |-- session.py           # CreateSessionResponse
|   |-- services/
|       |-- chat_service.py      # Luu message, stream token, luu assistant answer
|       |-- rag_service.py       # LangChain agent streaming
|       |-- llm_service.py       # Gemini client
|       |-- retriever_service.py # Chroma retriever
|       |-- embedding_service.py # Embedding model va Chroma vector_store
|-- data/
|   |-- failure-QA-data/
|   |-- system-guide-data/
|-- scripts/
|   |-- ingest_csv.py            # Doc CSV va format thanh Document
|-- vector_db/                   # Chroma persistent storage
|-- requirements.txt
|-- .env
```

## 4. Entry point va lifecycle

Entry point FastAPI nam o `app/__main__.py`.

Khi ung dung khoi dong:

1. FastAPI chay lifespan.
2. `init_models()` duoc goi.
3. `Base.metadata.create_all` tao cac bang SQLAlchemy neu chua ton tai.
4. Router trong `app/api/chat_routes.py` duoc include vao app.

Lenh chay phu hop voi cau truc hien tai:

```bash
uvicorn app.__main__:app --reload
```

## 5. API layer

File chinh: `app/api/chat_routes.py`.

### `POST /sessions`

Tao mot chat session moi.

Dependency:

- `get_current_principal`: doc va verify JWT Bearer token.
- `get_db`: cap `AsyncSession`.

Xu ly:

1. Lay `username` va `role` tu JWT principal.
2. Goi `create_session`.
3. Tra ve `sessionId`, `title`, `createdAt`.

Response schema: `CreateSessionResponse`.

### `POST /stream`

Stream cau tra loi cua chatbot bang Server-Sent Events.

Request schema:

```json
{
  "sessionId": "uuid",
  "message": "noi dung nguoi dung",
  "context": {}
}
```

Xu ly:

1. Verify JWT.
2. Lay DB session.
3. Goi `stream_chat(...)`.
4. Tra ve `StreamingResponse` voi `media_type="text/event-stream"`.

Event stream hien tai co 2 loai event:

```text
event: token
data: <token text>

event: done
data: <assistant_message_id>
```

## 6. Auth

File chinh: `app/auth/auth.py`.

He thong dung `HTTPBearer` va JWT HS256. Token phai co:

- `sub`: username.
- `role`: role cua user.
- `scope`: bat buoc bang `rag:chat`.
- `iss`: mac dinh `medical-backend`, co the override bang `RAG_JWT_ISSUER`.
- `aud`: mac dinh `rag-service`, co the override bang `RAG_JWT_AUDIENCE`.

Secret lay tu bien moi truong:

```text
RAG_JWT_SECRET
```

Neu token sai, API tra `401`. Neu thieu scope, API tra `403`.

## 7. Database layer

File chinh: `app/core/database.py`.

Ung dung dung SQLAlchemy async engine voi MySQL qua `aiomysql`.

Cac model:

### `ChatSession`

Bang: `rag_chat_sessions`

Cot chinh:

- `id`: UUID string, primary key.
- `user_id`: user tao session.
- `user_role`: role cua user.
- `title`: tieu de session.
- `created_at`: thoi diem tao.
- `updated_at`: thoi diem cap nhat.

### `ChatMessage`

Bang: `rag_chat_messages`

Cot chinh:

- `id`: UUID string, primary key.
- `session_id`: foreign key toi `rag_chat_sessions.id`.
- `role`: `user` hoac `assistant`.
- `content`: noi dung message.
- `metadata_json`: JSON metadata tuy chon.
- `created_at`: thoi diem tao.

Repositories:

- `session_repository.py`: tao va lay session.
- `message_repository.py`: luu message va lay lich su message theo session.

## 8. Service layer

### `chat_service.py`

Day la orchestration service cho endpoint `/stream`.

Luong xu ly:

```text
user message
    |
    v
save user message vao MySQL
    |
    v
load history cua session
    |
    v
goi ask_question(...)
    |
    v
yield tung token SSE ve client
    |
    v
save full assistant answer vao MySQL
    |
    v
yield event done voi assistant_message.id
```

### `rag_service.py`

File nay tao LangChain agent:

```python
agent = create_agent(
    model=llm,
    tools=[]
)
```

`ask_question(question, session_id, history)`:

1. Chuyen lich su message tu database thanh danh sach `{role, content}`.
2. Them `HumanMessage(content=question)`.
3. Goi `agent.astream(..., stream_mode="messages")`.
4. Chi lay token tu node `model`.
5. Yield tung text block cho `chat_service`.

Ghi chu kien truc:

- `retriever` duoc import nhung chua duoc dung.
- `RAG_PROMPT` chua duoc dung.
- Agent chua co tools.
- Chua co buoc retrieve documents tu ChromaDB de dua vao context.

### `llm_service.py`

Khoi tao Gemini chat model:

```python
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY
)
```

`GOOGLE_API_KEY` duoc load tu `.env` qua `app/core/config.py`.

### `retriever_service.py`

Khoi tao embedding va vector store:

```python
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vector_store = Chroma(
    persist_directory="./vector_db",
    embedding_function=embedding_model
)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)
```

Thanh phan nay san sang cho RAG, nhung hien chua duoc tich hop vao `ask_question`.

## 9. Du lieu va vector store

Thu muc `data/` hien co 2 nguon CSV:

- `data/failure-QA-data/failure-QA-data.csv`
- `data/system-guide-data/system-guide-data.csv`

Thu muc `vector_db/` la Chroma persistent storage.

Script `scripts/ingest_csv.py` hien tai:

1. Doc 2 file CSV bang `CSVLoader`.
2. Tach `question` va `answer` tu `page_content`.
3. Tao `Document` moi voi metadata `source` va `language="vi"`.
4. Tra ve danh sach documents.

Ghi chu: script hien tai moi format va return documents, chua co phan ghi documents vao ChromaDB bang `Chroma.from_documents(...)` hoac `vector_store.add_documents(...)`.

## 10. Luong request runtime hien tai

```text
Client
  |
  | POST /sessions + Bearer JWT
  v
FastAPI route
  |
  v
Auth verify JWT
  |
  v
MySQL: tao rag_chat_sessions
  |
  v
Client nhan sessionId

Client
  |
  | POST /stream + sessionId + message + Bearer JWT
  v
FastAPI route
  |
  v
Auth verify JWT
  |
  v
chat_service.stream_chat
  |
  v
MySQL: luu user message
  |
  v
MySQL: load history
  |
  v
rag_service.ask_question
  |
  v
LangChain agent -> Gemini
  |
  v
SSE token stream ve client
  |
  v
MySQL: luu assistant message
  |
  v
SSE done event
```

## 11. Luong RAG mong muon neu hoan thien

Kien truc RAG day du nen co them buoc retrieval trong `ask_question`:

```text
question
  |
  v
retriever.invoke(question)
  |
  v
top-k documents tu ChromaDB
  |
  v
format context + history + question vao prompt
  |
  v
Gemini
  |
  v
stream answer
```

De dat duoc luong nay, can:

- Hoan thien `scripts/ingest_csv.py` de ghi documents vao `vector_db`.
- Dung `retriever` trong `rag_service.py`.
- Dung `RAG_PROMPT` hoac prompt/chat template tuong duong.
- Can nhac luu metadata documents da retrieve vao `metadata_json` cua assistant message.

## 12. Bien moi truong

Ung dung can cac bien moi truong sau:

```text
GOOGLE_API_KEY
RAG_JWT_SECRET
RAG_JWT_ISSUER      # tuy chon, default: medical-backend
RAG_JWT_AUDIENCE    # tuy chon, default: rag-service
```

Database URL hien dang duoc hard-code trong `app/core/database.py`. Ve kien truc nen chuyen sang bien moi truong, vi day la thong tin phu thuoc moi truong deploy va co the chua secret.

## 13. Ranh gioi module

| Module | Trach nhiem |
|---|---|
| `app/api` | HTTP endpoints, dependency injection, response type |
| `app/auth` | Xac thuc JWT va tao principal |
| `app/core` | Config, database engine, prompt dung chung |
| `app/models` | SQLAlchemy table mapping |
| `app/repositories` | CRUD/query database |
| `app/schemas` | Pydantic request/response models |
| `app/services` | Business flow, LLM, RAG, streaming |
| `scripts` | Xu ly du lieu offline |
| `data` | Nguon du lieu CSV |
| `vector_db` | Chroma persisted vectors |

## 14. Cac diem can luu y

- `context` trong `ChatStreamRequest` hien chua duoc su dung.
- `/stream` khong kiem tra session co ton tai hay session co thuoc user hien tai khong.
- Database URL dang hard-code.
- `app/core/prompt.py` co noi dung tieng Viet bi loi encoding trong file hien tai.
- `AR.md` co noi dung kien truc cu, khong khop hoan toan voi code hien tai.
- Cac file `__pycache__` va `vector_db` dang nam trong repo; nen can nhac `.gitignore` neu day khong phai artifact muon version control.
