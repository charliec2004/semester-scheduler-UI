"""Dataclasses and type definitions shared across the scheduler modules."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set


def normalize_department_name(name: str) -> str:
    """Normalize department/role names for consistent matching.
    
    Converts to lowercase and replaces spaces with underscores.
    Handles inputs like "Career Education", "career_education", "CAREER EDUCATION".
    All become "career_education".
    
    Args:
        name: The department or role name to normalize.
        
    Returns:
        Normalized name (lowercase, underscores instead of spaces).
    """
    if not name:
        return ""
    # Convert to lowercase, strip whitespace, replace spaces with underscores
    normalized = name.strip().lower()
    # Replace multiple spaces/underscores with single underscore
    normalized = re.sub(r'[\s_]+', '_', normalized)
    return normalized


@dataclass(frozen=True)
class StaffData:
    employees: List[str]
    qual: Dict[str, Set[str]]
    weekly_hour_limits: Dict[str, float]
    target_weekly_hours: Dict[str, float]
    employee_year: Dict[str, int]
    unavailable: Dict[str, Dict[str, List[int]]]
    roles: List[str]


@dataclass(frozen=True)
class DepartmentRequirements:
    targets: Dict[str, float]
    max_hours: Dict[str, float]
    order: List[str]  # Department names in user-defined display order


@dataclass(frozen=True)
class ScheduleRequest:
    staff_csv: Path
    requirements_csv: Path
    output_path: Path


@dataclass(frozen=True)
class TrainingRequest:
    department: str
    trainee_one: str
    trainee_two: str


@dataclass(frozen=True)
class TimesetRequest:
    employee: str
    day: str
    department: str
    start_slot: int
    end_slot: int


@dataclass(frozen=True)
class FavoredDepartment:
    name: str
    multiplier: float


@dataclass(frozen=True)
class FavoredFrontDeskDepartment:
    name: str
    multiplier: float


@dataclass(frozen=True)
class FavoredEmployeeDepartment:
    """Soft preference for assigning an employee to a specific department."""
    employee: str
    department: str
    multiplier: float = 1.0  # Strength of preference (0.5 = half, 1.0 = normal, 2.0 = double)


@dataclass(frozen=True)
class ShiftTimePreference:
    """Soft preference for an employee to work morning or afternoon on a specific day."""
    employee: str
    day: str  # Mon, Tue, Wed, Thu, Fri
    preference: str  # 'morning' (8am-12pm) or 'afternoon' (12pm-5pm)


@dataclass(frozen=True)
class EqualityRequest:
    """Request to equalize hours for two employees in a specific department."""
    department: str
    employee1: str
    employee2: str