export interface Policy {
  allowed: string[];
  /** Package name → why its reported licence is in fact compatible. */
  exceptions: Record<string, string>;
}

export interface Violation {
  name: string;
  versions: string[];
  licence: string;
}

/**
 * Whether an SPDX licence expression is allowed: `OR` needs any branch allowed,
 * `AND` needs all of them, `X WITH exception` needs X. Malformed expressions are refused.
 */
export function isAllowed(spdx: string, allowed: readonly string[]): boolean {
  const allowedIds = new Set(allowed.map((id) => id.toLowerCase()));
  const tokens = spdx.match(/\(|\)|[^\s()]+/g) ?? [];
  let pos = 0;

  const peek = (): string | undefined => tokens[pos];
  const isKeyword = (token: string | undefined, keyword: string) => token?.toUpperCase() === keyword;

  // Recursive descent over the expression text. Licence expressions are a few tokens long.
  function parseOr(): boolean | null {
    let value = parseAnd();
    while (value !== null && isKeyword(peek(), 'OR')) {
      pos++;
      const right = parseAnd();
      if (right === null) return null;
      value = value || right;
    }
    return value;
  }

  function parseAnd(): boolean | null {
    let value = parseTerm();
    while (value !== null && isKeyword(peek(), 'AND')) {
      pos++;
      const right = parseTerm();
      if (right === null) return null;
      value = value && right;
    }
    return value;
  }

  function parseTerm(): boolean | null {
    const token = peek();
    if (token === undefined || token === ')' || isKeyword(token, 'AND') || isKeyword(token, 'OR')) return null;
    pos++;
    if (token === '(') {
      const value = parseOr();
      if (peek() !== ')') return null;
      pos++;
      return value;
    }
    if (isKeyword(peek(), 'WITH')) {
      pos++;
      if (peek() === undefined) return null;
      pos++;
    }
    return allowedIds.has(token.toLowerCase());
  }

  const result = parseOr();
  return result === true && pos === tokens.length;
}

/** Lists packages whose licence the policy doesn't allow, from `pnpm licenses list --json`. */
export function findViolations(
  byLicence: Record<string, { name: string; versions: string[] }[]>,
  policy: Policy,
): Violation[] {
  const violations: Violation[] = [];
  for (const [licence, packages] of Object.entries(byLicence)) {
    if (isAllowed(licence, policy.allowed)) continue;
    for (const pkg of packages) {
      if (Object.hasOwn(policy.exceptions, pkg.name)) continue;
      violations.push({ name: pkg.name, versions: pkg.versions, licence });
    }
  }
  return violations;
}
