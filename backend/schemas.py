from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    department: Optional[str] = "Viettel CX"
    role: Optional[str] = "Thành viên"
    avatar: Optional[str] = ""

class UserResponse(UserBase):
    id: int
    giving_balance: int
    received_weekly: int
    received_monthly: int
    total_received: int

    class Config:
        from_attributes = True

class TransferRequest(BaseModel):
    sender_id: int = Field(..., description="ID của nhân viên tặng điểm")
    receiver_id: int = Field(..., description="ID của nhân viên nhận điểm")
    points: int = Field(..., gt=0, description="Số điểm gửi (phải lớn hơn 0)")
    message: str = Field(..., min_length=3, description="Lời cảm ơn / lý do vinh danh")
    badge: Optional[str] = Field("Tận tâm", description="Huy hiệu giá trị Viettel CX")

class TransactionResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = ""
    receiver_id: int
    receiver_name: str
    receiver_avatar: Optional[str] = ""
    points: int
    message: str
    badge: str
    created_at: datetime

    class Config:
        from_attributes = True

class LeaderboardUser(BaseModel):
    id: int
    name: str
    department: str
    avatar: str
    role: str
    points: int
    rank: int

class StatsResponse(BaseModel):
    total_recognitions: int
    total_points_sent: int
    active_employees: int
    current_week_points: int
