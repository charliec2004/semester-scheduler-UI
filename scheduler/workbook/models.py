"""Workbook-facing models and validation structures."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from scheduler.domain.models import (
    EqualityRequest,
    FavoredEmployeeDepartment,
    ShiftTimePreference,
    TimesetRequest,
    TrainingRequest,
)


ValidationSeverity = Literal["error", "warning"]


@dataclass(frozen=True)
class WorkbookValidationIssue:
    """A structured workbook validation issue."""

    severity: ValidationSeverity
    sheet: str
    table: str
    message: str
    row: int | None = None
    column: str | None = None


@dataclass(frozen=True)
class WorkbookSettingDefinition:
    """Metadata describing one supported workbook setting."""

    key: str
    default: Any
    value_type: Literal["int", "float", "bool", "enum"]
    unit: str
    description: str
    choices: tuple[str, ...] = ()
    solver_argument: str | None = None


@dataclass(frozen=True)
class WorkbookProjectV1:
    """Normalized workbook project payload."""

    schema_version: int
    project_name: str
    front_desk_enabled: bool
    settings: dict[str, Any]
    staff: list[dict[str, Any]]
    departments: list[dict[str, Any]]
    unavailability: list[dict[str, Any]]
    favored_employees: dict[str, float]
    favored_departments: dict[str, float]
    favored_frontdesk_departments: dict[str, float]
    favored_employee_departments: list[FavoredEmployeeDepartment]
    shift_time_preferences: list[ShiftTimePreference]
    training_requests: list[TrainingRequest]
    timeset_requests: list[TimesetRequest]
    equality_requests: list[EqualityRequest]
