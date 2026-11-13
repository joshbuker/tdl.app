/** The sync protocol's `major.minor` version (see docs/design-decisions/protocol-versions.md). */
export const PROTOCOL_VERSION = '1.0';

/** The header that carries the app's version on every sync request, and the server's on every reply. */
export const PROTOCOL_HEADER = 'tdl-protocol';

export interface ProtocolVersion {
  major: number;
  minor: number;
}

const VERSION = /^(\d+)\.(\d+)$/;

/** `major.minor`, or null for anything else. */
export function parseProtocolVersion(value: string): ProtocolVersion | null {
  const match = VERSION.exec(value);
  if (match === null) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/**
 * Whether an app on `app` can sync with a server on `server`. Apps support the server's current and
 * previous major version, so a server one major behind is ok; a newer major means the app must update.
 * An unreadable version counts as outdated on its own side.
 */
export function compareProtocol(app: string, server: string): 'ok' | 'app-outdated' | 'server-outdated' {
  const a = parseProtocolVersion(app);
  const s = parseProtocolVersion(server);
  if (a === null) return 'app-outdated';
  if (s === null) return 'server-outdated';
  if (s.major > a.major) return 'app-outdated';
  if (s.major <= a.major - 2) return 'server-outdated';
  return 'ok';
}
