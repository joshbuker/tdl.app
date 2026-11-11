export type SpecStatus = 'Proposed' | 'Specified' | 'Implemented';

export interface Spec {
  /** Path relative to docs/features, e.g. "dependencies/link-tasks.md". */
  path: string;
  title: string;
  status: SpecStatus;
  scenarios: string[];
}

const statuses: readonly string[] = ['Proposed', 'Specified', 'Implemented'];

function isStatus(value: string): value is SpecStatus {
  return statuses.includes(value);
}

/** Reads a spec's H1 title, `Status:` line, and the H3 titles under `## Scenarios`. */
export function parseSpec(markdown: string, path: string): Spec {
  let title: string | undefined;
  let status: SpecStatus | undefined;
  const scenarios: string[] = [];
  let inScenarios = false;
  let inFence = false;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (title === undefined && line.startsWith('# ')) {
      title = line.slice(2).trim();
    } else if (status === undefined && line.startsWith('Status:')) {
      const value = line.slice('Status:'.length).trim();
      if (!isStatus(value)) throw new Error(`${path}: unknown status "${value}"`);
      status = value;
    } else if (line.startsWith('## ')) {
      inScenarios = line.slice(3).trim() === 'Scenarios';
    } else if (inScenarios && line.startsWith('### ')) {
      scenarios.push(line.slice(4).trim());
    }
  }

  if (title === undefined) throw new Error(`${path}: no H1 title`);
  if (status === undefined) throw new Error(`${path}: no Status line`);
  return { path, title, status, scenarios };
}
