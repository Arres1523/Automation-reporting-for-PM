# Valoris Reporting MVP — Design Document

**Date:** July 27, 2026
**Status:** Approved for implementation
**Portfolio:** La Jolla, August at Friendswood, Oasis, Dalecrest

---

## 1. Purpose

Build an internal Google Workspace platform that receives property reports via Gmail, preserves original evidence in Drive, extracts occupancy and leads, displays historical trends, and automates control over missing/late reports.

No AI in production — deterministic code only.

---

## 2. Architecture

```
Gmail → Apps Script (intake) → Classification → Drive (archive)
                                         → Parser → Validation → Sheets (KPI History)
                                         → Exception Queue (on failure)

Sheets (Expected Reports) → Status Engine → WAITING / RECEIVED / MISSING
                                         → Reminders → Email notification
                                         → Escalation (24h)

Sheets → Web App (HTML Service) → Portfolio / Property / Control / Admin views
```

**Technology stack:**
- Google Apps Script V8 (runtime)
- TypeScript → esbuild → clasp (deploy)
- Gmail (inbound)
- Google Drive (document archive)
- Google Sheets (structured storage)
- HTML Service (web app UI)
- Vitest (unit tests)

**Three environments:** development, staging, production — isolated projects, separate Drive folders, separate Sheets.

---

## 3. Data Model

### States

| State | Meaning |
|-------|---------|
| `WAITING` | Within deadline, no valid report received |
| `RECEIVED` | Valid report received and processed |
| `MISSING` | Deadline passed without valid report |

`late = true` when a valid report arrives after its deadline.

### Identity Keys

| Key | Composition |
|-----|------------|
| `expectedReportId` | `propertyId + reportDefinitionId + periodStart` |
| `receivedReportId` | `Gmail messageId + SHA-256(file)` |
| `kpiId` | `expectedReportId + kpiCode` |
| `reminderId` | `expectedReportId + reminderType` |

### Tables (Google Sheets)

1. **Properties** — ID, code, name, status, timezone, Drive folder, contacts
2. **ReportDefinitions** — property, type, frequency, parser key, authorized senders, deadline rule, escalation recipients
3. **ExpectedReports** — period, deadline, status, receivedReportId, late flag, reminder dates
4. **ReceivedReports** — messageId, file hash, receivedAt, classification, Drive link, actor email
5. **KPIHistory** — propertyId, period, kpiCode, value, unit, sourceReportId, publishedAt
6. **ReminderLog** — expectedReportId, type, recipients, sentAt, result, messageId
7. **ExceptionQueue** — documentId, stage, error, severity, resolution, assignee
8. **AuditLog** — actor, action, entity, oldValue, newValue, timestamp
9. **Users** — email, role, allowedPropertyIds, active

### Internal Interfaces

```ts
type ReportStatus = "WAITING" | "RECEIVED" | "MISSING";

interface ParsedReport {
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string;
  periodEnd: string;
  metrics: Array<{
    code: "OCCUPANCY" | "LEADS";
    value: number;
    unit: "PERCENT" | "COUNT";
  }>;
  warnings: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface Parser {
  parserKey: string;
  canParse(fileName: string, mimeType: string): boolean;
  parse(fileBlob: GoogleAppsScript.Base.Blob): ParsedReport;
}
```

---

## 4. Build Phases

### Phase 1 — Source Audit
- Collect representative reports (daily, weekly, monthly) from all four properties
- Register: property, type, frequency, sender, subject, file name pattern, file type, occupancy/leads location, deadline, timezone, responsible person, escalation contact
- Build KPI dictionary with definition, unit, formula, source, validation rules
- Identify structured formats, variants, manual-review documents
- Select pilot property (most stable format, best historical coverage, fewest variants)
- Anonymized test files where applicable

**Gate:** No parser is developed until its format, period, KPI, and deadline are approved.

### Phase 2 — Technical Foundation
- Repository structure: `src/{domain,config,intake,classification,storage,parsers,validation,repositories,status,reminders,audit,web}`, `tests/`
- TypeScript + ESLint + Vitest + esbuild + clasp
- Three Apps Script projects (dev/staging/prod)
- Separate Sheets, Drive folders, Gmail labels per environment
- Secrets via Apps Script Properties
- Minimum scopes: Gmail, Drive, Sheets, Mail
- Reproducible deploys, rollback capability
- Corporate automation account for production

**Gate:** Pipeline compiles, tests pass, dev deploy works, health-check page accessible.

### Phase 3 — Data Model & Configuration
- Create Sheets with all table headers
- Implement repositories (CRUD by ID)
- Protect system sheets from manual edits
- Config validation: unique IDs, active properties, valid deadlines, existing parser, defined senders/recipients
- Pre-generate expected reports: daily (14d), weekly (8w), monthly (6m)
- Daily routine extends these windows
- Audit log every config change

**Gate:** Pilot property shows all future reports as `WAITING`.

### Phase 4 — Intake, Classification & Archive
- MVP intake runs manually when a signed-in authorized user clicks `Sync Gmail to Drive`
- Only unprocessed messages in that user's Gmail matching configured rules
- SHA-256 hash of each attachment
- Dedup check (message ID + file hash)
- Classify: property, report type, period
- Save to central Drive root: `Property / Frequency / YYYY / Reporting Period`
- Create ReceivedReport record with Drive link
- Label message as processed
- Exceptions: unknown sender, unidentified property, ambiguous period, missing attachment, unapproved format
- LockService to prevent concurrent processing of same message

