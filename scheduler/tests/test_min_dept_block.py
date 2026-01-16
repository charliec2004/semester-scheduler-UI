"""Tests for the minimum department block constraint.

This module tests the experimental feature that prevents awkward 1-hour
department fragments within shifts.

Rules tested:
1. Non-favored employees: each non-FD department block must be >= 2 hours (4 slots)
2. Everyone: cannot have a 2-hour shift split 1h+1h across two non-FD departments
3. Front Desk blocks remain exempt
4. Toggle OFF disables all these constraints
"""

import pytest
from ortools.sat.python import cp_model


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def model():
    """Create a fresh CP model for each test."""
    return cp_model.CpModel()


@pytest.fixture
def solver():
    """Create a solver instance."""
    return cp_model.CpSolver()


# ============================================================================
# Helper Functions
# ============================================================================

def create_shift_variables(model, T):
    """Create work and assign variables for a single employee-day."""
    work = {t: model.new_bool_var(f"work[{t}]") for t in T}
    assign_dept_a = {t: model.new_bool_var(f"assign_a[{t}]") for t in T}
    assign_dept_b = {t: model.new_bool_var(f"assign_b[{t}]") for t in T}
    assign_fd = {t: model.new_bool_var(f"assign_fd[{t}]") for t in T}
    return work, assign_dept_a, assign_dept_b, assign_fd


def add_basic_constraints(model, work, assign_dept_a, assign_dept_b, assign_fd, T):
    """Add basic assignment constraints (at most one role, work=1 requires role)."""
    for t in T:
        # At most one role at a time
        model.add(assign_dept_a[t] + assign_dept_b[t] + assign_fd[t] <= 1)
        # If working, must have a role
        model.add(assign_dept_a[t] + assign_dept_b[t] + assign_fd[t] == work[t])


def add_min_dept_block_constraints(model, work, assign_dept_a, assign_dept_b, assign_fd, T, 
                                   is_favored=False, enforce_min_dept_block=True):
    """Add the minimum department block constraints."""
    if not enforce_min_dept_block:
        return
    
    # Calculate total slots per department
    total_dept_a = sum(assign_dept_a[t] for t in T)
    total_dept_b = sum(assign_dept_b[t] for t in T)
    total_fd = sum(assign_fd[t] for t in T)
    total_shift = sum(work[t] for t in T)
    
    # Non-favored: each non-FD department must be 0 or >= 4 slots (2 hours)
    if not is_favored:
        # Forbid 1, 2, 3 slots for dept_a
        model.add(total_dept_a != 1)
        model.add(total_dept_a != 2)
        model.add(total_dept_a != 3)
        # Forbid 1, 2, 3 slots for dept_b
        model.add(total_dept_b != 1)
        model.add(total_dept_b != 2)
        model.add(total_dept_b != 3)
    else:
        # Favored still can't have single 30-min slot
        model.add(total_dept_a != 1)
        model.add(total_dept_b != 1)
    
    # Front desk: only forbid single 30-min slot (existing behavior)
    model.add(total_fd != 1)
    
    # Cross-department split: forbid 2-hour shift with 1h+1h across two non-FD depts
    # This applies to everyone including favored
    has_2_slots_a = model.new_bool_var("has_2_slots_a")
    has_2_slots_b = model.new_bool_var("has_2_slots_b")
    
    model.add(total_dept_a == 2).only_enforce_if(has_2_slots_a)
    model.add(total_dept_a != 2).only_enforce_if(has_2_slots_a.Not())
    
    model.add(total_dept_b == 2).only_enforce_if(has_2_slots_b)
    model.add(total_dept_b != 2).only_enforce_if(has_2_slots_b.Not())
    
    # If 4-slot shift, can't have both depts with exactly 2 slots
    is_4_slot = model.new_bool_var("is_4_slot")
    model.add(total_shift == 4).only_enforce_if(is_4_slot)
    model.add(total_shift != 4).only_enforce_if(is_4_slot.Not())
    
    # If 4 slot shift, at most one dept can have exactly 2 slots
    model.add(has_2_slots_a.Not() + has_2_slots_b.Not() >= 1).only_enforce_if(is_4_slot)


