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


class PlanningPeriod(str, Enum):
    morning = "morning"
    evening = "evening"


class PlanningClassroom(str, Enum):
    class_1 = "class_1"
    class_2 = "class_2"
    intermediate = "intermediate"


class EtatQualifies(str, Enum):
    en_cours = "en_cours"
    non_associee = "non_associee"
    depassement = "depassement"
    qualifie = "qualifie"
