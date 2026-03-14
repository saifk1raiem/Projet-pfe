from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    observer = "observer"
    user = "user"


def normalize_user_role(role: UserRole | str | None) -> UserRole | None:
    if role is None:
        return None
    if role == UserRole.user or role == "user":
        return UserRole.observer
    if isinstance(role, UserRole):
        return role
    return UserRole(role)


class SessionStatus(str, Enum):
    planned = "planned"
    ongoing = "ongoing"
    done = "done"
    canceled = "canceled"


class EtatQualifies(str, Enum):
    en_cours = "en_cours"
    non_associee = "non_associee"
    depassement = "depassement"
    qualifie = "qualifie"
