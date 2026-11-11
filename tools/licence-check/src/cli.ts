// Checks every installed dependency's licence against licence-policy.json.
// Run from the repository root, after `pnpm install`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { findViolations, type Policy } from './policy.ts';

const policy = JSON.parse(readFileSync('licence-policy.json', 'utf8')) as Policy;
const output = execFileSync('pnpm', ['licenses', 'list', '--json'], { encoding: 'utf8' });
const byLicence = JSON.parse(output) as Record<string, { name: string; versions: string[] }[]>;

const violations = findViolations(byLicence, policy);
for (const v of violations) {
  console.log(`${v.name}@${v.versions.join(', ')}: ${v.licence}`);
}
process.exit(violations.length > 0 ? 1 : 0);
