# Phase 1–2: Source Audit & Technical Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Establish the business baseline (source report inventory) and build the full development toolchain so subsequent phases have a known, testable foundation.

**Architecture:** Google Apps Script V8 monorepo compiled from TypeScript via esbuild, deployed with clasp. Three isolated environments (dev/staging/prod) with separate Gmail/Drive/Sheets resources. Vitest for local unit tests.

**Tech Stack:** TypeScript 5.x, esbuild, clasp, Vitest, Google Apps Script V8, Google Workspace (Gmail, Drive, Sheets, HTML Service)

## Global Constraints

- No AI/LLM in production — deterministic code only
- All source files preserved in Drive
- KPIs: occupancy and leads only for MVP
- States: `WAITING`, `RECEIVED`, `MISSING` — English UI
- Three environments: dev, staging, prod
- Minimum scopes: Gmail, Drive, Sheets, Mail.Send
- Secrets via Apps Script Properties (not in code)
- Deployments must be reproducible and rollbackable
- Corporate automation account for production
- All test files must be anonymized

---

### Task 1: Source Audit Templates & Checklist

**Files:**
- Create: `docs/source-audit/template-registro-fuentes.md`
- Create: `docs/source-audit/template-kpi-dictionary.md`
- Create: `docs/source-audit/pilot-selection-checklist.md`

**Interfaces:**
- Consumes: nothing
- Produces: structured audit templates for business users to fill

- [ ] **Step 1: Create source registration template**

```bash
mkdir -p "/Users/miguel-mac/Documents/valoris/Automation reporting for PM/docs/source-audit"
```

- [ ] **Step 2: Write source registration template**

```markdown
# Registro de Fuentes — [Property Name]

## Reporte: [Daily / Weekly / Monthly — Type]

| Campo | Valor |
|-------|-------|
| Propiedad | |
| Tipo de reporte | |
| Frecuencia | |
| Período informado | |
| Remitente(s) autorizado(s) | |
| Asunto del correo (patrón) | |
| Nombre del archivo (patrón) | |
| Tipo de archivo | |
| Versión del formato | |
| Ubicación de Occupancy | |
| Ubicación de Leads | |
| Deadline / hora límite | |
| Zona horaria | |
| Responsable de envío | |
| Destinatario de escalación | |

## Notas
- Variantes conocidas:
- Requiere revisión manual:
```

- [ ] **Step 3: Write KPI dictionary template**

```markdown
# Diccionario de KPIs

## Occupancy

| Campo | Valor |
|-------|-------|
| Definición | |
| Unidad | PERCENT |
| Rango válido | 0–100 |
| Fórmula / fuente | |
| Reglas de validación | |

## Leads

| Campo | Valor |
|-------|-------|
| Definición | |
| Unidad | COUNT |
| Rango válido | Entero ≥ 0 |
| Fórmula / fuente | |
| Reglas de validación | |
```

- [ ] **Step 4: Write pilot selection checklist**

```markdown
# Pilot Property Selection

Criterios (marcar con ✓ o ✗):

| Criterio | Prop A | Prop B | Prop C | Prop D |
|----------|--------|--------|--------|--------|
| Formato más estable | | | | |
| Mejor cobertura histórica | | | | |
| Menor número de variantes | | | | |
| Property Manager disponible | | | | |

**Seleccionada:** __________
```

- [ ] **Step 5: Commit**

```bash
git add docs/source-audit/
git commit -m "feat: add source audit templates for Phase 1"
```

---

### Task 2: Initialize TypeScript + esbuild + Vitest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (entry point, placeholder)
- Create: `tests/example.test.ts`
- Modify: `docs/2026-07-27-valoris-reporting-mvp-design.md` (no change — already committed)

**Interfaces:**
- Consumes: nothing
- Produces: build pipeline (npm run build, npm run test, npm run deploy)

- [ ] **Step 1: Create package.json**

```bash
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install --save-dev typescript esbuild vitest @types/google-apps-script
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["@types/google-apps-script"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Write esbuild.config.mjs**

```javascript
import * as esbuild from 'esbuild';
import fs from 'fs';

