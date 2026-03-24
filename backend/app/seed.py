from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.user import User


def default_password_hash() -> str:
    return hash_password(settings.SEED_DEFAULT_PASSWORD)


def seed() -> None:
    db = SessionLocal()
    try:
        existing_admin = db.scalar(select(User).where(User.email == settings.SEED_ADMIN_EMAIL))
        if existing_admin:
            print("Seed skipped: admin already exists")
            return

        admin = User(
            first_name="Saif",
            last_name="Kraiem",
            email=settings.SEED_ADMIN_EMAIL,
            password_hash=default_password_hash(),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Admin seed completed")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
