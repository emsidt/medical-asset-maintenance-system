import logging
from .retriever_service import retriever
from .llm_service import llm
from app.core.prompt import RAG_PROMPT
from langchain_core.messages import HumanMessage, AIMessage
from app.services.router_service import classify_intent
from app.services.db_query_service import (
    query_assets,
    query_repair_status,
    create_repair_request
)

logger = logging.getLogger(__name__)


def is_llm_configured() -> bool:
    return llm is not None


def format_repair_status_fallback(records, username: str) -> str:
    if not records:
        return f"Khong tim thay phieu sua chua nao phu hop voi tai khoan '{username}'."

    active_records = [
        record for record in records
        if str(record.get("status", "")).upper() not in {"COMPLETED", "DONE", "CLOSED"}
    ]
    display_records = active_records or records

    lines = ["Danh sach thiet bi/phieu sua chua hien tai:"]
    for record in display_records:
        lines.extend([
            "",
            f"- Phieu #{record['id']}: {record['asset_name']} ({record['asset_code']})",
            f"  Trang thai: {record['status']}",
            f"  Do uu tien: {record['priority']}",
            f"  Mo ta: {record['description']}",
            f"  Nguoi bao hong: {record['reported_by']}",
        ])
        if record.get("assigned_engineer"):
            lines.append(f"  Ky thuat vien phu trach: {record['assigned_engineer']}")
        if record.get("created_at"):
            lines.append(f"  Ngay tao: {record['created_at']}")
        if record.get("completed_at"):
            lines.append(f"  Ngay hoan thanh: {record['completed_at']}")

    lines.append("")
    if active_records:
        lines.append(f"Tong so phieu chua hoan thanh: {len(active_records)}.")
    else:
        lines.append("Khong co phieu dang xu ly; danh sach tren bao gom cac phieu gan day.")

    return "\n".join(lines)