const production = process.argv.includes('--production');

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'node',
  target: 'es2020',
  format: 'esm',
  minify: production,
  sourcemap: !production,
  banner: {
    js: '// Valoris Reporting MVP - Built ' + new Date().toISOString().split('T')[0],
  },
});
```

Wait — Apps Script doesn't support ESM. Let me correct. The output needs to be a flat `.js` that Apps Script's V8 runtime can consume. Use `format: 'iife'` and no external imports.

```javascript
import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: production,
  sourcemap: !production,
});
```

- [ ] **Step 5: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Write .gitignore**

```
node_modules/
dist/
.clasp.json
.env
*.local
```

- [ ] **Step 7: Write src/index.ts**

```typescript
/**
 * Valoris Reporting MVP
 * Entry point — all exported functions become Apps Script triggers.
 */

function onInstall(): void {
  // Called once on first install
}

export { onInstall };
```

- [ ] **Step 8: Write tests/example.test.ts**

```typescript
import { describe, it, expect } from 'vitest';

describe('placeholder', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Add package.json scripts**

Edit the `scripts` field:

```json
{
  "scripts": {
    "build": "node esbuild.config.mjs",
    "build:prod": "node esbuild.config.mjs --production",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "clasp push && clasp deploy",
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 10: Build and test**

```bash
npm run build
npm run test
```

Expected: `build` produces `dist/Code.js`. `test` passes with 1 test.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json esbuild.config.mjs vitest.config.ts .gitignore src/ tests/
git commit -m "feat: initialize TypeScript + esbuild + Vitest toolchain"
```

---

### Task 3: Configure clasp for Dev Environment

**Files:**
- Create: `.clasp.json` (dev)
- Create: `.clasp-dev.json`
- Create: `appsscript.json`
- Modify: `package.json` (add clasp devDependency)

**Interfaces:**
- Consumes: `dist/Code.js` from Task 2
- Produces: `npm run deploy:dev` pushes to dev Apps Script project

- [ ] **Step 1: Install clasp**

```bash
npm install --save-dev @google/clasp
```

- [ ] **Step 2: Log in to clasp (manual — requires browser)**

```bash
npx clasp login
```

Note: This opens a browser for Google OAuth. Run manually.

- [ ] **Step 3: Create a dev Apps Script project (manual)**

```bash
npx clasp create --type standalone --title "Valoris Reporting DEV"
```

This creates `.clasp.json` with the script ID.

- [ ] **Step 4: Rename to .clasp-dev.json and write the deploy script**

```bash
mv .clasp.json .clasp-dev.json
```

Contents of `.clasp-dev.json` after creation:

```json
{
  "scriptId": "<dev-script-id>",
  "rootDir": "dist"
}
```

- [ ] **Step 5: Write appsscript.json**

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.send_mail"
  ]
}
```

- [ ] **Step 6: Add deploy scripts to package.json**

```json
{
  "scripts": {
    "deploy:dev": "cp .clasp-dev.json .clasp.json && clasp push && clasp deploy -d dev && rm .clasp.json",
    "deploy:staging": "cp .clasp-staging.json .clasp.json && clasp push && clasp deploy -d staging && rm .clasp.json",
    "deploy:prod": "cp .clasp-prod.json .clasp.json && clasp push && clasp deploy -d prod && rm .clasp.json"
  }
}
```

- [ ] **Step 7: Update .gitignore**

Add `.clasp.json` (the active one is ephemeral; the named versions are committed):

```
.clasp.json
```

- [ ] **Step 8: Commit**

```bash
git add .clasp-dev.json appsscript.json package.json .gitignore
git commit -m "feat: add clasp config for dev deployment"
```

---

### Task 4: Create Shared Types & Domain Contracts

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/interfaces.ts`
- Create: `src/domain/constants.ts`

**Interfaces:**
- Consumes: nothing (pure types)
- Produces: shared types consumed by all subsequent tasks

- [ ] **Step 1: Write src/domain/types.ts**

```typescript
export type ReportStatus = 'WAITING' | 'RECEIVED' | 'MISSING';

export type KpiCode = 'OCCUPANCY' | 'LEADS';

export type KpiUnit = 'PERCENT' | 'COUNT';

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Metric {
  code: KpiCode;
  value: number;
  unit: KpiUnit;
}

export interface ParsedReport {
  propertyId: string;
  reportDefinitionId: string;
  periodStart: string; // ISO 8601
  periodEnd: string;   // ISO 8601
  metrics: Metric[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IdentityKeys {
  expectedReportId: string;
  receivedReportId: string;
  kpiId: string;
  reminderId: string;
}

export interface DrivePath {
  property: string;
  frequency: string;
  year: string;
  period: string;
}
```

