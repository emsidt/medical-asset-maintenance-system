import json
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.config import GOOGLE_API_KEY, GROQ_API_KEY
from langchain_groq import ChatGroq


logger = logging.getLogger(__name__)

# # Khởi tạo mô hình LLM với response_mime_type là JSON để đảm bảo đầu ra JSON hợp lệ
# router_llm = ChatGoogleGenerativeAI(
#     model="gemini-2.0-flash",
#     google_api_key=GOOGLE_API_KEY,
#     temperature=0.0,
#     response_mime_type="application/json"
# )

router_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    temperature=0.0,
    model_kwargs={
        "response_format": {
            "type": "json_object"
        }
    }
)


CLASSIFIER_SYSTEM_PROMPT = """
Bạn là một chuyên gia phân tích và phân loại ý định (intent classifier) cho chatbot quản lý bảo trì thiết bị y tế trong bệnh viện.
Nhiệm vụ của bạn là phân tích tin nhắn mới nhất của người dùng (kết hợp với ngữ cảnh lịch sử chat nếu có) để xác định ý định và trích xuất các tham số cần thiết dưới định dạng JSON.

Hãy phân loại tin nhắn vào một trong bốn nhóm ý định sau:

1. Q_AND_A:
   - Ý định: Hỏi đáp, tra cứu tài liệu kỹ thuật, hướng dẫn sử dụng, quy trình vệ sinh thiết bị, cách khắc phục sự cố lý thuyết.
   - Ví dụ: "Cách sửa lỗi E01 máy thở?", "Hướng dẫn vệ sinh máy siêu âm xách tay", "Quy trình bảo dưỡng máy ECG".
   - Tham số trích xuất: {"search_query": "<nội dung câu hỏi rút gọn để tìm kiếm trong Vector DB>"}

2. REPAIR_STATUS:
   - Ý định: Tra cứu trạng thái, tiến độ của các phiếu yêu cầu sửa chữa hoặc tình trạng thiết bị thực tế đang hỏng/sửa.
   - Ví dụ: "Máy siêu âm phòng 202 sửa đến đâu rồi?", "Phiếu sửa chữa số 12 trạng thái thế nào?", "Thiết bị của tôi đã được sửa xong chưa?"
   - Tham số trích xuất: {"query_term": "<mã thiết bị, tên thiết bị hoặc ID phiếu sửa chữa trích xuất được, hoặc chuỗi rỗng nếu người dùng chỉ hỏi chung chung về phiếu của họ>"}

3. CREATE_REPAIR_REQUEST:
   - Ý định: Người dùng muốn báo cáo thiết bị y tế bị hỏng, yêu cầu sửa chữa hoặc tạo phiếu sửa chữa mới.
   - Ví dụ: "Báo hỏng máy siêu âm xách tay phòng 202 bị lỗi màn hình", "Nhờ kỹ thuật sửa hộ cái máy ECG bị chập nguồn với", "Máy tạo oxy khoa cấp cứu hỏng rồi".
   - Tham số trích xuất: {"asset_name": "<tên thiết bị hoặc mã thiết bị muốn báo hỏng>", "description": "<mô tả chi tiết tình trạng hỏng hóc hoặc lý do báo hỏng>"}

4. GENERAL:
   - Ý định: Chào hỏi, trò chuyện tự do, cảm ơn hoặc các câu hỏi không liên quan đến 3 nhóm trên.
   - Ví dụ: "Chào bạn", "Cảm ơn nhé", "Bạn làm được những gì?", "Hôm nay thời tiết thế nào?"
   - Tham số trích xuất: {}

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Bạn chỉ được phép phản hồi dưới dạng một đối tượng JSON duy nhất có cấu trúc chính xác như sau:
{
  "intent": "Q_AND_A" | "REPAIR_STATUS" | "CREATE_REPAIR_REQUEST" | "GENERAL",
  "parameters": { ... }
}
Không kèm theo bất kỳ văn bản giải thích hay markdown code blocks nào ngoài chuỗi JSON này.
"""

async def classify_intent(message: str, history) -> dict:
    """
    Phân loại tin nhắn của người dùng dựa trên tin nhắn hiện tại và lịch sử trò chuyện.
    Trả về dict chứa 'intent' và 'parameters'.
    """
    messages = [
        SystemMessage(content=CLASSIFIER_SYSTEM_PROMPT)
    ]

    print("GOOGLE_API_KEY" + GOOGLE_API_KEY)
    
    # # Thêm lịch sử trò chuyện (tối đa 5 lượt gần nhất để không làm loãng phân loại)
    # history_limit = history[-10:] if len(history) > 10 else history
    # for msg in history_limit:
    #     if msg.role == "user":
    #         messages.append(HumanMessage(content=msg.content))
    #     else:
    #         messages.append(AIMessage(content=msg.content))
            
    # Thêm tin nhắn hiện tại
    messages.append(HumanMessage(content=message))
    
    try:
        response = await router_llm.ainvoke(messages)
        content = response.content.strip()
        logger.info(f"Classifier raw response: {content}")
        
        parsed = json.loads(content)
        intent = parsed.get("intent", "GENERAL")
        parameters = parsed.get("parameters", {})
        
        return {
            "intent": intent,
            "parameters": parameters
        }
    except Exception as e:
        logger.error(f"Error classifying intent: {e}")
        # Mặc định về GENERAL nếu xảy ra lỗi
        return {
            "intent": "GENERAL",
            "parameters": {}
        }
