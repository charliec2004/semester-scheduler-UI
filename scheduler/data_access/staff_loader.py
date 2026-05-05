"""CSV loading utilities for staff data."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import pandas as pd

from scheduler.config import (
    AVAILABILITY_BLOCKS_JSON_COLUMN,
    AVAILABILITY_COLUMNS,
    DAY_NAMES,
    FRONT_DESK_ROLE,
    LEGACY_AVAILABILITY_COLUMNS,
    LEGACY_SLOT_MINUTES,
    LEGACY_TIME_SLOT_STARTS,
    MINUTES_PER_HOUR,
    SLOT_MINUTES,
    TIME_SLOT_STARTS,
    TRAVEL_BUFFER_AFTER_COLUMNS,
    TRAVEL_BUFFER_BEFORE_COLUMNS,
    UNAVAILABILITY_BLOCKS_JSON_COLUMN,
    is_slot_aligned_hours,
)
from scheduler.domain.models import StaffData, normalize_department_name


def _normalize_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Create mapping from lowercase column names to original names."""
    normalized: Dict[str, str] = {}
    for column in df.columns:
        key = column.strip().lower()
        if key in normalized:
            raise ValueError(f"Duplicate column detected when normalizing headers: '{column}'")
        normalized[key] = column.strip()
    return normalized


def _parse_roles(raw_roles: Optional[str]) -> List[str]:
    """Parse roles from a semicolon/comma-separated string, normalized for matching.
    
    Handles both spaces and underscores: "Career Education" and "career_education"
    both become "career_education".
    """
    if pd.isna(raw_roles):
        return []
    return [normalize_department_name(role) for role in re.split(r"[;,]", str(raw_roles)) if role.strip()]


