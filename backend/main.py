from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
import os
from contextlib import asynccontextmanager

from .database import engine, Base, get_db, SessionLocal
from .models import User, Transaction
from .schemas import (
    UserResponse,
    TransferRequest,
    TransactionResponse,
    LeaderboardUser,
    StatsResponse
)
from .seed_data import seed_initial_data
from .scheduler import start_scheduler, stop_scheduler, reset_weekly_balances, reset_monthly_balances

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Seed sample data
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    # Start scheduler
    start_scheduler()
    yield
    # Teardown scheduler
    stop_scheduler()

app = FastAPI(
    title="Viettel CX - Peer Recognition System API",
    description="Hệ thống vinh danh đồng nghiệp Viettel CX (Peer Recognition)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- API Endpoints ----------------- #

@app.get("/api/users", response_model=List[UserResponse], tags=["Users"])
def get_users(db: Session = Depends(get_db)):
    """Lấy danh sách toàn bộ nhân viên để hiển thị lựa chọn người nhận và thông tin cơ bản"""
    return db.query(User).all()

@app.get("/api/user/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một nhân viên và số quỹ điểm giving_balance còn lại"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")
    return user

@app.post("/api/transfer", response_model=TransactionResponse, tags=["Transactions"])
def transfer_points(payload: TransferRequest, db: Session = Depends(get_db)):
    """
    API xử lý logic tặng điểm đồng nghiệp:
    1. Kiểm tra không được tự tặng cho chính mình.
    2. Kiểm tra số điểm gửi hợp lệ (> 0).
    3. Kiểm tra số dư giving_balance của người gửi.
    4. Trừ điểm người gửi, cộng điểm tuần & tháng người nhận, lưu Transaction.
    """
    # 1. Edge Case: Self-transfer
    if payload.sender_id == payload.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự tặng điểm vinh danh cho chính mình."
        )

    # 2. Edge Case: Points validation
    if payload.points <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điểm vinh danh phải lớn hơn 0."
        )

    # 3. Retrieve Sender & Receiver
    sender = db.query(User).filter(User.id == payload.sender_id).first()
    receiver = db.query(User).filter(User.id == payload.receiver_id).first()

    if not sender:
        raise HTTPException(status_code=404, detail="Người gửi không tồn tại trong hệ thống.")
    if not receiver:
        raise HTTPException(status_code=404, detail="Người nhận không tồn tại trong hệ thống.")

    # 4. Check sender balance
    if sender.giving_balance < payload.points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số dư điểm của bạn ({sender.giving_balance} điểm) không đủ để tặng {payload.points} điểm."
        )

    # 5. Atomic Update
    try:
        sender.giving_balance -= payload.points
        receiver.received_weekly += payload.points
        receiver.received_monthly += payload.points
        receiver.total_received += payload.points

        new_transaction = Transaction(
            sender_id=sender.id,
            receiver_id=receiver.id,
            points=payload.points,
            message=payload.message.strip(),
            badge=payload.badge or "Tận tâm"
        )
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return TransactionResponse(
            id=new_transaction.id,
            sender_id=sender.id,
            sender_name=sender.name,
            sender_avatar=sender.avatar,
            receiver_id=receiver.id,
            receiver_name=receiver.name,
            receiver_avatar=receiver.avatar,
            points=new_transaction.points,
            message=new_transaction.message,
            badge=new_transaction.badge,
            created_at=new_transaction.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi xử lý giao dịch: {str(e)}")

@app.get("/api/leaderboard", response_model=List[LeaderboardUser], tags=["Leaderboard"])
def get_leaderboard(
    type: str = Query("weekly", pattern="^(weekly|monthly|all_time)$"),
    db: Session = Depends(get_db)
):
    """
    Bảng vàng vinh danh:
    - type=weekly: Sắp xếp theo received_weekly giảm dần
    - type=monthly: Sắp xếp theo received_monthly giảm dần
    - type=all_time: Sắp xếp theo total_received giảm dần
    """
    if type == "monthly":
        query = db.query(User).order_by(desc(User.received_monthly), desc(User.received_weekly))
    elif type == "all_time":
        query = db.query(User).order_by(desc(User.total_received))
    else:
        query = db.query(User).order_by(desc(User.received_weekly), desc(User.received_monthly))

    users = query.limit(10).all()
    results = []
    for rank, u in enumerate(users, start=1):
        if type == "monthly":
            pts = u.received_monthly
        elif type == "all_time":
            pts = u.total_received
        else:
            pts = u.received_weekly

        results.append(LeaderboardUser(
            id=u.id,
            name=u.name,
            department=u.department,
            avatar=u.avatar,
            role=u.role,
            points=pts,
            rank=rank
        ))
    return results

@app.get("/api/feed", response_model=List[TransactionResponse], tags=["Feed"])
def get_feed(limit: int = 20, db: Session = Depends(get_db)):
    """Bảng tin vinh danh mới nhất của mọi người trong đơn vị"""
    transactions = db.query(Transaction).order_by(desc(Transaction.created_at)).limit(limit).all()
    results = []
    for t in transactions:
        results.append(TransactionResponse(
            id=t.id,
            sender_id=t.sender.id,
            sender_name=t.sender.name,
            sender_avatar=t.sender.avatar,
            receiver_id=t.receiver.id,
            receiver_name=t.receiver.name,
            receiver_avatar=t.receiver.avatar,
            points=t.points,
            message=t.message,
            badge=t.badge,
            created_at=t.created_at
        ))
    return results

@app.get("/api/stats", response_model=StatsResponse, tags=["Stats"])
def get_stats(db: Session = Depends(get_db)):
    """Thống kê tổng quan hệ thống Viettel CX Peer Recognition"""
    total_tx = db.query(Transaction).count()
    total_pts = db.query(func.sum(Transaction.points)).scalar() or 0
    total_users = db.query(User).count()
    week_pts = db.query(func.sum(User.received_weekly)).scalar() or 0

    return StatsResponse(
        total_recognitions=total_tx,
        total_points_sent=total_pts,
        active_employees=total_users,
        current_week_points=week_pts
    )

# ----------------- Admin / Testing Endpoints ----------------- #

@app.post("/api/admin/reset-weekly", tags=["Admin & Testing"])
def trigger_reset_weekly():
    """Kích hoạt thủ công reset quỹ điểm tuần (200 điểm) và received_weekly về 0 cho mục đích demo/test"""
    reset_weekly_balances()
    return {"message": "Đã reset thành công quỹ điểm tuần về 200 điểm và điểm nhận tuần về 0!"}

@app.post("/api/admin/reset-monthly", tags=["Admin & Testing"])
def trigger_reset_monthly():
    """Kích hoạt thủ công reset điểm nhận tháng về 0 cho mục đích demo/test"""
    reset_monthly_balances()
    return {"message": "Đã reset thành công điểm nhận tháng về 0!"}

# ----------------- Frontend Static Serving ----------------- #

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    css_dir = os.path.join(FRONTEND_DIR, "css")
    js_dir = os.path.join(FRONTEND_DIR, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
def serve_index():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        return FileResponse(index_file, headers=headers)
    return {"message": "Viettel CX Peer Recognition API is running. Visit /docs for Swagger UI."}
