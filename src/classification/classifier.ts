export interface ClassificationResult {
  propertyId: string | null;
  reportDefinitionId: string | null;
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

  return null;
}

function formatDateParts(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
