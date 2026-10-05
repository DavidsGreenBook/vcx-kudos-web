from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .models import User, Transaction

SAMPLE_USERS = [
    {
        "id": 1,
        "name": "Nguyễn Văn An",
        "department": "Viettel CX - Thiết kế Giải pháp",
        "role": "CX Solution Architect",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 140,
        "received_weekly": 160,
        "received_monthly": 420,
        "total_received": 1250
    },
    {
        "id": 2,
        "name": "Trần Thị Mai",
        "department": "Viettel CX - Chăm sóc Khách hàng",
        "role": "CX Operation Lead",
        "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 90,
        "received_weekly": 210,
        "received_monthly": 580,
        "total_received": 1890
    },
    {
        "id": 3,
        "name": "Lê Hoàng Nam",
        "department": "Viettel CX - Kỹ thuật & Tự động hoá",
        "role": "Automation Engineer",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 170,
        "received_weekly": 120,
        "received_monthly": 340,
        "total_received": 980
    },
    {
        "id": 4,
        "name": "Phạm Thu Hương",
        "department": "Viettel CX - Nghiên cứu Hành vi Khách hàng",
        "role": "CX Research Specialist",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 110,
        "received_weekly": 190,
        "received_monthly": 490,
        "total_received": 1420
    },
    {
        "id": 5,
        "name": "Vũ Đình Khoa",
        "department": "Viettel CX - Quản lý Trải nghiệm Kênh số",
        "role": "Digital CX Product Owner",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 180,
        "received_weekly": 90,
        "received_monthly": 280,
        "total_received": 760
    },
    {
        "id": 6,
        "name": "Đặng Mỹ Linh",
        "department": "Viettel CX - Đảm bảo Chất lượng Dịch vụ",
        "role": "QA & Customer Voice Lead",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 130,
        "received_weekly": 140,
        "received_monthly": 390,
        "total_received": 1100
    },
    {
        "id": 7,
        "name": "Hoàng Quốc Bảo",
        "department": "Viettel CX - Dữ liệu Phân tích Khách hàng",
        "role": "Data Analyst",
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 150,
        "received_weekly": 80,
        "received_monthly": 260,
        "total_received": 690
    },
    {
        "id": 8,
        "name": "Đỗ Hải Yến",
        "department": "Viettel CX - Truyền thông & Văn hóa Trải nghiệm",
        "role": "Internal CX Champion",
        "avatar": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
        "giving_balance": 200,
        "received_weekly": 110,
        "received_monthly": 310,
        "total_received": 850
    }
]

SAMPLE_TRANSACTIONS = [
    {
        "sender_id": 1,
        "receiver_id": 2,
        "points": 50,
        "badge": "Tận tâm",
        "message": "Cảm ơn chị Mai đã hỗ trợ nhóm xử lý gấp phản ánh của khách hàng VIP trong tối hôm qua rất chuyên nghiệp và ân cần! 🌟",
        "hours_ago": 2
    },
    {
        "sender_id": 4,
        "receiver_id": 3,
        "points": 40,
        "badge": "Sáng tạo",
        "message": "Cảm ơn anh Nam đã tự động hóa luồng báo cáo khảo sát CSAT, giúp phòng tiết kiệm được 4 giờ xử lý dữ liệu mỗi tuần! 🚀",
        "hours_ago": 5
    },
    {
        "sender_id": 2,
        "receiver_id": 4,
        "points": 30,
        "badge": "Thấu hiểu",
        "message": "Bản báo cáo Customer Journey Map của Hương phân tích insight khách hàng Gen Z rất sâu sắc và thực tế. Chúc mừng em! 👏",
        "hours_ago": 8
    },
    {
        "sender_id": 3,
        "receiver_id": 1,
        "points": 30,
        "badge": "Đồng đội",
        "message": "Anh An đã luôn đồng hành và hướng dẫn nhiệt tình lúc hệ thống gặp lỗi tải cao chiều thứ Năm. Trân trọng tinh thần đồng đội của anh! 🤝",
        "hours_ago": 16
    },
    {
        "sender_id": 5,
        "receiver_id": 6,
        "points": 20,
        "badge": "Bứt phá",
        "message": "Chị Linh đã kiểm soát chất lượng kịch bản tư vấn mới rất chuẩn xác, đạt chỉ số FCR (First Contact Resolution) 94% tuần này! 🎯",
        "hours_ago": 26
    }
]

def seed_initial_data(db: Session):
    existing_users = db.query(User).count()
    if existing_users == 0:
        for u_data in SAMPLE_USERS:
            user = User(**u_data)
            db.add(user)
        db.commit()

        for t_data in SAMPLE_TRANSACTIONS:
            hours = t_data.pop("hours_ago")
            created_at = datetime.utcnow() - timedelta(hours=hours)
            trans = Transaction(
                **t_data,
                created_at=created_at
            )
            db.add(trans)
        db.commit()
        print(">> [Viettel CX] Initial seed data created successfully.")
