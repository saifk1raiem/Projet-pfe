from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta


REPORTING_MONTHS = 2


def shift_month(day: date, months: int) -> date:
    month_index = (day.year * 12 + day.month - 1) + months
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(day.day, monthrange(year, month)[1]))


def get_reporting_period_bounds(reference_day: date, months: int = REPORTING_MONTHS) -> tuple[date, date]:
    if months < 1:
        raise ValueError("months must be >= 1")

    return shift_month(reference_day, -months), reference_day


def get_previous_reporting_period_bounds(reference_day: date, months: int = REPORTING_MONTHS) -> tuple[date, date]:
    current_period_start, _ = get_reporting_period_bounds(reference_day, months=months)
    previous_period_end = current_period_start - timedelta(days=1)
    previous_period_start = shift_month(previous_period_end, -months)
    return previous_period_start, previous_period_end
