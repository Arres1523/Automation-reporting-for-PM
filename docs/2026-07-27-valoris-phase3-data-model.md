# Phase 3: Data Model & Configuration

**Goal:** Implement specific repositories, config validation, expected reports pre-generation, and calendar extension routines.

**Depends on:** clasp setup (manual) for actual Sheet creation — code is testable locally.

### Task 1: Table Header Constants & Sheet Initialization
- Create `src/config/table-headers.ts` with column arrays for all 9 tables
- Create `src/config/sheet-init.ts` with function to create/verify sheets exist

### Task 2: Specific Repositories
One per table, extending `SheetRepository<T>`:
- Properties, ReportDefinitions, ExpectedReports, ReceivedReports, KPIHistory, ReminderLog, ExceptionQueue, AuditLog, Users

### Task 3: Config Validation
- Unique IDs check
- Active properties check
- Valid deadlines check
- Parser existence check
- Authorized senders/recipients check

### Task 4: Expected Reports Generator
- Generate expected report rows for daily (14d), weekly (8w), monthly (6m)
- Idempotent (skip if expectedReportId already exists)

### Task 5: Calendar Extension Routine
- Daily trigger function that extends the windows
- Uses TRIGGER_INTERVALS and EXPECTED_REPORT_WINDOWS from constants

### Task 6: Config Change Audit Integration
- writeAuditLog call on every config change
