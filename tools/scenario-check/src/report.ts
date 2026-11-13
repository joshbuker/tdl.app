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

interface PlaywrightSpec {
  title?: unknown;
  ok?: unknown;
  tests?: unknown;
}

interface PlaywrightSuite {
  title?: unknown;
  file?: unknown;
  specs?: unknown;
  suites?: unknown;
}

function playwrightStatus(spec: PlaywrightSpec): AcceptanceResult['status'] {
  const tests = Array.isArray(spec.tests) ? (spec.tests as { status?: unknown }[]) : [];
  if (tests.length > 0 && tests.every((test) => test.status === 'skipped')) return 'skipped';
  return spec.ok === true ? 'passed' : 'failed';
}

/**
 * Extracts results from `*.acceptance.test.ts` files in a Playwright JSON report. Its top-level
 * suites are files; the suites inside them are describe blocks.
 */
export function readPlaywrightReport(json: unknown): AcceptanceResult[] {
  const files = (json as { suites?: unknown } | null)?.suites;
  if (!Array.isArray(files)) throw new Error('Not a Playwright JSON report: no suites');

  const results: AcceptanceResult[] = [];
  for (const file of files as PlaywrightSuite[]) {
    if (typeof file.file !== 'string' || !file.file.endsWith('.acceptance.test.ts')) continue;
    const name = file.file;
    // Walks the describe blocks with an explicit stack, keeping each one's titles.
    const pending: { suite: PlaywrightSuite; ancestorTitles: string[] }[] = [{ suite: file, ancestorTitles: [] }];
    while (pending.length > 0) {
      const { suite, ancestorTitles } = pending.pop() as (typeof pending)[number];
      for (const spec of Array.isArray(suite.specs) ? (suite.specs as PlaywrightSpec[]) : []) {
        results.push({
          file: name,
          ancestorTitles,
          feature: ancestorTitles[0] ?? '',
          scenario: typeof spec.title === 'string' ? spec.title : '',
          status: playwrightStatus(spec),
        });
      }
      for (const child of Array.isArray(suite.suites) ? (suite.suites as PlaywrightSuite[]) : []) {
        const title = typeof child.title === 'string' ? child.title : '';
        pending.push({ suite: child, ancestorTitles: [...ancestorTitles, title] });
      }
    }
  }
  return results;
}
