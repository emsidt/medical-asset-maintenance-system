from .retriever_service import retriever
from .llm_service import llm
from app.core.prompt import RAG_PROMPT
from langchain_core.messages import HumanMessage, AIMessage

async def ask_question(question: str, session_id: str, history):
    # 1. Truy xuất các tài liệu có độ tương đồng cao từ Vector DB
    docs = await retriever.ainvoke(question)
    context_str = "\n\n".join([doc.page_content for doc in docs])

    # 2. Xây dựng lịch sử trò chuyện thành các tin nhắn LangChain
    messages = []
    
    for message in history:
        if message.role == "user":
            messages.append(HumanMessage(content=message.content))
        else:
            messages.append(AIMessage(content=message.content))

    # 3. Cấu trúc Prompt RAG kết hợp Context và câu hỏi hiện tại
    formatted_prompt = RAG_PROMPT.format(context=context_str, question=question)
    messages.append(HumanMessage(content=formatted_prompt))

    # 4. Stream phản hồi trực tiếp từ Gemini LLM
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
