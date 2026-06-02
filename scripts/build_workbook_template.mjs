import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = process.cwd();
const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "semester_scheduler_project.xlsx");

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timeValues = [];
for (let hour = 8; hour < 17; hour += 1) {
  for (let minute = 0; minute < 60; minute += 10) {
    timeValues.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
}
timeValues.push("17:00");

const workbook = Workbook.create();

function colName(index) {
  let value = index;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function writeMatrix(sheet, startRow, startCol, rows) {
  if (!rows.length) return;
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => {
    const next = [...row];
    while (next.length < width) next.push("");
    return next;
  });
  const range = `${colName(startCol)}${startRow}:${colName(startCol + width - 1)}${startRow + height - 1}`;
  sheet.getRange(range).values = normalized;
}

function addListValidation(sheet, rangeRef, source) {
  sheet.getRange(rangeRef).dataValidation = {
    allowBlank: true,
    list: { inCellDropDown: true, source },
  };
}

function addWholeValidation(sheet, rangeRef, min, max) {
  sheet.getRange(rangeRef).dataValidation = {
    allowBlank: true,
    rule: { type: "whole", operator: "between", formula1: min, formula2: max },
  };
}

function addDecimalValidation(sheet, rangeRef, min, max) {
  sheet.getRange(rangeRef).dataValidation = {
    allowBlank: true,
    rule: { type: "decimal", operator: "between", formula1: min, formula2: max },
  };
}

const startHere = workbook.worksheets.add("Start_Here");
writeMatrix(startHere, 1, 1, [
  ["Semester Scheduler: Start Here"],
  [""],
  ["What this workbook does"],
  ["Use this workbook to enter staff, department, and scheduling rules, then generate a solved schedule in a separate output file."],
  [""],
  ["First-time user checklist"],
  ["1. Open the Project sheet and give the workbook a project name."],
  ["2. Add staff on the Staff sheet."],
  ["3. Add departments on the Departments sheet."],
  ["4. Add unavailable class/commitment blocks on the Unavailability sheet."],
  ["5. Leave Preferences, Constraints, and most Settings blank unless you know you need them."],
  ["6. Save the workbook, then run the solve command shown below."],
  [""],
  ["Minimum command to solve"],
  ["python main.py workbook solve my-scheduler.xlsx --output my-scheduler-solved.xlsx"],
  [""],
  ["What to expect after solving"],
  ["- The original workbook stays unchanged."],
  ["- The solved copy contains Validation plus the generated Results_* sheets."],
  ["- Results_Formatted matches the formatted schedule download from the desktop app."],
  [""],
  ["Which sheets most people need"],
  ["Project", "Always", "Project name and front desk toggle."],
  ["Staff", "Always", "Who can work, what roles they can do, and how many hours they want."],
  ["Departments", "Always", "Department hour targets and caps."],
  ["Unavailability", "Usually", "Classes, commitments, and optional travel buffers."],
  ["Preferences", "Sometimes", "Soft preferences such as favored students or shift-time preferences."],
  ["Constraints", "Sometimes", "Training pairs, forced timesets, and equality rules."],
  ["Settings", "Rarely", "Advanced solver tuning. Beginners can usually leave this alone."],
  [""],
  ["Common beginner mistakes"],
  ["- Writing department names differently across sheets. Keep the spelling consistent."],
  ["- Using times that are not on the 10-minute grid."],
  ["- Editing Results sheets by hand instead of re-solving."],
  ["- Filling advanced preferences before the basic Staff and Departments sheets are complete."],
]);

const readme = workbook.worksheets.add("README");
writeMatrix(readme, 1, 1, [
  ["Semester Scheduler Workbook Manual"],
  [""],
  ["Recommended order"],
  ["1. Start_Here"],
  ["2. Project"],
  ["3. Staff"],
  ["4. Departments"],
  ["5. Unavailability"],
  ["6. Preferences and Constraints only if needed"],
  ["7. Settings only if you want to override defaults"],
  [""],
  ["How each sheet works"],
  ["Project: one-row project metadata and the front desk on/off switch."],
  ["Staff: one row per employee. Roles can be separated with commas or semicolons."],
  ["Departments: one row per department with target and max hours."],
  ["Unavailability: one row per unavailable block; add multiple rows for multiple commitments."],
  ["Preferences: optional soft preferences. Blank is okay."],
  ["Constraints: optional stronger rules. Blank is okay."],
  ["Settings: edit only the `value` column. `default_value` shows the baseline."],
  [""],
  ["Important rules"],
  ["- Keep all times on the 10-minute grid from 08:00 through 17:00."],
  ["- Use the same employee and department names everywhere."],
  ["- `front_desk` is a special role name and must be typed exactly that way when used in Staff roles."],
  ["- Unavailability is the source of truth for availability; do not edit Solver_Availability by hand."],
  ["- Results sheets are regenerated on every solve and should not be edited by hand."],
  [""],
  ["Example role formats"],
  ["marketing"],
  ["marketing;front_desk"],
  ["career_education,front_desk"],
  [""],
  ["Example unavailability rows"],
  ["Alice | Mon | 10:00 | 11:20 | FALSE | TRUE"],
  ["Alice | Wed | 13:30 | 15:00 | FALSE | FALSE"],
  [""],
  ["Solve command"],
  ["python main.py workbook solve my-scheduler.xlsx --output my-scheduler-solved.xlsx"],
]);

const project = workbook.worksheets.add("Project");
writeMatrix(project, 1, 1, [
  ["key", "value"],
  ["schema_version", 1],
  ["project_name", "Semester Scheduler Project"],
  ["front_desk_enabled", true],
  ["notes", "Use this sheet as the project header only. Core data lives in the other sheets."],
]);
writeMatrix(project, 1, 4, [
  ["What to edit here"],
  ["Usually only `project_name` and `front_desk_enabled`."],
  [""],
  ["Field", "Meaning"],
  ["schema_version", "Leave this alone unless the workbook format changes."],
  ["project_name", "Any helpful name, such as Fall 2026 CPD schedule."],
  ["front_desk_enabled", "TRUE keeps front desk scheduling active; FALSE removes it entirely."],
  ["notes", "Free-form notes for yourself or collaborators."],
]);
addListValidation(project, "B4:B4", [true, false]);
project.freezePanes.freezeRows(1);

const staff = workbook.worksheets.add("Staff");
writeMatrix(staff, 1, 1, [["name", "roles", "target_hours", "max_hours", "year"]]);
writeMatrix(staff, 1, 7, [
  ["How to fill this sheet"],
  ["One employee per row."],
  ["Roles example", "marketing;front_desk"],
  ["Hours example", "target_hours = requested hours, max_hours = absolute cap"],
  ["Year example", "1, 2, 3, or 4"],
  [""],
  ["Beginner tip"],
  ["Start with just names, roles, target_hours, max_hours, and year. Leave preferences for later."],
]);
addDecimalValidation(staff, "C2:D500", 0, 80);
addWholeValidation(staff, "E2:E500", 1, 8);
staff.freezePanes.freezeRows(1);

const departments = workbook.worksheets.add("Departments");
writeMatrix(departments, 1, 1, [["department", "target_hours", "max_hours"]]);
writeMatrix(departments, 1, 5, [
  ["How to fill this sheet"],
  ["One department per row."],
  ["Example", "Marketing | 18 | 24"],
  ["target_hours", "The solver tries to reach this amount."],
  ["max_hours", "The department cannot go above this amount."],
]);
addDecimalValidation(departments, "B2:C200", 0, 200);
departments.freezePanes.freezeRows(1);

const unavailability = workbook.worksheets.add("Unavailability");
writeMatrix(unavailability, 1, 1, [["employee", "day", "start_time", "end_time", "buffer_before_start", "buffer_after_end"]]);
writeMatrix(unavailability, 1, 8, [
  ["How to fill this sheet"],
  ["Add one row per class, commitment, or time block when the student cannot work."],
  ["Example", "Alice | Mon | 10:00 | 11:20 | FALSE | TRUE"],
  ["buffer_before_start", "TRUE blocks one extra 10-minute slot before the commitment."],
  ["buffer_after_end", "TRUE blocks one extra 10-minute slot after the commitment."],
  ["When to leave blank", "If someone has no commitments, they do not need a row here."],
]);
addListValidation(unavailability, "B2:B2000", dayNames);
addListValidation(unavailability, "C2:C2000", timeValues.slice(0, -1));
addListValidation(unavailability, "D2:D2000", timeValues);
addListValidation(unavailability, "E2:F2000", [true, false]);
unavailability.freezePanes.freezeRows(1);

const preferences = workbook.worksheets.add("Preferences");
writeMatrix(preferences, 1, 1, [
  ["Favored Employees"],
  ["employee", "multiplier"],
  [""],
  [""],
  ["Favored Departments"],
  ["department", "multiplier"],
  [""],
  [""],
  ["Favored Front Desk Departments"],
  ["department", "multiplier"],
  [""],
  [""],
  ["Favored Employee Departments"],
  ["employee", "department", "multiplier"],
  [""],
  [""],
  ["Shift Time Preferences"],
  ["employee", "day", "preference"],
]);
writeMatrix(preferences, 1, 5, [
  ["How to use this sheet"],
  ["Everything here is optional. Blank is fine."],
  ["Use this sheet only after Staff and Departments are complete."],
  [""],
  ["Section", "What it means"],
  ["Favored Employees", "Push specific students closer to their target hours."],
  ["Favored Departments", "Push work toward specific departments."],
  ["Favored Front Desk Departments", "Prefer specific departments for front desk coverage."],
  ["Favored Employee Departments", "Prefer a specific student in a specific department."],
  ["Shift Time Preferences", "Prefer morning or afternoon for a student on a given day."],
]);
addDecimalValidation(preferences, "B3:B500", 0, 10);
addDecimalValidation(preferences, "B7:B500", 0, 10);
addDecimalValidation(preferences, "B11:B500", 0, 10);
addDecimalValidation(preferences, "C15:C500", 0, 10);
addListValidation(preferences, "B19:B500", dayNames);
addListValidation(preferences, "C19:C500", ["morning", "afternoon"]);
preferences.freezePanes.freezeRows(1);

const constraints = workbook.worksheets.add("Constraints");
writeMatrix(constraints, 1, 1, [
  ["Training Pairs"],
  ["department", "trainee1", "trainee2"],
  [""],
  [""],
  ["Timesets"],
  ["employee", "day", "department", "start_time", "end_time"],
  [""],
  [""],
  ["Equality Constraints"],
  ["department", "employee1", "employee2"],
]);
writeMatrix(constraints, 1, 7, [
  ["How to use this sheet"],
  ["These are optional stronger rules. Most first-time users can leave this sheet blank."],
  [""],
  ["Section", "What it does"],
  ["Training Pairs", "Encourage two students to overlap in one department."],
  ["Timesets", "Strongly request a specific person in a department at a specific time."],
  ["Equality Constraints", "Try to keep two employees' hours similar within one department."],
]);
addListValidation(constraints, "B7:B500", dayNames);
addListValidation(constraints, "D7:D500", timeValues.slice(0, -1));
addListValidation(constraints, "E7:E500", timeValues);
constraints.freezePanes.freezeRows(1);

const settings = workbook.worksheets.add("Settings");
const settingRows = [
  ["key", "default_value", "value", "unit", "description"],
  ["solverMaxTime", 180, 180, "seconds", "Maximum solver runtime."],
  ["minSlots", 12, 12, "10-minute slots", "Minimum shift length."],
  ["maxSlots", 24, 24, "10-minute slots", "Maximum shift length."],
  ["frontDeskCoverageWeight", 10000, 10000, "weight", "Priority for front desk coverage."],
  ["departmentTargetWeight", 1000, 1000, "weight", "Priority for department target adherence."],
  ["officeCoverageWeight", 150, 150, "weight", "Reward for keeping at least two people working."],
  ["singleCoverageWeight", 500, 500, "weight", "Penalty for leaving only one person working."],
  ["targetAdherenceWeight", 100, 100, "weight", "Priority for individual target adherence."],
  ["collaborativeHoursWeight", 200, 200, "weight", "Priority for collaborative hours."],
  ["departmentSpreadWeight", 60, 60, "weight", "Priority for spreading department work across more slots."],
  ["departmentDayCoverageWeight", 30, 30, "weight", "Priority for covering departments across more days."],
  ["shiftLengthWeight", 20, 20, "weight", "Reward for fewer, longer shifts."],
  ["shiftTimePreferenceWeight", 15, 15, "weight", "Priority for matching morning or afternoon preferences."],
  ["favoredEmployeeDeptWeight", 50, 50, "weight", "Bonus for favored employee-department pairings."],
  ["underclassmenFrontDeskWeight", 1, 1, "weight", "Preference for lower-year front desk assignments."],
  ["departmentTotalWeight", 0.3333333333, 0.3333333333, "weight", "Tie-break reward for total department work."],
  ["equalityConstraintWeight", 67, 67, "weight", "Penalty weight for equality constraints."],
  ["departmentHourThreshold", 4, 4, "hours", "Allowable department deviation threshold."],
  ["targetHardDeltaHours", 5, 5, "hours", "Hard maximum deviation from employee target."],
  ["weeklyHourCap", 19, 19, "hours", "Universal weekly cap."],
  ["favoredStudentDailyMaxHours", 8, 8, "hours", "Daily maximum for favored students."],
  ["favoredStudentMinShiftHours", 1, 1, "hours", "Minimum shift for favored students."],
  ["favoredStudentTargetPriority", 10, 10, "multiplier", "Extra target-hour pressure for favored students."],
  ["favoredStudentFillBonus", 67, 67, "weight", "Bonus per worked slot for favored students."],
  ["travelBufferMinutes", 10, 10, "minutes", "Travel buffer applied around unavailability blocks."],
  ["defaultWeeklyMaxHours", 40, 40, "hours", "Fallback weekly max if staff data omits one."],
  ["defaultTargetHours", 11, 11, "hours", "Fallback target if staff data omits one."],
  ["trainingMinHours", 1, 1, "hours", "Minimum overlap goal for training pairs."],
  ["trainingOverlapTargetPercent", 35, 35, "percent", "Target overlap percent for training pairs."],
  ["trainingOverlapWeight", 5000, 5000, "weight", "Penalty for missing training overlap."],
  ["trainingOverlapBonus", 67, 67, "weight", "Bonus per overlapping training slot."],
  ["collaborationMinCareerEducationHours", 1, 1, "hours", "Target collaboration hours for Career Education."],
  ["collaborationMinMarketingHours", 1, 1, "hours", "Target collaboration hours for Marketing."],
  ["collaborationMinEmployerEngagementHours", 2, 2, "hours", "Target collaboration hours for Employer Engagement."],
  ["collaborationMinEventsHours", 4, 4, "hours", "Target collaboration hours for Events."],
  ["collaborationMinDataSystemsHours", 0, 0, "hours", "Target collaboration hours for Data Systems."],
  ["favoredDepartmentTargetMultiplier", 1.5, 1.5, "multiplier", "Multiplier for favored department target adherence."],
  ["favoredDepartmentFocusedBonus", 10, 10, "weight", "Bonus per focused favored-department slot."],
  ["favoredDepartmentDualPenalty", 7, 7, "weight", "Penalty per dual-counted favored-department slot."],
  ["favoredFrontDeskDeptBonus", 13, 13, "weight", "Bonus per front desk slot filled by a favored department."],
  ["timesetBonusWeight", 20000, 20000, "weight", "Bonus for satisfying explicit timesets."],
  ["departmentScarcityWeight", 8, 8, "weight", "Penalty for using staff from smaller departments at front desk."],
  ["largeDeviationThresholdHours", 2, 2, "hours", "Hours away from target before large deviation penalties apply."],
  ["employeeLargeDeviationPenalty", 5000, 5000, "weight", "Penalty for large employee deviations."],
  ["departmentLargeDeviationPenalty", 4000, 4000, "weight", "Penalty for large department deviations."],
  ["year1TargetMultiplier", 1, 1, "multiplier", "Target adherence multiplier for first-year students."],
  ["year2TargetMultiplier", 1.2, 1.2, "multiplier", "Target adherence multiplier for second-year students."],
  ["year3TargetMultiplier", 1.5, 1.5, "multiplier", "Target adherence multiplier for third-year students."],
  ["year4TargetMultiplier", 2, 2, "multiplier", "Target adherence multiplier for fourth-year students."],
  ["fontSize", "medium", "medium", "ui", "Workbook or app font size preference."],
  ["theme", "dark", "dark", "ui", "Workbook or app theme preference."],
  ["enforceMinDeptBlock", true, true, "boolean", "Enforce 2-hour minimum non-front-desk department blocks."],
  ["enforceFavoredTwoHourMinimum", true, true, "boolean", "Apply 2-hour minimums to favored employees."],
];
writeMatrix(settings, 1, 1, settingRows);
writeMatrix(settings, 1, 7, [
  ["How to use this sheet"],
  ["Most users should leave these values alone at first."],
  ["Edit only the `value` column when you want to override a default."],
  [""],
  ["Good beginner approach"],
  ["1. Run the solver once with defaults."],
  ["2. Review Validation and Results sheets."],
  ["3. Only change settings if you are fixing a specific scheduling issue."],
]);
addListValidation(settings, "C51:C51", ["small", "medium", "large"]);
addListValidation(settings, "C52:C52", ["system", "dark", "light"]);
addListValidation(settings, "C53:C53", [true, false]);
addListValidation(settings, "C54:C54", [true, false]);
settings.freezePanes.freezeRows(1);

const validation = workbook.worksheets.add("Validation");
writeMatrix(validation, 1, 1, [
  ["Workbook Validation"],
  [""],
  ["Status", "Template"],
  ["Errors", 0],
  ["Warnings", 0],
  [""],
  ["Severity", "Sheet", "Table", "Row", "Column", "Message"],
]);
writeMatrix(validation, 1, 8, [
  ["How to read this sheet"],
  ["After solving, fix every ERROR before trusting the output."],
  ["Warnings are softer suggestions or data issues worth checking."],
]);
validation.freezePanes.freezeRows(7);

const helper = workbook.worksheets.add("Solver_Availability");
writeMatrix(helper, 1, 1, [["employee", "day", ...timeValues.slice(0, -1)]]);
helper.freezePanes.freezeRows(1);

for (const sheetName of [
  "Results_Formatted",
  "Results_Weekly",
  "Results_Mon",
  "Results_Tue",
  "Results_Wed",
  "Results_Thu",
  "Results_Fri",
  "Results_Employees",
  "Results_Departments",
  "Results_Status",
]) {
  const sheet = workbook.worksheets.add(sheetName);
  writeMatrix(sheet, 1, 1, [[sheetName], [""], ["Generated during workbook solve. Do not edit this sheet by hand."]]);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
