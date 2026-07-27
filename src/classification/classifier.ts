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
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{4})(\d{2})(\d{2})/,
  ];

  const textToSearch = [subject, ...attachments.map(a => a.name)].join(' ');

  for (const pattern of datePatterns) {
    const match = textToSearch.match(pattern);
    if (match) {
      if (match[3] && match[1] && match[2]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return match[0];
    }
  }

  return null;
}