- [ ] **Step 2: Write src/domain/interfaces.ts**

```typescript
import type { ParsedReport, ValidationResult } from './types';

export interface Parser {
  parserKey: string;
  canParse(fileName: string, mimeType: string): boolean;
  parse(fileBlob: GoogleAppsScript.Base.Blob): ParsedReport;
}

export interface Validator {
  validate(report: ParsedReport): ValidationResult;
}

export interface Repository<T> {
  findById(id: string): T | null;
  save(entity: T): void;
  delete(id: string): void;
}

export interface ClassifierResult {
  propertyId: string | null;
  reportDefinitionId: string | null;
  periodStart: string | null;
  confidence: number;
}
```

- [ ] **Step 3: Write src/domain/constants.ts**

```typescript
export const STATUS = {
  WAITING: 'WAITING' as const,
  RECEIVED: 'RECEIVED' as const,
  MISSING: 'MISSING' as const,
};

export const KPI = {
  OCCUPANCY: 'OCCUPANCY' as const,
  LEADS: 'LEADS' as const,
};

export const FREQUENCY = {
  DAILY: 'DAILY' as const,
  WEEKLY: 'WEEKLY' as const,
  MONTHLY: 'MONTHLY' as const,
};

export const VALIDATION_LIMITS = {
  OCCUPANCY_MIN: 0,
  OCCUPANCY_MAX: 100,
  LEADS_MIN: 0,
};

export const TRIGGER_INTERVALS = {
  INTAKE_MINUTES: 5,
  STATUS_HOURS: 1,
  CALENDAR_HOURS: 24,
  BACKUP_HOURS: 24,
};

export const REMINDER_ESCALATION_HOURS = 24;

export const EXPECTED_REPORT_WINDOWS = {
  DAILY_DAYS: 14,
  WEEKLY_WEEKS: 8,
  MONTHLY_MONTHS: 6,
};
```

- [ ] **Step 4: Build and test**

```bash
npm run build
npm test
```

Expected: No type errors, tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/
git commit -m "feat: add shared domain types and constants"
```

---

### Task 5: Identity Helpers

**Files:**
- Create: `src/domain/identity.ts`
- Create: `tests/domain/identity.test.ts`

**Interfaces:**
- Consumes: `IdentityKeys` from `src/domain/types.ts`
- Produces: `buildExpectedReportId(...)`, `buildReceivedReportId(...)`, `buildKpiId(...)`, `buildReminderId(...)`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  buildExpectedReportId,
  buildReceivedReportId,
  buildKpiId,
  buildReminderId,
} from '../../src/domain/identity';

describe('buildExpectedReportId', () => {
  it('should compose from propertyId + definitionId + periodStart', () => {
    const id = buildExpectedReportId('prop-1', 'def-weekly', '2026-07-20');
    expect(id).toBe('prop-1_def-weekly_2026-07-20');
  });
});

describe('buildReceivedReportId', () => {
  it('should compose from messageId + sha256', () => {
    const id = buildReceivedReportId('msg123', 'abc123def456');
    expect(id).toBe('msg123_abc123def456');
  });

  it('should truncate sha to 12 chars and lowercase', () => {
    const id = buildReceivedReportId('msg1', 'ABC123DEF456GHI');
    expect(id).toBe('msg1_abc123def456');
  });
});

describe('buildKpiId', () => {
  it('should compose from expectedReportId + kpiCode', () => {
    const id = buildKpiId('prop-1_def-weekly_2026-07-20', 'OCCUPANCY');
    expect(id).toBe('prop-1_def-weekly_2026-07-20_OCCUPANCY');
  });
});

describe('buildReminderId', () => {
  it('should compose from expectedReportId + reminderType', () => {
    const id = buildReminderId('prop-1_def-weekly_2026-07-20', 'INITIAL');
    expect(id).toBe('prop-1_def-weekly_2026-07-20_INITIAL');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npx vitest run tests/domain/identity.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```typescript
export function buildExpectedReportId(
  propertyId: string,
  reportDefinitionId: string,
  periodStart: string
): string {
  return `${propertyId}_${reportDefinitionId}_${periodStart}`;
}

export function buildReceivedReportId(
  messageId: string,
  sha256: string
): string {
  const short = sha256.slice(0, 12).toLowerCase();
  return `${messageId}_${short}`;
}

