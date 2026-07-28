# Phase 4: Intake, Classification & Archive

### Task 1: Gmail Service
- `src/intake/gmail-service.ts` — search unread messages matching criteria, get attachments, mark as read
- `tests/intake/gmail-service.test.ts` — interface tests

### Task 2: Message Classifier
- `src/classification/classifier.ts` — match sender/subject/file to ReportDefinition, extract period
- `tests/classification/classifier.test.ts`

### Task 3: Drive Archiver
- `src/storage/drive-archiver.ts` — save to Drive: Property/Frequency/YYYY/Period, return link
- `tests/storage/drive-archiver.test.ts`

### Task 4: Intake Orchestrator (processInbox)
- `src/intake/intake-orchestrator.ts` — coordinates: get mail → classify → archive → dedup → create ReceivedReport

### Task 5: Exception Handler
- `src/intake/exception-handler.ts` — log to ExceptionQueue for unknown sender/ambiguous period/missing attachment
- `tests/intake/exception-handler.test.ts`
