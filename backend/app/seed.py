from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enrollment import Enrollment
from app.models.enums import EtatQualifies, SessionStatus, UserRole
from app.models.formation import Formation
from app.models.training_session import TrainingSession
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

        observers_trainers = [
            User(
                first_name=fn,
                last_name=ln,
                email=f"{fn.lower()}.{ln.lower()}@{settings.SEED_EMAIL_DOMAIN}",
                password_hash=default_password_hash(),
                role=UserRole.observer,
                is_active=True,
            )
            for fn, ln in [("Ahmed", "Benali"), ("Meriem", "Gharbi"), ("Yassine", "Hammami")]
        ]
        db.add_all(observers_trainers)

        observers_collaborators = [
            User(
                first_name=f"Collab{i}",
                last_name="Leoni",
                email=f"collab{i}@{settings.SEED_EMAIL_DOMAIN}",
                password_hash=default_password_hash(),
                role=UserRole.observer,
                is_active=True,
            )
            for i in range(1, 11)
        ]
        db.add_all(observers_collaborators)
        db.flush()

        formations = [
            Formation(code="FOR-001", name="Securite Atelier", field="Securite", duration_days=2),
            Formation(code="FOR-002", name="Qualite Cablage", field="Qualite", duration_days=3),
            Formation(code="FOR-003", name="Lean Basics", field="Performance", duration_days=2),
            Formation(code="FOR-004", name="Maintenance Niveau 1", field="Maintenance", duration_days=4),
            Formation(code="FOR-005", name="ISO 9001", field="Conformite", duration_days=2),
        ]
        db.add_all(formations)
        db.flush()

        base_day = date.today()
        sessions = []
        for idx, formation in enumerate(formations, start=0):
            trainer = observers_trainers[idx % len(observers_trainers)]
            start = base_day + timedelta(days=idx * 3)
            sessions.append(
                TrainingSession(
                    formation_id=formation.id,
                    formateur_id=trainer.id,
                    start_date=start,
                    end_date=start + timedelta(days=1),
                    location=f"Salle {idx + 1}",
                    status=SessionStatus.planned,
                )
            )
        db.add_all(sessions)
        db.flush()

        etats = list(EtatQualifies)
        enrollment_rows = []
        for idx, collaborator in enumerate(observers_collaborators):
            target_session = sessions[idx % len(sessions)]
            enrollment_rows.append(
                Enrollment(
                    session_id=target_session.id,
                    collaborateur_id=collaborator.id,
                    etat_qualifies=etats[idx % len(etats)],
                    assigned_at=datetime.now(UTC),
                )
            )
        db.add_all(enrollment_rows)
        db.commit()
        print("Seed completed")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
