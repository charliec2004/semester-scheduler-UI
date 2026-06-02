"""Tests for solver shift-length tuning helpers."""

from scheduler.config import FAVORED_MIN_SLOTS, MIN_SLOTS, hours_to_slots
from scheduler.engine.solver import (
    _minimum_department_block_slots,
    _minimum_shift_slots,
    _preferred_shift_slots,
    _shift_length_day_score,
)


def test_favored_minimum_uses_two_hours_when_enforced():
    assert _minimum_shift_slots(
        is_favored=True,
        enforce_favored_two_hour_minimum=True,
        standard_min_slots=MIN_SLOTS,
        favored_min_slots=FAVORED_MIN_SLOTS,
    ) == MIN_SLOTS


def test_favored_minimum_keeps_existing_one_hour_exemption_when_disabled():
    assert _minimum_shift_slots(
        is_favored=True,
        enforce_favored_two_hour_minimum=False,
        standard_min_slots=MIN_SLOTS,
        favored_min_slots=FAVORED_MIN_SLOTS,
    ) == FAVORED_MIN_SLOTS


def test_favored_department_block_minimum_uses_two_hours_when_enforced():
    assert _minimum_department_block_slots(
        is_favored=True,
        enforce_favored_two_hour_minimum=True,
        standard_min_slots=MIN_SLOTS,
        favored_min_slots=FAVORED_MIN_SLOTS,
    ) == MIN_SLOTS


def test_preferred_shift_length_caps_at_four_hours():
    assert _preferred_shift_slots(hours_to_slots(8)) == hours_to_slots(4)
    assert _preferred_shift_slots(hours_to_slots(3)) == hours_to_slots(3)


def test_shift_length_score_prefers_four_four_three_over_many_short_shifts():
    balanced = sum(
        _shift_length_day_score(day_slots, preferred_slots=hours_to_slots(4))
        for day_slots in [hours_to_slots(4), hours_to_slots(4), hours_to_slots(3), 0, 0]
    )
    short = sum(
        _shift_length_day_score(day_slots, preferred_slots=hours_to_slots(4))
        for day_slots in [hours_to_slots(2), hours_to_slots(2), hours_to_slots(2), hours_to_slots(2), hours_to_slots(3)]
    )

    assert balanced > short