def solve_and_check(solver, model):
    """Solve the model and return status."""
    status = solver.solve(model)
    return status in [cp_model.OPTIMAL, cp_model.FEASIBLE]


# ============================================================================
# Test Cases: Non-favored Employee
# ============================================================================

class TestNonFavoredEmployee:
    """Tests for non-favored employee constraints."""
    
    def test_3h_plus_1h_forbidden(self, model, solver):
        """Non-favored: 3h DeptA + 1h DeptB should be forbidden."""
        T = range(8)  # 4 hours = 8 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: 3h in dept_a (6 slots) + 1h in dept_b (2 slots) = 4h total
        model.add(sum(dept_a[t] for t in T) == 6)  # 3 hours
        model.add(sum(dept_b[t] for t in T) == 2)  # 1 hour (forbidden)
        model.add(sum(work[t] for t in T) == 8)    # 4 hours total
        
        # Should be infeasible due to 2-slot dept_b
        assert not solve_and_check(solver, model), "3h+1h split should be forbidden for non-favored"
    
    def test_2h_plus_2h_allowed(self, model, solver):
        """Non-favored: 2h DeptA + 2h DeptB should be allowed."""
        T = range(8)  # 4 hours = 8 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: 2h in dept_a (4 slots) + 2h in dept_b (4 slots) = 4h total
        model.add(sum(dept_a[t] for t in T) == 4)  # 2 hours
        model.add(sum(dept_b[t] for t in T) == 4)  # 2 hours
        model.add(sum(work[t] for t in T) == 8)    # 4 hours total
        
        # Should be feasible
        assert solve_and_check(solver, model), "2h+2h split should be allowed for non-favored"
    
    def test_single_1h_block_forbidden(self, model, solver):
        """Non-favored: single 1h block in a department should be forbidden."""
        T = range(4)  # 2 hours = 4 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: exactly 1h in dept_a only
        model.add(sum(dept_a[t] for t in T) == 2)  # 1 hour (forbidden)
        model.add(sum(dept_b[t] for t in T) == 0)
        model.add(sum(fd[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 2)    # 1 hour total
        
        # Should be infeasible
        assert not solve_and_check(solver, model), "1h single block should be forbidden for non-favored"
    
    def test_2h_single_dept_allowed(self, model, solver):
        """Non-favored: 2h in a single department should be allowed."""
        T = range(4)  # 2 hours = 4 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: exactly 2h in dept_a only
        model.add(sum(dept_a[t] for t in T) == 4)  # 2 hours
        model.add(sum(dept_b[t] for t in T) == 0)
        model.add(sum(fd[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 4)    # 2 hours total
        
        # Should be feasible
        assert solve_and_check(solver, model), "2h single dept should be allowed for non-favored"


# ============================================================================
# Test Cases: Favored Employee
# ============================================================================

class TestFavoredEmployee:
    """Tests for favored employee constraints (partially exempt)."""
    
    def test_3h_plus_1h_allowed(self, model, solver):
        """Favored: 3h DeptA + 1h DeptB should be allowed (exempt from min block)."""
        T = range(8)  # 4 hours = 8 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=True, enforce_min_dept_block=True)
        
        # Force: 3h in dept_a (6 slots) + 1h in dept_b (2 slots) = 4h total
        model.add(sum(dept_a[t] for t in T) == 6)  # 3 hours
        model.add(sum(dept_b[t] for t in T) == 2)  # 1 hour (allowed for favored)
        model.add(sum(work[t] for t in T) == 8)    # 4 hours total
        
        # Should be feasible (favored exempt from 2h min)
        assert solve_and_check(solver, model), "3h+1h split should be allowed for favored"
    
    def test_1h_plus_1h_forbidden(self, model, solver):
        """Favored: 1h DeptA + 1h DeptB (2h shift) should still be forbidden."""
        T = range(4)  # 2 hours = 4 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=True, enforce_min_dept_block=True)
        
        # Force: 1h in dept_a + 1h in dept_b = 2h total (4 slots)
        model.add(sum(dept_a[t] for t in T) == 2)  # 1 hour
        model.add(sum(dept_b[t] for t in T) == 2)  # 1 hour
        model.add(sum(fd[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 4)    # 2 hours total
        
        # Should be infeasible (cross-dept 1+1 split forbidden for everyone)
        assert not solve_and_check(solver, model), "1h+1h split in 2h shift should be forbidden even for favored"


# ============================================================================
# Test Cases: Front Desk Exception
# ============================================================================

class TestFrontDeskException:
    """Tests for Front Desk exception behavior."""
    
    def test_1h_fd_plus_1h_dept_allowed(self, model, solver):
        """Anyone: 1h FrontDesk + 1h DeptA should be allowed."""
        T = range(4)  # 2 hours = 4 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: 1h front desk + 1h dept_a = 2h total
        # Note: This requires dept_a to be 2 slots, but the 1+1 restriction only
        # applies when BOTH departments are non-FD. Since FD is involved, it's allowed.
        model.add(sum(fd[t] for t in T) == 2)      # 1 hour FD
        model.add(sum(dept_a[t] for t in T) == 2)  # 1 hour dept (normally forbidden)
        model.add(sum(dept_b[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 4)    # 2 hours total
        
        # Note: The cross-dept restriction only counts non-FD depts.
        # dept_a has 2 slots and is the only non-FD dept with work, so it passes
        # the "at most one non-FD dept with 2 slots" check.
        # However, the 2-slot minimum still applies for non-favored...
        # Actually this should fail because dept_a has only 2 slots.
        # Let me reconsider - the FD exception is that FD blocks themselves are exempt,
        # not that having FD allows smaller dept blocks.
        
        # This test should actually FAIL because dept_a still has only 1 hour.
        assert not solve_and_check(solver, model), "1h dept block still forbidden even with FD"
    
    def test_2h_fd_plus_2h_dept_allowed(self, model, solver):
        """Anyone: 2h FrontDesk + 2h DeptA should be allowed."""
        T = range(8)  # 4 hours = 8 slots
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=True)
        
        # Force: 2h front desk + 2h dept_a = 4h total
        model.add(sum(fd[t] for t in T) == 4)      # 2 hours FD
        model.add(sum(dept_a[t] for t in T) == 4)  # 2 hours dept
        model.add(sum(dept_b[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 8)    # 4 hours total
        
        # Should be feasible
        assert solve_and_check(solver, model), "2h FD + 2h dept should be allowed"


# ============================================================================
# Test Cases: Toggle OFF
# ============================================================================

class TestToggleOff:
    """Tests that verify constraints are disabled when toggle is OFF."""
    
    def test_3h_plus_1h_allowed_when_off(self, model, solver):
        """With toggle OFF: 3h+1h should be allowed for non-favored."""
        T = range(8)
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=False)
        
        model.add(sum(dept_a[t] for t in T) == 6)
        model.add(sum(dept_b[t] for t in T) == 2)
        model.add(sum(work[t] for t in T) == 8)
        
        # Should be feasible when toggle is OFF
        assert solve_and_check(solver, model), "3h+1h should be allowed when toggle OFF"
    
    def test_1h_plus_1h_allowed_when_off(self, model, solver):
        """With toggle OFF: 1h+1h should be allowed for everyone."""
        T = range(4)
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=False)
        
        model.add(sum(dept_a[t] for t in T) == 2)
        model.add(sum(dept_b[t] for t in T) == 2)
        model.add(sum(work[t] for t in T) == 4)
        
        # Should be feasible when toggle is OFF
        assert solve_and_check(solver, model), "1h+1h should be allowed when toggle OFF"
    
    def test_single_1h_allowed_when_off(self, model, solver):
        """With toggle OFF: single 1h block should be allowed."""
        T = range(4)
        work, dept_a, dept_b, fd = create_shift_variables(model, T)
        add_basic_constraints(model, work, dept_a, dept_b, fd, T)
        add_min_dept_block_constraints(model, work, dept_a, dept_b, fd, T, 
                                       is_favored=False, enforce_min_dept_block=False)
        
        model.add(sum(dept_a[t] for t in T) == 2)
        model.add(sum(dept_b[t] for t in T) == 0)
        model.add(sum(fd[t] for t in T) == 0)
        model.add(sum(work[t] for t in T) == 2)
        
        # Should be feasible when toggle is OFF
        assert solve_and_check(solver, model), "1h single block should be allowed when toggle OFF"


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