async def ask_question(
    question: str,
    session_id: str,
    history,
    db,
    username: str,
    user_role: str
):
    """
    Hàm điều phối trung tâm (Dispatcher) của Chatbot RAG:
    1. Phân loại ý định của người dùng bằng router_service.
    2. Rẽ nhánh xử lý dựa vào ý định (Hỏi đáp quy trình, Tra cứu sửa chữa, Báo hỏng thiết bị, hoặc Chat tự do).
    3. Stream phản hồi trực tiếp từ Gemini LLM về client.
    """
    logger.info(f"Processing question in session '{session_id}' for user '{username}' ({user_role})")
    
    # 1. Phân loại ý định của người dùng
    classification = await classify_intent(question, history)
    intent = classification.get("intent", "GENERAL")
    params = classification.get("parameters", {})
    
    logger.info(f"Classified intent: {intent} with params: {params}")
    llm_fallback_answer = None

    # 2. Xây dựng lịch sử trò chuyện thành các tin nhắn LangChain
    messages = []
    for message in history:
        if message.role == "user":
            messages.append(HumanMessage(content=message.content))
        else:
            messages.append(AIMessage(content=message.content))

    # 3. Định tuyến và xử lý nghiệp vụ theo từng Intent cụ thể
    if intent == "Q_AND_A":
        search_query = params.get("search_query", question)
        # Truy xuất các tài liệu có độ tương đồng cao từ Vector DB Chroma
        docs = await retriever.ainvoke(search_query)
        context_str = "\n\n".join([doc.page_content for doc in docs])
        
        # Cấu trúc Prompt RAG kết hợp Context và câu hỏi hiện tại
        formatted_prompt = RAG_PROMPT.format(context=context_str, question=question)
        messages.append(HumanMessage(content=formatted_prompt))

    elif intent == "REPAIR_STATUS":
        query_term = params.get("query_term", "")
        # Gọi db_query_service để tìm kiếm phiếu sửa chữa (kèm bảo mật RBAC)
        records = await query_repair_status(db, query_term, username, user_role)
        llm_fallback_answer = format_repair_status_fallback(records, username)

        if not is_llm_configured():
            yield llm_fallback_answer
            return
        
        if not records:
            db_context = f"Không tìm thấy phiếu yêu cầu sửa chữa nào thuộc về tài khoản '{username}' khớp với từ khóa tìm kiếm '{query_term}'."
        else:
            # Định dạng dữ liệu thô từ database để đưa vào prompt LLM
            records_str = []
            for r in records:
                info = (
                    f"- Phiếu yêu cầu sửa chữa #{r['id']}:\n"
                    f"  + Thiết bị: {r['asset_name']} (Mã thiết bị: {r['asset_code']})\n"
                    f"  + Mô tả sự cố: {r['description']}\n"
                    f"  + Trạng thái xử lý: {r['status']}\n"
                    f"  + Độ ưu tiên: {r['priority']}\n"
                    f"  + Người báo hỏng: {r['reported_by']}\n"
                    f"  + Ngày báo hỏng: {r['created_at']}\n"
                )
                if r['completed_at']:
                    info += f"  + Ngày sửa xong: {r['completed_at']}\n"
                if r['assigned_engineer']:
                    info += f"  + Kỹ thuật viên phụ trách: {r['assigned_engineer']}\n"
                records_str.append(info)
            db_context = "\n\n".join(records_str)

        prompt = f"""
                Bạn là trợ lý ảo hỗ trợ quản trị và vận hành thiết bị y tế trong bệnh viện. 
                Người dùng đang hỏi bạn về trạng thái sửa chữa thiết bị hoặc kiểm tra các phiếu yêu cầu sửa chữa của họ.
                Dựa vào kết quả truy vấn dữ liệu thực tế từ cơ sở dữ liệu dưới đây, hãy phản hồi bằng Tiếng Việt một cách tự nhiên, chi tiết, chuyên nghiệp và thân thiện.
                Hãy tóm tắt và giải thích rõ tiến độ sửa chữa thiết bị cho họ.

                Dữ liệu truy vấn từ cơ sở dữ liệu (đã áp dụng phân quyền RBAC bảo mật):
                {db_context}

                Câu hỏi của người dùng:
                {question}
                """
        messages.append(HumanMessage(content=prompt))

    elif intent == "CREATE_REPAIR_REQUEST":
        asset_name = params.get("asset_name", "")
        description = params.get("description", "")

        # Nếu thiếu thông tin thiết bị hoặc mô tả lỗi, yêu cầu người dùng làm rõ
        if not asset_name or not description:
            prompt = """
                    Người dùng đang có ý định báo hỏng thiết bị y tế nhưng chưa cung cấp đầy đủ thông tin cần thiết.
                    Hãy trả lời lịch sự bằng Tiếng Việt, đề nghị họ bổ sung các thông tin còn thiếu sau:
                    1. Tên chính xác hoặc Mã thiết bị (Code) cần báo hỏng.
                    2. Mô tả chi tiết tình trạng sự cố (ví dụ: máy không bật lên được, lỗi màn hình nhấp nháy, v.v.).
                    """
            messages.append(HumanMessage(content=prompt))
        else:
            # Tìm kiếm thiết bị trong cơ sở dữ liệu
            assets = await query_assets(db, asset_name)
            
            if not assets:
                prompt = f"""
                        Không tìm thấy thiết bị y tế nào khớp với tên hoặc mã "{asset_name}" trong cơ sở dữ liệu hệ thống.
                        Hãy phản hồi lịch sự bằng Tiếng Việt, thông báo không tìm thấy thiết bị y tế này và gợi ý người dùng kiểm tra lại mã máy hoặc tên thiết bị chính xác dán trên thân máy.
                        """
                messages.append(HumanMessage(content=prompt))
            elif len(assets) > 1:
                # Tìm thấy nhiều thiết bị trùng khớp, yêu cầu chọn chính xác
                assets_str = []
                for a in assets:
                    assets_str.append(f"- Thiết bị: {a['name']} | Mã máy (Code): {a['code']} | Trạng thái: {a['status']}")
                assets_list = "\n".join(assets_str)
                
                prompt = f"""
                        Hệ thống tìm thấy nhiều thiết bị y tế khớp với thông tin báo hỏng "{asset_name}":
                        {assets_list}

                        Hãy hiển thị danh sách này bằng Tiếng Việt một cách dễ nhìn và đề nghị người dùng cung cấp chính xác Mã thiết bị (Code) muốn báo hỏng để tiến hành tạo phiếu sửa chữa.
                        """
                messages.append(HumanMessage(content=prompt))
            else:
                # Tìm thấy duy nhất 1 thiết bị phù hợp, tiến hành tạo phiếu báo hỏng
                matched_asset = assets[0]
                try:
                    req_id = await create_repair_request(db, matched_asset["id"], username, description)
                    
                    prompt = f"""
Bạn đã tạo thành công phiếu báo hỏng và yêu cầu sửa chữa trong hệ thống:
- Mã số phiếu yêu cầu: #{req_id}
- Thiết bị y tế: {matched_asset['name']} (Mã thiết bị: {matched_asset['code']})
- Trạng thái thiết bị: BROKEN (Đã chuyển sang trạng thái hỏng)
- Trạng thái phiếu sửa chữa: PENDING (Chờ xử lý)
- Mô tả sự cố: {description}

Hãy viết một phản hồi bằng Tiếng Việt một cách chuyên nghiệp, chúc mừng việc báo hỏng thành công, cung cấp đầy đủ thông tin phiếu sửa chữa vừa lập để người dùng theo dõi và gửi lời cam kết kỹ thuật viên sẽ xử lý sớm.
"""
                    messages.append(HumanMessage(content=prompt))
                except Exception as e:
                    prompt = f"""
Đã xảy ra lỗi kỹ thuật khi lưu phiếu sửa chữa vào cơ sở dữ liệu: {str(e)}.
Hãy gửi lời xin lỗi chân thành đến người dùng bằng Tiếng Việt và hướng dẫn họ thử lại sau ít phút hoặc liên hệ trực tiếp bộ phận Quản trị kỹ thuật.
"""
                    messages.append(HumanMessage(content=prompt))

    else:  # GENERAL
        if not is_llm_configured():
            yield (
                "RAG service dang chay va ket noi duoc database, nhung chua cau hinh "
                "GROQ_API_KEY/GOOGLE_API_KEY nen chua the goi LLM de tao cau tra loi tu nhien. "
                "Ban co the hoi cac cau ve trang thai sua chua de minh tra truc tiep tu database."
            )
            return

        prompt = f"""
Bạn là trợ lý ảo hỗ trợ quản lý bảo trì thiết bị y tế tại bệnh viện. 
Hãy phản hồi bằng Tiếng Việt một cách thân thiện, cởi mở và nhiệt tình. 
Nếu người dùng chào hỏi hoặc hỏi về chức năng của bạn, hãy giới thiệu rằng bạn có thể hỗ trợ các nghiệp vụ sau:
1. Trả lời các câu hỏi về hướng dẫn sử dụng, quy trình kỹ thuật, cách vệ sinh và khắc phục lỗi cơ bản của thiết bị y tế (dựa trên tài liệu hệ thống).
2. Tra cứu tức thì trạng thái sửa chữa, thông tin chi tiết các phiếu sửa chữa của cá nhân (được phân quyền bảo mật).
3. Tạo yêu cầu báo hỏng thiết bị y tế trực tiếp qua chat (chỉ cần cung cấp tên máy và mô tả lỗi).

Câu hỏi hiện tại của người dùng:
{question}
"""
        messages.append(HumanMessage(content=prompt))

    # 4. Stream phản hồi trực tiếp từ LLM
    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as exc:
        logger.exception("Error streaming LLM response: %s", exc)
        if llm_fallback_answer:
            yield llm_fallback_answer
            return

        yield (
            "RAG service da nhan cau hoi nhung khong the goi LLM luc nay. "
            "Vui long kiem tra GROQ_API_KEY/GOOGLE_API_KEY hoac ket noi mang cua RAG service."
        )
