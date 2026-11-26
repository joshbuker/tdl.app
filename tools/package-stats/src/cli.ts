// Prints a comparison table of npm packages, with the facts CLAUDE.md asks for when evaluating
// dependencies: licence, adoption, maintenance and known vulnerabilities.
// Usage: pnpm stats:packages <package>...
// Reads npm's public registry and download counts, OSV (https://osv.dev) and GitHub through `gh`.
import { execFileSync } from 'node:child_process';
import { githubRepo, summarise, toTable, type GithubFacts, type RegistryDoc } from './stats.ts';

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(url, init);
  return response.ok ? ((await response.json()) as T) : null;
}

async function vulnerabilities(name: string, version?: string): Promise<string[]> {
  const body = JSON.stringify({ package: { name, ecosystem: 'npm' }, ...(version ? { version } : {}) });
  const result = await getJson<{ vulns?: { id: string }[] }>('https://api.osv.dev/v1/query', { method: 'POST', body });
  return (result?.vulns ?? []).map((vuln) => vuln.id);
}

function gh(path: string, jq: string): string {
  return execFileSync('gh', ['api', path, '--jq', jq], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function githubFacts(repo: string | null): GithubFacts | null {
  if (repo === null) return null;
  try {
    const [stars, openIssues, lastPush, archived] = gh(
      `repos/${repo}`,
      '"\\(.stargazers_count) \\(.open_issues_count) \\(.pushed_at[:10]) \\(.archived)"',
    ).split(' ');
    const contributors = gh(`repos/${repo}/contributors?per_page=100`, 'length');
    return {
      stars: Number(stars),
      openIssues: Number(openIssues),
      lastPush: lastPush ?? '',
      archived: archived === 'true',
      contributors: Number(contributors),
    };
  } catch {
    return null; // No `gh`, not logged in, or the repository is gone: those columns show "?".
  }
}

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: pnpm stats:packages <package>...');
  process.exit(2);
}

const now = Date.now();
const rows = [];
for (const name of names) {
  const registry = await getJson<RegistryDoc>(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
  if (registry === null) {
    console.error(`${name}: not found on npm`);
    continue;
  }
  const latest = registry['dist-tags']?.latest;
  const downloads = await getJson<{ downloads?: number }>(`https://api.npmjs.org/downloads/point/last-week/${name}`);
  const manifestRepo = latest === undefined ? undefined : registry.versions?.[latest]?.repository;
  const repoUrl = typeof manifestRepo === 'string' ? manifestRepo : manifestRepo?.url;
  rows.push(
    summarise({
      name,
      registry,
      weeklyDownloads: downloads?.downloads ?? null,
      vulnerabilitiesEver: await vulnerabilities(name),
      vulnerabilitiesInLatest: latest === undefined ? [] : await vulnerabilities(name, latest),
      github: githubFacts(githubRepo(repoUrl)),
      now,
    }),
  );
}
console.log(toTable(rows, now));
