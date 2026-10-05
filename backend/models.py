from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=True)
    email = Column(String(150), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), default="Viettel CX")
    role = Column(String(100), default="Thành viên")
    avatar = Column(String(255), default="")
    giving_balance = Column(Integer, default=200)
    received_weekly = Column(Integer, default=0)
    received_monthly = Column(Integer, default=0)
    total_received = Column(Integer, default=0)

    # Relationships
    sent_transactions = relationship("Transaction", foreign_keys="Transaction.sender_id", back_populates="sender")
    received_transactions = relationship("Transaction", foreign_keys="Transaction.receiver_id", back_populates="receiver")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, nullable=False)
    message = Column(Text, nullable=False)
    badge = Column(String(50), default="Tận tâm") # Giá trị cốt lõi Viettel CX: Tận tâm, Sáng tạo, Đồng đội, Bứt phá, Thấu hiểu
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_transactions")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_transactions")
