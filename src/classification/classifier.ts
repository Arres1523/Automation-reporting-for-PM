export interface ClassificationResult {
  propertyId: string | null;
  reportDefinitionId: string | null;
  frequency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  confidence: number;
  warnings: string[];
}

export interface ClassificationRule {
  reportDefinitionId: string;
  propertyId: string;
  senderPattern: string;
  subjectPattern: string;
  fileNamePattern: string;
  frequency: string;
}

export function classifyMessage(
  from: string,
  subject: string,
  attachments: Array<{ name: string }>,
  rules: ClassificationRule[]
): ClassificationResult {
  let best: ClassificationResult = {
    propertyId: null,
    reportDefinitionId: null,
    frequency: null,
    periodStart: null,
    periodEnd: null,
    confidence: 0,
    warnings: [],
  };

  for (const rule of rules) {
    let score = 0;

    if (new RegExp(rule.senderPattern, 'i').test(from)) score += 3;
    if (new RegExp(rule.subjectPattern, 'i').test(subject)) score += 2;

    for (const att of attachments) {
      if (new RegExp(rule.fileNamePattern, 'i').test(att.name)) {
        score += 2;
        break;
      }
    }

    if (score > best.confidence) {
      best = {
        propertyId: rule.propertyId,
        reportDefinitionId: rule.reportDefinitionId,
        frequency: rule.frequency,
        periodStart: extractPeriod(subject, attachments),
        periodEnd: null,
        confidence: score,
        warnings: [],
      };
    }
  }

  if (best.confidence <= 3) {
    best.warnings.push('Low confidence classification — review required');
  }

  return best;
}

export function extractPeriod(
  subject: string,
  attachments: Array<{ name: string }>
): string | null {
  const textToSearch = [subject, ...attachments.map(a => a.name)].join(' ');
  const yearFirst = textToSearch.match(/(?:^|\D)(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})(?=\D|$)/);
  if (yearFirst) {
    return formatDateParts(yearFirst[1], yearFirst[2], yearFirst[3]);
  }

  const compact = textToSearch.match(/(?:^|\D)(\d{4})(\d{2})(\d{2})(?=\D|$)/);
  if (compact) {
    return formatDateParts(compact[1], compact[2], compact[3]);
  }

  const monthFirst = textToSearch.match(/(?:^|\D)(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2,4})(?=\D|$)/);
  if (monthFirst) {
    const year = monthFirst[3].length === 2 ? `20${monthFirst[3]}` : monthFirst[3];
    return formatDateParts(year, monthFirst[1], monthFirst[2]);
  }

  const namedMonth = textToSearch.match(
    /(?:^|\D)(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})(?=\D|$)/i
  );
  if (namedMonth) {
    return formatDateParts(namedMonth[3], monthNumber(namedMonth[1]), namedMonth[2]);
  }

  return null;
}

function formatDateParts(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function monthNumber(monthName: string): string {
  const monthPrefix = monthName.slice(0, 3).toLowerCase();
  const months: Record<string, string> = {
    jan: '1',
    feb: '2',
    mar: '3',
    apr: '4',
    may: '5',
    jun: '6',
    jul: '7',
    aug: '8',
    sep: '9',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  return months[monthPrefix];
}
