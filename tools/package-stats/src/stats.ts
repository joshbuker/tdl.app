// The facts CLAUDE.md asks for when comparing dependencies, and the warnings they raise.

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
/** Below this many weekly downloads, a package counts as barely used (see CLAUDE.md). */
export const BARELY_USED_PER_WEEK = 1000;

export interface PackageStats {
  name: string;
  latest: string;
  licence: string | null;
  /** The deprecation message, or null. */
  deprecated: string | null;
  /** Dates as YYYY-MM-DD. */
  created: string | null;
  released: string | null;
  releasesLastYear: number;
  maintainers: number;
  weeklyDownloads: number | null;
  dependencies: number;
  installScripts: string[];
  vulnerabilitiesEver: number;
  vulnerabilitiesInLatest: string[];
  /** `owner/repo` on GitHub, or null. */
  repository: string | null;
  stars: number | null;
  contributors: number | null;
  openIssues: number | null;
  lastPush: string | null;
  archived: boolean | null;
}

export interface GithubFacts {
  stars: number;
  contributors: number;
  openIssues: number;
  lastPush: string;
  archived: boolean;
}

interface RegistryVersion {
  license?: unknown;
  deprecated?: unknown;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  repository?: { url?: string } | string;
}

/** The parts of an npm registry document (`https://registry.npmjs.org/<name>`) that are read. */
export interface RegistryDoc {
  'dist-tags'?: { latest?: string };
  time?: Record<string, string>;
  maintainers?: unknown[];
  versions?: Record<string, RegistryVersion>;
  repository?: { url?: string } | string;
}

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

/** `owner/repo` from a repository URL on GitHub, or null. */
export function githubRepo(url: string | undefined): string | null {
  const match = /github\.com[/:]([^/]+)\/([^/#]+?)(?:\.git)?(?:[/#]|$)/.exec(url ?? '');
  const [, owner, repo] = match ?? [];
  return owner !== undefined && repo !== undefined ? [owner, repo].join('/') : null;
}

const day = (iso: string | undefined): string | null => (iso === undefined ? null : iso.slice(0, 10));
const repositoryUrl = (repository: RegistryVersion['repository']): string | undefined =>
  typeof repository === 'string' ? repository : repository?.url;

export function summarise(input: {
  name: string;
  registry: RegistryDoc;
  weeklyDownloads: number | null;
  vulnerabilitiesEver: string[];
  vulnerabilitiesInLatest: string[];
  github: GithubFacts | null;
  now: number;
}): PackageStats {
  const { registry, now } = input;
  const latest = registry['dist-tags']?.latest ?? '';
  const manifest = registry.versions?.[latest] ?? {};
  const times = Object.entries(registry.time ?? {}).filter(([key]) => key !== 'created' && key !== 'modified');
  const scripts = manifest.scripts ?? {};
  return {
    name: input.name,
    latest,
    licence: typeof manifest.license === 'string' ? manifest.license : null,
    deprecated: typeof manifest.deprecated === 'string' ? manifest.deprecated : null,
    created: day(registry.time?.created),
    released: day(registry.time?.[latest]),
    releasesLastYear: times.filter(([, time]) => now - Date.parse(time) < YEAR_MS).length,
    maintainers: registry.maintainers?.length ?? 0,
    weeklyDownloads: input.weeklyDownloads,
    dependencies: Object.keys(manifest.dependencies ?? {}).length,
    installScripts: INSTALL_SCRIPTS.filter((script) => script in scripts),
    vulnerabilitiesEver: input.vulnerabilitiesEver.length,
    vulnerabilitiesInLatest: input.vulnerabilitiesInLatest,
    repository: githubRepo(repositoryUrl(manifest.repository) ?? repositoryUrl(registry.repository)),
    stars: input.github?.stars ?? null,
    contributors: input.github?.contributors ?? null,
    openIssues: input.github?.openIssues ?? null,
    lastPush: input.github?.lastPush ?? null,
    archived: input.github?.archived ?? null,
  };
}

/** What CLAUDE.md says to avoid or look into, in a fixed order. */
export function warningsFor(stats: PackageStats, now: number): string[] {
  const warnings: string[] = [];
  const olderThan = (date: string | null, ms: number) => date !== null && now - Date.parse(date) > ms;
  if (stats.weeklyDownloads !== null && stats.weeklyDownloads < BARELY_USED_PER_WEEK) {
    warnings.push(`barely used (${String(stats.weeklyDownloads)}/week)`);
  }
  if (stats.created !== null && !olderThan(stats.created, YEAR_MS)) warnings.push('under a year old');
  if (olderThan(stats.released, YEAR_MS)) warnings.push('no release in a year');
  if (stats.archived === true) warnings.push('archived');
  if (stats.deprecated !== null) warnings.push(`deprecated: ${stats.deprecated}`);
  if (stats.vulnerabilitiesInLatest.length > 0) {
    warnings.push(`known vulnerabilities in latest: ${stats.vulnerabilitiesInLatest.join(', ')}`);
  }
  if (stats.installScripts.length > 0) warnings.push(`install scripts: ${stats.installScripts.join(', ')}`);
  return warnings;
}

type Cell = string | number | boolean | null;

const COLUMNS: [string, (s: PackageStats) => Cell][] = [
  ['Package', (s) => s.name],
  ['Version', (s) => s.latest],
  ['Licence', (s) => s.licence],
  ['Downloads/week', (s) => s.weeklyDownloads],
  ['Created', (s) => s.created],
  ['Released', (s) => s.released],
  ['Releases (1y)', (s) => s.releasesLastYear],
  ['Maintainers', (s) => s.maintainers],
  ['Deps', (s) => s.dependencies],
  ['Vulns (ever)', (s) => s.vulnerabilitiesEver],
  ['Repository', (s) => s.repository],
  ['Stars', (s) => s.stars],
  ['Contributors', (s) => s.contributors],
  ['Open issues', (s) => s.openIssues],
  ['Last push', (s) => s.lastPush],
];

/** A Markdown table, one row per package, ending with its warnings. */
export function toTable(rows: PackageStats[], now: number): string {
  const cell = (value: Cell) => (value === null ? '?' : String(value));
  const header = [...COLUMNS.map(([title]) => title), 'Warnings'];
  const lines = [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => ' --- ').join('|')}|`,
    ...rows.map((row) => {
      const warnings = warningsFor(row, now);
      return `| ${[...COLUMNS.map(([, get]) => cell(get(row))), warnings.length > 0 ? warnings.join('; ') : 'none'].join(' | ')} |`;
    }),
  ];
  return lines.join('\n');
}
