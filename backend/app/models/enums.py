from enum import Enum


class UserRole(str, Enum):
    super_admin = "super_admin"
    admin = "admin"
    observer = "observer"


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
