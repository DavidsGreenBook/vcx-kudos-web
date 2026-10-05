# Viettel CX - Peer Recognition Web Application (VCX Kudos)

Hệ thống Landing Page & Web App ghi nhận, tôn vinh đồng nghiệp (Peer Recognition & Kudos) nội bộ Viettel CX.

## 🚀 Tính năng chính
- **Tặng điểm Kudos & Huy hiệu**: Trao nhận điểm ghi nhận kèm các giá trị cốt lõi (Tận tâm, Sáng tạo, Thấu hiểu, Đồng đội, Bứt phá).
- **Bảng vinh danh (Leaderboard)**: Xếp hạng tuần, tháng và tổng điểm nhận được.
- **Dòng hoạt động thời gian thực (Live Feed)**: Cập nhật các lời khen, lời cảm ơn trong toàn tổ chức.
- **Hệ thống phần thưởng (Reward Store)**: Đổi điểm nhận quà lưu niệm và đặc quyền.
- **Reset hạn mức tự động**: Chu kỳ làm mới quỹ điểm trao tặng theo tuần/tháng.

## 🛠️ Công nghệ sử dụng
- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, Uvicorn, APScheduler.
- **Frontend**: HTML5, Vanilla CSS (Modern Glassmorphism & Viettel CX Branding), JavaScript (ES6+), Canvas Confetti.

## 📦 Cài đặt & Chạy ứng dụng

1. **Cài đặt thư viện phụ thuộc**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Khởi chạy máy chủ**:
   ```bash
   python run.py
   ```

3. **Truy cập ứng dụng**:
   - Web App: [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