**Gate:** Processing same message 10x produces exactly one logical file and one ReceivedReport.

### Phase 5 — Parsers & Validation (Pilot)
- One parser per approved format
- Normalize dates and periods
- Extract only occupancy and leads
- Validation: required fields, numeric type, occupancy 0–100%, leads non-negative integer, property/period/report match
- Compare against manually validated sample
- Publish KPIs only when `ValidationResult.valid = true`
- On failure: keep report in `WAITING` or `MISSING`; log to ExceptionQueue
- Error logging: sufficient context, no secrets or unnecessary content

**Gate:** 100% of approved test files extract correctly; tampered files are rejected without publishing data.

### Phase 6 — Status Engine & Reminders
- `evaluateReportStatuses()` every hour
- `WAITING` → `MISSING` when deadline passes
- `WAITING`/`MISSING` → `RECEIVED` when valid report arrives
- `late = true` if `receivedAt > dueAt`
- On `MISSING` transition: send initial notice to responsible person
- If still `MISSING` after 24h: send single escalation to Asset Management
- Log every attempt and result in ReminderLog
- No duplicate `reminderId`
- Stop reminders when status changes to `RECEIVED`

**Gate:** Simulated clock tests prove no premature, duplicate, or post-receipt reminders.

### Phase 7 — Web Application
- `doGet()` restricted to authorized Valoris Google Workspace accounts
- User resolved from Google account
- Server-side authorization (not just UI hiding)
- Four views:
  - **Portfolio:** occupancy, leads, trend, status, last update
  - **Property:** history, period comparison, source document links
  - **Reporting Control:** filters by property, period, status
  - **Administration:** config, calendar, exceptions
- English UI, states shown as `WAITING` / `RECEIVED` / `MISSING`
- `Late` shown as separate indicator
- Direct links to source Drive documents
- Property Managers limited to their authorized property
- Admins can fix config and resolve exceptions without editing Sheets
- Admin actions logged to AuditLog

**Gate:** No user can access properties or documents outside their permission scope.

### Phase 8 — Backfill & Integration Testing (Pilot)
- Minimum: 8 weeks of daily/weekly reports, 6 monthly periods (or all available history)
- Run the full flow with historical files
- Reconcile occupancy and leads against original sources
- Test: duplicates, late reports, corrupted files, unknown sender, wrong period, format change, transient Drive/Sheets failures
- Confirm every KPI has an evidence link
- Concurrency and Apps Script quota tests
- Fix exceptions, repeat backfill from zero to prove reproducibility

**Gate:** Zero duplicate KPIs, 100% traceability, 100% reconciliation on approved sample.

### Phase 9 — UAT & Parallel Run
- Deploy pilot to staging environment
- Train admin and pilot users
- Run parallel with manual process (minimum 10 business days)
- Cover: 10 daily occurrences, 2 weekly, 1 monthly (real or historically simulated)
- Log discrepancies between manual and automated process
- Formal sign-off from Asset Management and process owner
- Document known issues and resolution

**Gate:** No critical open incidents; no unexplained KPI differences.

### Phase 10 — Expansion
Per remaining property:
1. Approve config and formats
2. Create parsers (shared contracts unchanged)
3. Run format unit tests
4. Process historical data
5. Reconcile KPIs
6. 5 business days controlled monitoring
7. Enable in production only after gate approval
8. One property at a time to isolate issues

### Phase 11 — Production & Handover
- Deploy approved version to production project
- Assign execution to corporate automation account
- Activate triggers: status/reminders (1h), calendar generation (daily), backup (daily); per-user Gmail intake stays manual unless a central automation account is approved
- Execution failure notifications
- Daily backup of data model with retention defined by Valoris
- Deliver: admin manual, format catalog, KPI dictionary, property/parser onboarding guide, recovery/rollback procedure, access matrix
- Assign functional and technical owners
- Monthly review of exceptions, permissions, and Apps Script quotas

---

## 5. Testing & Acceptance

### Automated Tests
- Classification by sender, subject, file, period
- Duplicate message and attachment detection
- Parsers against valid, incomplete, and tampered files
- Range and unit validation
- `WAITING → MISSING → RECEIVED` transitions
- Late receipt calculation
- Initial notice and 24h escalation
- Reminder idempotency
- Authorization by role and property
- KPI persistence and retrieval
- Transient failure recovery

### MVP Acceptance Criteria
- All supported reports are identified correctly
- Every original file is preserved in Drive
- No duplicate creates additional KPIs
- Occupancy and leads match approved sources
- Every KPI is traceable to its original document
- Visible states limited to `WAITING`, `RECEIVED`, `MISSING`
- Reminders sent when deadline passes
- Single escalation after 24 hours
- Unauthorized users cannot access the app or other properties
- System runs without ChatGPT, Codex, or a local computer
- Deployment is reversible to previous version
- Sufficient documentation exists to administer and extend

---

## 6. Fixed Assumptions

- MVP covers La Jolla, August at Friendswood, Oasis, and Dalecrest
- Pilot property selected during source audit
- Representative reports are available
- Initial KPIs: occupancy and leads only
- Supported formats explicitly approved and versioned
- Automatic reminders: one initial notice + one 24h escalation
- UI and states in English
- Google Sheets sufficient for initial volume
- No generic PDF interpretation, AI forecasting, or external access in MVP
- Expanding KPIs, properties, or formats requires a tested and approved release
