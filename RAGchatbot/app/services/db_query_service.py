import os
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

async def get_user_by_username(db: AsyncSession, username: str):
    """
    Truy vấn người dùng bằng username để lấy ID và Vai trò (Role)
    """
    try:
        query = text("SELECT id, username, role FROM users WHERE username = :username")
        result = await db.execute(query, {"username": username})
        row = result.fetchone()
        if row:
            return {"id": row[0], "username": row[1], "role": row[2]}
        return None
    except Exception as e:
        logger.error(f"Error in get_user_by_username: {e}")
        return None

async def query_assets(db: AsyncSession, term: str):
    """
    Tìm kiếm thiết bị y tế theo mã code hoặc tên
    """
    try:
        query = text("""
            SELECT id, code, name, status 
            FROM assets 
            WHERE code = :term OR name LIKE :term_like
        """)
        result = await db.execute(query, {"term": term, "term_like": f"%{term}%"})
        rows = result.fetchall()
        return [{"id": row[0], "code": row[1], "name": row[2], "status": row[3]} for row in rows]
    except Exception as e:
        logger.error(f"Error in query_assets: {e}")
        return []

async def query_repair_status(db: AsyncSession, term: str | None, username: str, user_role: str):
    """
    Truy vấn danh sách yêu cầu sửa chữa (ServiceRequest) kết hợp thông tin thiết bị (Asset),
    áp dụng bộ lọc phân quyền bảo mật RBAC dựa trên vai trò của user.
    """
    try:
        user = await get_user_by_username(db, username)
        if not user:
            logger.warning(f"User '{username}' not found in database users table.")
            return []
        
        user_id = user["id"]
        
        base_query = """
            SELECT sr.id, sr.description, sr.status, sr.priority, sr.created_at, sr.completed_at,
                   a.name as asset_name, a.code as asset_code,
                   u.username as reported_by, eng.username as assigned_engineer
            FROM service_requests sr
            JOIN assets a ON sr.asset_id = a.id
            JOIN users u ON sr.reported_by_id = u.id
            LEFT JOIN users eng ON sr.assigned_engineer_id = eng.id
        """
        
        filters = []
        params = {}
        
        # 1. Bộ lọc tìm kiếm từ người dùng (nếu có)
        if term and term.strip():
            term_clean = term.strip()
            if term_clean.isdigit():
                filters.append("(sr.id = :id_val OR a.code = :term OR a.name LIKE :term_like)")
                params["id_val"] = int(term_clean)
            else:
                filters.append("(a.code = :term OR a.name LIKE :term_like)")
            params["term"] = term_clean
            params["term_like"] = f"%{term_clean}%"
            
        # 2. Bộ lọc bảo mật RBAC
        if user_role == "DOCTOR":
            filters.append("sr.reported_by_id = :user_id")
            params["user_id"] = user_id
        elif user_role == "ENGINEER":
            filters.append("sr.assigned_engineer_id = :user_id")
            params["user_id"] = user_id
        # ADMIN và MANAGER không lọc, được xem toàn bộ
        
        if filters:
            sql = base_query + " WHERE " + " AND ".join(filters)
        else:
            sql = base_query
            
        sql += " ORDER BY sr.created_at DESC"
        
        query = text(sql)
        result = await db.execute(query, params)
        rows = result.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "description": row[1],
                "status": row[2],
                "priority": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "completed_at": row[5].isoformat() if row[5] else None,
                "asset_name": row[6],
                "asset_code": row[7],
                "reported_by": row[8],
                "assigned_engineer": row[9]
            })
        return results
    except Exception as e:
        logger.error(f"Error in query_repair_status: {e}")
        return []

async def create_repair_request(db: AsyncSession, asset_id: int, username: str, description: str):
    """
    Tạo yêu cầu báo hỏng mới (service_requests) và tự động đổi trạng thái thiết bị sang BROKEN.
    """
    try:
        user = await get_user_by_username(db, username)
        if not user:
            raise ValueError(f"Không tìm thấy người dùng có tài khoản '{username}'")
            
        user_id = user["id"]
        now = datetime.now()
        
        # 1. Chèn phiếu sửa chữa mới
        insert_query = text("""
            INSERT INTO service_requests (asset_id, reported_by_id, description, status, priority, created_at)
            VALUES (:asset_id, :reported_by_id, :description, 'PENDING', 'LOW', :now)
        """)
        await db.execute(insert_query, {
            "asset_id": asset_id,
            "reported_by_id": user_id,
            "description": description,
            "now": now
        })
        
        # 2. Truy vấn lấy ID phiếu vừa tạo
        last_id_query = text("""
            SELECT id FROM service_requests 
            WHERE asset_id = :asset_id AND reported_by_id = :reported_by_id 
            ORDER BY created_at DESC LIMIT 1
        """)
        result = await db.execute(last_id_query, {"asset_id": asset_id, "reported_by_id": user_id})
        row = result.fetchone()
        request_id = row[0] if row else None
        
        # 3. Cập nhật thiết bị thành BROKEN
        update_query = text("UPDATE assets SET status = 'BROKEN' WHERE id = :asset_id")
        await db.execute(update_query, {"asset_id": asset_id})
        
        await db.commit()
        return request_id
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in create_repair_request: {e}")
        raise e