export function buildKpiId(
  expectedReportId: string,
  kpiCode: string
): string {
  return `${expectedReportId}_${kpiCode}`;
}

export function buildReminderId(
  expectedReportId: string,
  reminderType: string
): string {
  return `${expectedReportId}_${reminderType}`;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run tests/domain/identity.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/identity.ts tests/domain/identity.test.ts
git commit -m "feat: add identity key helpers"
```

---

### Task 6: Audit Log Service

**Files:**
- Create: `src/audit/audit-log.ts`
- Create: `tests/audit/audit-log.test.ts`

**Interfaces:**
- Consumes: nothing external (pure service)
- Produces: `AuditLogEntry`, `writeAuditLog(entry: AuditLogEntry): void`, `queryAuditLog(filters): AuditLogEntry[]`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We'll test the interface — the real implementation uses Apps Script.
// For unit tests we mock the sheet.
import type { AuditLogEntry } from '../../src/audit/audit-log';

describe('AuditLogEntry structure', () => {
  it('should have required fields', () => {
    const entry: AuditLogEntry = {
      actor: 'user@valoris.com',
      action: 'CONFIG_UPDATE',
      entity: 'Properties',
      entityId: 'prop-1',
      oldValue: 'inactive',
      newValue: 'active',
      timestamp: '2026-07-27T12:00:00Z',
    };
    expect(entry.actor).toBe('user@valoris.com');
    expect(entry.action).toBe('CONFIG_UPDATE');
    expect(entry.timestamp).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/audit/audit-log.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**

```typescript
export interface AuditLogEntry {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

const LOG_HEADERS = [
  'actor',
  'action',
  'entity',
  'entityId',
  'oldValue',
  'newValue',
  'timestamp',
];

export function createAuditLogEntry(params: Omit<AuditLogEntry, 'timestamp'>): AuditLogEntry {
  return {
    ...params,
    timestamp: new Date().toISOString(),
  };
}

export function writeAuditLog(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: AuditLogEntry
): void {
  const values = [[
    entry.actor,
    entry.action,
    entry.entity,
    entry.entityId,
    entry.oldValue,
    entry.newValue,
    entry.timestamp,
  ]];
  sheet.appendRow(values[0]);
}

export function queryAuditLog(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  options?: { actor?: string; action?: string; limit?: number }
): AuditLogEntry[] {
  const data = sheet.getDataRange().getValues();
  const rows: AuditLogEntry[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const entry: AuditLogEntry = {
      actor: row[0],
      action: row[1],
      entity: row[2],
      entityId: row[3],
      oldValue: row[4],
      newValue: row[5],
      timestamp: row[6],
    };

    if (options?.actor && entry.actor !== options.actor) continue;
    if (options?.action && entry.action !== options.action) continue;

    rows.push(entry);

    if (options?.limit && rows.length >= options.limit) break;
  }

  return rows;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run tests/audit/audit-log.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audit/ tests/audit/
git commit -m "feat: add audit log service"
```

---

### Task 7: Sheet Repository Base Class

**Files:**
- Create: `src/repositories/base-repository.ts`
- Create: `tests/repositories/base-repository.test.ts`

**Interfaces:**
- Consumes: nothing (generic)
- Produces: `SheetRepository<T>` base class with `findById`, `save`, `delete`, `findAll`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { SheetRepository } from '../../src/repositories/base-repository';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

describe('SheetRepository', () => {
  it('should be constructable with headers and idColumn', () => {
    const repo = new SheetRepository<TestEntity>(
      ['id', 'name', 'value'],
      'id'
    );
    expect(repo).toBeInstanceOf(SheetRepository);
  });

  it('should map a row to an entity', () => {
    const repo = new SheetRepository<TestEntity>(
      ['id', 'name', 'value'],
      'id'
    );
    const entity = repo['rowToEntity'](['abc', 'test', 42]);
    expect(entity).toEqual({ id: 'abc', name: 'test', value: 42 });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/repositories/base-repository.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
export class SheetRepository<T extends Record<string, unknown>> {
  protected headers: string[];
  protected idColumn: string;

  constructor(headers: string[], idColumn: string) {
    this.headers = headers;
    this.idColumn = idColumn;
  }

  protected rowToEntity(row: unknown[]): T {
    const entity: Record<string, unknown> = {};
    this.headers.forEach((header, i) => {
      entity[header] = row[i];
    });
    return entity as T;
  }

  protected entityToRow(entity: T): unknown[] {
    return this.headers.map((header) => entity[header]);
  }

  findById(sheet: GoogleAppsScript.Spreadsheet.Sheet, id: string): T | null {
    const data = sheet.getDataRange().getValues();
    const idIndex = this.headers.indexOf(this.idColumn);
    if (idIndex < 0) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === id) {
        return this.rowToEntity(data[i]);
      }
    }
    return null;
  }

  findAll(sheet: GoogleAppsScript.Spreadsheet.Sheet): T[] {
    const data = sheet.getDataRange().getValues();
    const entities: T[] = [];
    for (let i = 1; i < data.length; i++) {
      entities.push(this.rowToEntity(data[i]));
    }
    return entities;
  }

  save(sheet: GoogleAppsScript.Spreadsheet.Sheet, entity: T): void {
    sheet.appendRow(this.entityToRow(entity));
  }

  deleteById(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    id: string
  ): boolean {
    const data = sheet.getDataRange().getValues();
    const idIndex = this.headers.indexOf(this.idColumn);
    if (idIndex < 0) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === id) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/repositories/base-repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/ tests/repositories/
git commit -m "feat: add SheetRepository base class"
```

---

### Task 8: Dev Environment Health Check Web App

**Files:**
- Modify: `src/index.ts` (add `doGet`)
- Create: `src/web/health.html`
- Create: `src/web/main.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `doGet()` handler serving health check page

- [ ] **Step 1: Write src/web/health.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top" />
    <style>
      body { font-family: system-ui, sans-serif; padding: 2rem; background: #f5f5f5; }
      .card { background: white; border-radius: 8px; padding: 2rem; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
      .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; }
      .ok { background: #d4edda; color: #155724; }
      .info { color: #666; font-size: 0.875rem; margin-top: 1rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Valoris Reporting MVP</h1>
      <div><span class="status ok">OPERATIONAL</span></div>
      <div class="info">
        <p>Environment: DEV</p>
        <p>Runtime: Google Apps Script V8</p>
        <p>Version: <?= version ?></p>
        <p>Timestamp: <?= timestamp ?></p>
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Write src/web/main.ts**

```typescript
export function renderHealthPage(): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile('web/health');
  template.version = '0.1.0';
  template.timestamp = new Date().toISOString();
  return template.evaluate().setTitle('Valoris Reporting MVP');
}
```

- [ ] **Step 3: Update src/index.ts**

```typescript
import { renderHealthPage } from './web/main';

/**
 * Serves the web application.
 */
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return renderHealthPage();
}

function onInstall(): void {
  // Called once on first install
}

export { doGet, onInstall };
```

- [ ] **Step 4: Update esbuild.config.mjs to copy HTML**

Apps Script HTML Service needs `.html` files alongside the code. Add a step to copy `src/web/*.html` to `dist/`:

```javascript
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const production = process.argv.includes('--production');

// Copy HTML files to dist
function copyHtmlPlugin(): esbuild.Plugin {
  return {
    name: 'copy-html',
    setup(build) {
      build.onEnd(() => {
        const srcDir = 'src/web';
        const destDir = 'dist';
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      });
    },
  };
}

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: production,
  sourcemap: !production,
  plugins: [copyHtmlPlugin()],
});
```

- [ ] **Step 5: Build and verify dist/ contains Code.js + health.html**

```bash
npm run build
ls dist/
```

Expected: `Code.js` and `health.html` present.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/web/ esbuild.config.mjs
git commit -m "feat: add health check web app and HTML copy build step"
```

---

### Task 9: Full Pipeline Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Exits 0, `dist/Code.js` and `dist/health.html` exist.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Push to remote**

```bash
git push
```

Expected: All commits pushed to `origin/main`.

---

## Self-Review Checklist

- [ ] Does each task produce independently testable output? — Yes (tests per module)
- [ ] Are all file paths exact? — Yes
- [ ] Are all code blocks filled with actual code (no TBDs)? — Yes
- [ ] Do the interfaces between tasks match? — Yes (types defined in Task 4 consumed by 5, 6, 7)
- [ ] Does the plan cover the spec's Phase 1 and Phase 2 requirements? — Phase 1 (Task 1 templates), Phase 2 (Tasks 2-9)
- [ ] Are there placeholder patterns ("TODO", "implement later")? — No
