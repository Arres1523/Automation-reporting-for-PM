# Valoris Reporting DEV Activation Runbook

This runbook turns the MVP codebase into a working Google Apps Script DEV deployment.

## Prerequisites

- Node dependencies installed with `npm install`.
- Google account with permission to create Apps Script projects, Google Sheets, Gmail labels, and Drive folders.
- A shared Drive root folder ready for archived report attachments.
- A Google Sheet ID that will act as the central MVP database.

## 1. Verify The Local Build

Run these before touching Google:

```bash
npm run lint
npm test
npm run build
```

Expected result:

- TypeScript passes.
- Vitest passes.
- `dist/Code.js` and web HTML assets are generated.

## 2. Authenticate Clasp

```bash
npx clasp login
```

Use the Google account that will own the DEV Apps Script project.

## 3. Create The DEV Apps Script Project

```bash
npx clasp create --type standalone --title "Valoris Reporting DEV"
```

Copy the generated script ID into `.clasp-dev.json`:

```json
{
  "scriptId": "PASTE_DEV_SCRIPT_ID_HERE",
  "rootDir": "dist"
}
```

Do not commit real project IDs unless the repository policy allows it.

## 4. Deploy To DEV

```bash
npm run build
npm run deploy:dev
```

The deploy script copies `.clasp-dev.json` to `.clasp.json`, pushes `dist`, creates a DEV deployment, then removes `.clasp.json`.

## 5. Create And Initialize The Google Sheet

Create a Google Sheet for DEV, then open the Apps Script project and bind runtime execution to that sheet by opening the script from the Sheet or setting the active spreadsheet context used by the project.

Run this Apps Script function once:

```text
setupSpreadsheet
```

It creates these 9 tabs with headers from `src/config/table-headers.ts`:

- `Properties`
- `ReportDefinitions`
- `ExpectedReports`
- `ReceivedReports`
- `KPIHistory`
- `ReminderLog`
- `ExceptionQueue`
- `AuditLog`
- `Users`

## 6. Configure Script Properties

In Apps Script, set:

```text
SPREADSHEET_ID = <Google Sheet ID for the central MVP database>
DRIVE_ROOT_FOLDER_ID = <Google Drive folder ID for archived reports>
PM_NOTIFICATION_EMAIL = <fallback PM notification email>
ASSET_MANAGEMENT_EMAIL = <fallback Asset Management email>
```

The manual user sync reads Gmail as the signed-in user, writes rows to the central Sheet, and archives files under the shared Drive root.

## 7. Configure DEV Triggers

Run this Apps Script function once:

```text
installDevTriggers
```

It creates the DEV trigger schedule:

- `evaluateStatuses`: every 1 hour.
- `extendCalendar`: every 24 hours.

The installer removes existing triggers for those same handler names before creating new ones, preventing duplicate DEV triggers. Gmail intake is manual per signed-in user for this MVP and is run from the web app button `Sync Gmail to Drive`.

## 8. Populate Required Business Configuration

Populate these tabs before expecting automation to classify reports:

- `Properties`: the 4 MVP properties.
- `ReportDefinitions`: one row per expected report type/frequency/parser.
- `Users`: internal users, roles, allowed property IDs, and active flag.

The MVP properties are:

- La Jolla
- August at Friendswood
- Oasis
- Dalecrest

## 9. Manual Business Work Still Pending

These are business/data activities and cannot be completed from code alone:

- Populate source audit templates with real data for the 4 properties.
- Backfill history: 8 weeks of daily reports and 6 months of monthly reports.
- Reconcile occupancy and leads against original source reports.
- Run UAT in parallel with current operations for 10 or more business days.
- Expand to additional properties after pilot acceptance.
- Complete handover: manuals, documentation, owners, and operating cadence.

## 10. Operational Smoke Test

After configuration:

1. Send or forward one known report email to an authorized user's Gmail inbox.
2. Open the deployed Apps Script Web App as that user and approve Gmail, Drive, Sheets, and Mail scopes.
3. Click `Sync Gmail to Drive`.
4. Confirm a row appears in `ReceivedReports` with the user's email in `actorEmail`.
5. Confirm the attachment appears under the configured Drive archive root.
6. Confirm any parsed metrics appear in `KPIHistory`.
7. Click `Sync Gmail to Drive` again and confirm the same logical report is skipped, not duplicated.
8. Run `extendCalendar` and confirm rows are generated in `ExpectedReports`.
9. Run `evaluateStatuses` and confirm reports move only between `WAITING`, `RECEIVED`, and `MISSING`.

## Handler Reference

These functions are exposed globally for Apps Script:

- `doGet`
- `setupSpreadsheet`
- `processIntake`
- `evaluateStatuses`
- `extendCalendar`
- `installDevTriggers`
- `syncReportsNow`
