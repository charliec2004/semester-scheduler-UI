"""Tests for disabling the built-in Front Desk role."""

from __future__ import annotations

import pandas as pd
from ortools.sat.python import cp_model

from scheduler.config import DAY_NAMES, TIME_SLOT_STARTS
from scheduler.domain.models import TimesetRequest
from scheduler.engine.solver import solve_schedule


def _make_staff_row(name: str, roles: str) -> dict[str, object]:
    row: dict[str, object] = {
        "name": name,
        "roles": roles,
        "target_hours": 0,
        "max_hours": 8,
        "year": 2,
    }
    for day in DAY_NAMES:
        for time in TIME_SLOT_STARTS:
            row[f"{day}_{time}"] = 1
    return row


def test_solve_schedule_without_front_desk_role_when_disabled(tmp_path):
    staff_csv = tmp_path / "staff.csv"
    requirements_csv = tmp_path / "requirements.csv"
    output_path = tmp_path / "schedule.xlsx"

    pd.DataFrame([
        _make_staff_row("Alice", "marketing"),
    ]).to_csv(staff_csv, index=False)
    pd.DataFrame([
        {"department": "Marketing", "target_hours": 0, "max_hours": 8},
    ]).to_csv(requirements_csv, index=False)

    status = solve_schedule(
        staff_csv=staff_csv,
        requirements_csv=requirements_csv,
        output_path=output_path,
        solver_max_time=1,
        front_desk_enabled=False,
    )

    assert status in {cp_model.OPTIMAL, cp_model.FEASIBLE}
    assert output_path.exists()


def test_front_desk_timeset_is_rejected_when_disabled(tmp_path):
    staff_csv = tmp_path / "staff.csv"
    requirements_csv = tmp_path / "requirements.csv"
    output_path = tmp_path / "schedule.xlsx"

    pd.DataFrame([
        _make_staff_row("Alice", "marketing"),
    ]).to_csv(staff_csv, index=False)
    pd.DataFrame([
        {"department": "Marketing", "target_hours": 0, "max_hours": 8},
    ]).to_csv(requirements_csv, index=False)

    try:
        solve_schedule(
            staff_csv=staff_csv,
            requirements_csv=requirements_csv,
            output_path=output_path,
            solver_max_time=1,
            front_desk_enabled=False,
            timeset_requests=[
                TimesetRequest(
                    employee="Alice",
                    day="Mon",
                    department="front_desk",
                    start_slot=0,
                    end_slot=1,
                )
            ],
        )
        assert False, "Should have raised ValueError for front desk timeset while disabled"
    except ValueError as exc:
        assert "Front Desk is disabled" in str(exc)


def test_front_desk_department_row_is_rejected_when_disabled(tmp_path):
    staff_csv = tmp_path / "staff.csv"
    requirements_csv = tmp_path / "requirements.csv"
    output_path = tmp_path / "schedule.xlsx"

    pd.DataFrame([
        _make_staff_row("Alice", "marketing"),
    ]).to_csv(staff_csv, index=False)
    pd.DataFrame([
        {"department": "Front Desk", "target_hours": 0, "max_hours": 8},
        {"department": "Marketing", "target_hours": 0, "max_hours": 8},
    ]).to_csv(requirements_csv, index=False)

    try:
        solve_schedule(
            staff_csv=staff_csv,
            requirements_csv=requirements_csv,
            output_path=output_path,
            solver_max_time=1,
            front_desk_enabled=False,
        )
        assert False, "Should have raised ValueError for Front Desk requirements while disabled"
    except ValueError as exc:
        assert "cannot include a Front Desk row" in str(exc)
