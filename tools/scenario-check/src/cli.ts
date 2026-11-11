// Checks that spec scenarios have acceptance tests. Run from the repository root,
// after `pnpm test` has written reports/vitest.json.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkScenarios } from './check.ts';
import { readVitestReport } from './report.ts';
import { parseSpec } from './specs.ts';

const featuresDir = 'docs/features';
const reportPath = 'reports/vitest.json';

const specs = readdirSync(featuresDir, { recursive: true, encoding: 'utf8' })
  .filter((path) => path.endsWith('.md') && !path.split('/').includes('README.md'))
  .sort()
  .map((path) => parseSpec(readFileSync(join(featuresDir, path), 'utf8'), path));

const scope = JSON.parse(readFileSync('scenario-scope.json', 'utf8')) as Record<string, string[]>;

if (!existsSync(reportPath)) {
  console.error(`${reportPath} not found: run pnpm test first`);
  process.exit(1);
}
const results = readVitestReport(JSON.parse(readFileSync(reportPath, 'utf8')));

const problems = checkScenarios(specs, scope, results);
for (const problem of problems) {
  console.log(`${problem.kind}: ${problem.feature} › ${problem.scenario}`);
}
process.exit(problems.length > 0 ? 1 : 0);
