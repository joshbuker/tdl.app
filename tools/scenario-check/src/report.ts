export interface AcceptanceResult {
  file: string;
  /** The describe blocks the test is nested in; a well-formed test has exactly one. */
  ancestorTitles: string[];
  feature: string;
  scenario: string;
  status: 'passed' | 'failed' | 'skipped';
}

interface VitestAssertion {
  ancestorTitles?: unknown;
  title?: unknown;
  status?: unknown;
}

interface VitestFile {
  name?: unknown;
  assertionResults?: unknown;
}

function toStatus(status: unknown): AcceptanceResult['status'] {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  return 'skipped';
}

/** Extracts results from `*.acceptance.test.ts` files in a Vitest JSON report. */
export function readVitestReport(json: unknown): AcceptanceResult[] {
  const files = (json as { testResults?: unknown } | null)?.testResults;
  if (!Array.isArray(files)) throw new Error('Not a Vitest JSON report: no testResults');

  const results: AcceptanceResult[] = [];
  for (const file of files as VitestFile[]) {
    if (typeof file.name !== 'string' || !file.name.endsWith('.acceptance.test.ts')) continue;
    if (!Array.isArray(file.assertionResults)) continue;
    for (const assertion of file.assertionResults as VitestAssertion[]) {
      const ancestorTitles = Array.isArray(assertion.ancestorTitles)
        ? assertion.ancestorTitles.filter((t): t is string => typeof t === 'string')
        : [];
      results.push({
        file: file.name,
        ancestorTitles,
        feature: ancestorTitles[0] ?? '',
        scenario: typeof assertion.title === 'string' ? assertion.title : '',
        status: toStatus(assertion.status),
      });
    }
  }
  return results;
}
