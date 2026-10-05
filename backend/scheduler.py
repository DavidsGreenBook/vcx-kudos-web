from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime
from .database import SessionLocal
from .models import User

def reset_weekly_balances():
    """Reset giving_balance to 200 and received_weekly to 0 every Sunday at 23:59"""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            user.giving_balance = 200
            user.received_weekly = 0
        db.commit()
        print(f"[{datetime.now()}] [Cron] Reset weekly balances completed for {len(users)} users.")
    except Exception as e:
        db.rollback()
        print(f"[{datetime.now()}] [Cron Error] Weekly reset failed: {e}")
    finally:
        db.close()

def reset_monthly_balances():
    """Reset received_monthly to 0 at the end of every month"""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            user.received_monthly = 0
        db.commit()
        print(f"[{datetime.now()}] [Cron] Reset monthly balances completed for {len(users)} users.")
    except Exception as e:
        db.rollback()
        print(f"[{datetime.now()}] [Cron Error] Monthly reset failed: {e}")
    finally:
        db.close()

scheduler = BackgroundScheduler()

def start_scheduler():
    # Run Sunday at 23:59:00
    scheduler.add_job(
        reset_weekly_balances,
        trigger=CronTrigger(day_of_week='sun', hour=23, minute=59),
        id='weekly_reset_job',
        replace_existing=True
    )

    # Run at 00:00 on the 1st of every month to reset the previous month's score
    scheduler.add_job(
        reset_monthly_balances,
        trigger=CronTrigger(day='1', hour=0, minute=0),
        id='monthly_reset_job',
        replace_existing=True
    )

    scheduler.start()
    print(">> [Viettel CX] Background scheduler started: Weekly (Sun 23:59) & Monthly (1st 00:00).")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print(">> [Viettel CX] Background scheduler stopped.")
