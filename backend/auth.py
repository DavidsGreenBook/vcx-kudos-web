import hashlib
import hmac
import base64
import json
import time
from typing import Optional, Dict, Any

# Secret key for simple JWT-like token signature
SECRET_KEY = "viettel_cx_peer_recognition_secret_key_2026"
SALT = "viettel_cx_salt_2026"

def hash_password(password: str) -> str:
    """Băm mật khẩu bằng SHA-256 kèm salt bí mật"""
    salted = f"{SALT}_{password}_{SALT}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Xác thực mật khẩu người dùng nhập với bản băm lưu trong DB"""
    return hash_password(password) == hashed

def create_access_token(user_id: int, username: str, expires_in_seconds: int = 86400 * 7) -> str:
    """Tạo token phiên đăng nhập đơn giản, an toàn không cần phụ thuộc thư viện ngoài"""
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": int(time.time()) + expires_in_seconds
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Kiểm tra tính hợp lệ và hạn của token"""
    if not token or "." not in token:
        return None
    try:
        payload_b64, signature = token.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Add padding back if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
            
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
