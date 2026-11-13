import type { AcceptanceResult } from './report.ts';
import type { Spec } from './specs.ts';

export interface Problem {
  kind: 'missing' | 'orphan' | 'skipped' | 'malformed' | 'unknown-scope';
  feature: string;
  scenario: string;
}

/**
 * Compares spec scenarios with acceptance test results. A scenario must have a test when
 * its spec is Implemented, or when `scope` (spec path → scenario titles) lists it.
 */
export function checkScenarios(
  specs: Spec[],
  scope: Record<string, string[]>,
  results: AcceptanceResult[],
): Problem[] {
  const problems: Problem[] = [];
  const byTitle = new Map(specs.map((s) => [s.title, s]));
  const required = requiredScenarios(specs, scope, problems);

  const seen = new Set<string>();
  const key = (feature: string, scenario: string) => `${feature}\u0000${scenario}`;
  for (const result of results) {
    if (result.ancestorTitles.length !== 1) {
      problems.push({ kind: 'malformed', feature: result.ancestorTitles.join(' › '), scenario: result.scenario });
      continue;
    }
    const spec = byTitle.get(result.feature);
    if (spec === undefined || !spec.scenarios.includes(result.scenario)) {
      problems.push({ kind: 'orphan', feature: result.feature, scenario: result.scenario });
      continue;
    }
    seen.add(key(spec.title, result.scenario));
    if (result.status === 'skipped' && required.get(spec)?.has(result.scenario)) {
      problems.push({ kind: 'skipped', feature: spec.title, scenario: result.scenario });
    }
  }

  for (const spec of specs) {
    for (const scenario of spec.scenarios) {
      if (required.get(spec)?.has(scenario) && !seen.has(key(spec.title, scenario))) {
        problems.push({ kind: 'missing', feature: spec.title, scenario });
      }
    }
  }
  return problems;
}

/** The number of scenarios that must have an acceptance test: the ones `checkScenarios` checks. */
export function countRequiredScenarios(specs: Spec[], scope: Record<string, string[]>): number {
  let count = 0;
  for (const scenarios of requiredScenarios(specs, scope, []).values()) count += scenarios.size;
  return count;
}

/**
 * The scenarios each spec must have a test for: all of an Implemented spec's, plus those `scope`
 * lists. Adds an `unknown-scope` problem for each scope entry that matches no spec scenario.
 */
function requiredScenarios(
  specs: Spec[],
  scope: Record<string, string[]>,
  problems: Problem[],
): Map<Spec, Set<string>> {
  const byPath = new Map(specs.map((s) => [s.path, s]));
  const required = new Map<Spec, Set<string>>();
  for (const spec of specs) {
    if (spec.status === 'Implemented') required.set(spec, new Set(spec.scenarios));
  }
  for (const [path, scenarios] of Object.entries(scope)) {
    const spec = byPath.get(path);
    for (const scenario of scenarios) {
      if (spec === undefined) {
        problems.push({ kind: 'unknown-scope', feature: path, scenario });
      } else if (!spec.scenarios.includes(scenario)) {
        problems.push({ kind: 'unknown-scope', feature: spec.title, scenario });
      } else {
        const set = required.get(spec) ?? new Set<string>();
        set.add(scenario);
        required.set(spec, set);
      }
    }
  }
  return required;
}