def _coerce_numeric(value, column_name: str, record_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(
            f"Invalid numeric value '{value}' for column '{column_name}' on record '{record_name}'"
        ) from None


def _coerce_bool_flag(value) -> bool:
    try:
        return int(float(value)) == 1
    except (TypeError, ValueError):
        return False


def _require_slot_aligned_hours(value: float, column_name: str, record_name: str) -> float:
    if not is_slot_aligned_hours(value):
        raise ValueError(
            f"Invalid hour value '{value}' for column '{column_name}' on record '{record_name}': "
            "values must align to the 10-minute slot grid."
        )
    return value


def _parse_time_to_minutes(time_str: str) -> int:
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time string: {time_str!r}")
    return int(parts[0]) * MINUTES_PER_HOUR + int(parts[1])


def _exclusive_end_to_slot_count(end_exclusive: str) -> int:
    end_min = _parse_time_to_minutes(end_exclusive)
    count = 0
    for slot_time in TIME_SLOT_STARTS:
        if _parse_time_to_minutes(slot_time) < end_min:
            count += 1
        else:
            break
    return count


def _start_time_to_index(start: str) -> int:
    try:
        return TIME_SLOT_STARTS.index(start)
    except ValueError as exc:
        raise ValueError(f"Invalid slot start time {start!r}") from exc


def _raw_available_from_legacy_work_blocks(day_blocks: List[Dict[str, Any]]) -> List[bool]:
    """Legacy JSON: periods when the student CAN work (Electron legacyAvailabilityBlocksToFlatWork)."""
    slot_count = len(TIME_SLOT_STARTS)
    raw = [False] * slot_count
    for block in day_blocks:
        start = block.get("startTime") or block.get("start_time")
        end = block.get("endTime") or block.get("end_time")
        if start is None or end is None:
            continue
        travel_before = bool(block.get("travelBefore") or block.get("travel_before"))
        travel_after = bool(block.get("travelAfter") or block.get("travel_after"))
        start_i = _start_time_to_index(str(start))
        end_i = _exclusive_end_to_slot_count(str(end))
        for i in range(start_i, end_i):
            raw[i] = True
        if travel_before and start_i < end_i:
            raw[start_i] = False
        if travel_after and start_i < end_i:
            raw[end_i - 1] = False
    return raw


def _raw_available_from_unavailability(day_blocks: List[Dict[str, Any]]) -> List[bool]:
    """Periods when the student CANNOT work + optional one-slot buffers (Electron unavailabilityBlocksToFlatWorkAvailability)."""
    slot_count = len(TIME_SLOT_STARTS)
    raw = [True] * slot_count
    for block in day_blocks:
        start = block.get("startTime") or block.get("start_time")
        end = block.get("endTime") or block.get("end_time")
        if start is None or end is None:
            continue
        buffer_before = bool(
            block.get("bufferBeforeStart") or block.get("buffer_before_start")
        )
        buffer_after = bool(block.get("bufferAfterEnd") or block.get("buffer_after_end"))
        start_i = _start_time_to_index(str(start))
        end_i = _exclusive_end_to_slot_count(str(end))
        for i in range(start_i, end_i):
            raw[i] = False
        if buffer_before and start_i > 0:
            raw[start_i - 1] = False
        if buffer_after and end_i < slot_count:
            raw[end_i] = False
    return raw


def _try_parse_unavailability_blocks(row: Any, column_map: Dict[str, str]) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    col = column_map.get(UNAVAILABILITY_BLOCKS_JSON_COLUMN.lower())
    if not col:
        return None
    value = row[col]
    if pd.isna(value) or str(value).strip() == "":
        return None
    try:
        data = json.loads(str(value))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    out: Dict[str, List[Dict[str, Any]]] = {}
    for day in DAY_NAMES:
        v = data.get(day)
        if v is None:
            out[day] = []
        elif isinstance(v, list):
            out[day] = [b for b in v if isinstance(b, dict)]
        else:
            return None
    if not any(out[d] for d in DAY_NAMES):
        return None
    return out


def _try_parse_legacy_availability_blocks(row: Any, column_map: Dict[str, str]) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    col = column_map.get(AVAILABILITY_BLOCKS_JSON_COLUMN.lower())
    if not col:
        return None
    value = row[col]
    if pd.isna(value) or str(value).strip() == "":
        return None
    try:
        data = json.loads(str(value))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    out: Dict[str, List[Dict[str, Any]]] = {}
    for day in DAY_NAMES:
        v = data.get(day)
        if v is None:
            out[day] = []
        elif isinstance(v, list):
            out[day] = [b for b in v if isinstance(b, dict)]
        else:
            return None
    if not any(out[d] for d in DAY_NAMES):
        return None
    return out


def _resolve_availability_schema(column_map: Dict[str, str], path: Path) -> str:
    has_current_grid = all(column.lower() in column_map for column in AVAILABILITY_COLUMNS)
    if has_current_grid:
        return "current"
    has_legacy_grid = all(column.lower() in column_map for column in LEGACY_AVAILABILITY_COLUMNS)
    if has_legacy_grid:
        return "legacy"
    if column_map.get(UNAVAILABILITY_BLOCKS_JSON_COLUMN.lower()) or column_map.get(
        AVAILABILITY_BLOCKS_JSON_COLUMN.lower()
    ):
        return "json_only"

    missing_current = [col for col in AVAILABILITY_COLUMNS if col.lower() not in column_map]
    preview = ", ".join(missing_current[:5])
    suffix = "..." if len(missing_current) > 5 else ""
    raise ValueError(
        f"Missing availability columns in {path}: {preview}{suffix}. "
        "Provide unavailability_blocks or availability_blocks JSON, the full 10-minute grid, "
        "or the legacy 30-minute grid."
    )


def load_staff_data(path: Path) -> StaffData:
    if not path.exists():
        raise FileNotFoundError(f"Staff CSV not found: {path}")

    df = pd.read_csv(path)
    df.columns = [col.strip() for col in df.columns]
    column_map = _normalize_columns(df)

    def require_column(name: str) -> str:
        if name not in column_map:
            raise ValueError(f"Required column '{name}' not found in {path}")
        return column_map[name]

    name_col = require_column("name")
    roles_col = require_column("roles")
    target_col = require_column("target_hours")
    max_col = require_column("max_hours")
    year_col = require_column("year")

    availability_schema = _resolve_availability_schema(column_map, path)
    legacy_stride = LEGACY_SLOT_MINUTES // SLOT_MINUTES

    employees: List[str] = []
    qual: Dict[str, Set[str]] = {}
    weekly_hour_limits: Dict[str, float] = {}
    target_weekly_hours: Dict[str, float] = {}
    employee_year: Dict[str, int] = {}
    unavailable: Dict[str, Dict[str, List[int]]] = {}
    all_roles: Set[str] = set()

    for _, row in df.iterrows():
        name = str(row[name_col]).strip()
        if not name:
            raise ValueError("Encountered employee row with empty name.")
        if name in qual:
            raise ValueError(f"Duplicate employee name detected: '{name}'")

        roles = _parse_roles(row[roles_col])
        if not roles:
            raise ValueError(f"Employee '{name}' must have at least one role defined.")
        role_set = set(roles)
        all_roles.update(role_set)
        qual[name] = role_set

        max_hours = _require_slot_aligned_hours(
            _coerce_numeric(row[max_col], max_col, name),
            max_col,
            name,
        )
        target_hours = min(
            _require_slot_aligned_hours(
                _coerce_numeric(row[target_col], target_col, name),
                target_col,
                name,
            ),
            max_hours,
        )
        weekly_hour_limits[name] = max_hours
        target_weekly_hours[name] = target_hours

        year_value = _coerce_numeric(row[year_col], year_col, name)
        employee_year[name] = int(year_value)

        availability: Dict[str, List[int]] = {}
        unavail_payload = _try_parse_unavailability_blocks(row, column_map)
        legacy_blocks_payload = _try_parse_legacy_availability_blocks(row, column_map)

        for day in DAY_NAMES:
            before_buffer_col = column_map.get(TRAVEL_BUFFER_BEFORE_COLUMNS[day].lower())
            after_buffer_col = column_map.get(TRAVEL_BUFFER_AFTER_COLUMNS[day].lower())
            before_buffer = _coerce_bool_flag(row[before_buffer_col]) if before_buffer_col else False
            after_buffer = _coerce_bool_flag(row[after_buffer_col]) if after_buffer_col else False

            raw_available: List[bool]
            if unavail_payload is not None:
                raw_available = _raw_available_from_unavailability(unavail_payload.get(day, []))
                before_buffer = False
                after_buffer = False
            elif legacy_blocks_payload is not None:
                raw_available = _raw_available_from_legacy_work_blocks(legacy_blocks_payload.get(day, []))
                before_buffer = False
                after_buffer = False
            elif availability_schema == "current":
                raw_available = []
                for start_time in TIME_SLOT_STARTS:
                    column = column_map[f"{day}_{start_time}".lower()]
                    raw_available.append(_coerce_bool_flag(row[column]))
            elif availability_schema == "legacy":
                raw_available = []
                for start_time in LEGACY_TIME_SLOT_STARTS:
                    column = column_map[f"{day}_{start_time}".lower()]
                    is_available = _coerce_bool_flag(row[column])
                    raw_available.extend([is_available] * legacy_stride)
            else:
                raise ValueError(
                    f"Employee '{name}': unavailability_blocks / availability_blocks is missing or invalid JSON, "
                    "but this file uses JSON-only schedule columns (no per-slot grid)."
                )

            blocked_slots = set()
            if before_buffer:
                blocked_slots.update(
                    slot_index
                    for slot_index in range(len(raw_available) - 1)
                    if raw_available[slot_index] and not raw_available[slot_index + 1]
                )
            if after_buffer:
                blocked_slots.update(
                    slot_index
                    for slot_index in range(1, len(raw_available))
                    if raw_available[slot_index] and not raw_available[slot_index - 1]
                )

            unavailable_slots = [
                slot_index
                for slot_index, can_work in enumerate(raw_available)
                if not can_work or slot_index in blocked_slots
            ]
            if unavailable_slots:
                availability[day] = unavailable_slots
        if availability:
            unavailable[name] = availability

        employees.append(name)

    if FRONT_DESK_ROLE not in all_roles:
        raise ValueError(f"No employees qualified for required role '{FRONT_DESK_ROLE}'.")

    return StaffData(
        employees=employees,
        qual=qual,
        weekly_hour_limits=weekly_hour_limits,
        target_weekly_hours=target_weekly_hours,
        employee_year=employee_year,
        unavailable=unavailable,
        roles=sorted(all_roles),
    )
