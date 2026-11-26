# Dependency safety

## Context

Every dependency is code we ship or run, written by someone else. The npm ecosystem has had repeated supply-chain attacks: malicious versions published after an account takeover, typosquatted names, and packages that change hands. Most malicious versions are found and removed within days. Separately, a package can be a poor choice without being malicious: barely used, maintained by one person who has moved on, or written with weak security. While planning the Android app (2026-11-26), a month-old package with 45 weekly downloads was named as the alternative to a widely used one, because only its licence, dates and platform support were checked.

## Decision

- **Choosing a dependency:** CLAUDE.md's rules for evaluating libraries apply. Candidates come from several sources, each is checked for licence, adoption, maintenance and stability, and security, and all are compared in one table before a recommendation. Barely used, unmaintained or sketchy packages are avoided. `pnpm stats:packages <package>...` prints that table from npm, OSV and GitHub, with warnings for what to avoid.
- **Installing new versions:** pnpm installs a version only once it's 7 days old (`minimumReleaseAge: 10080` in `pnpm-workspace.yaml`). An urgent security fix can be let through by name with `minimumReleaseAgeExclude`, removed once the fix is 7 days old.
- **Known vulnerabilities:** CI runs `pnpm audit`. A high or critical vulnerability in what ships (`--prod`) fails the build; everything else, development tools included, is reported without failing.

## Alternatives considered

- **pnpm's default 1-day wait:** catches less, since many malicious releases are found after the first day.
- **A longer wait (14 to 30 days):** safer, but delays ordinary fixes, and security fixes would need exceptions more often.
- **Failing CI on any vulnerability:** development tools often carry moderate advisories with no fix yet, which would block every build for issues that don't reach users.
- **A third-party scanner (Socket, Snyk):** catches more (install-time behaviour, maintainer changes), but adds an account and a service; may be worth it before launch.
- **Checking candidates by hand, without the script:** what happened before, and why the barely used package slipped through.

## Consequences

- A dependency update arrives a week after its release. Adding a package that was just published fails to resolve until it's 7 days old, and exact pins must name a version at least that old.
- Plan reviews and decision records can point to the comparison table, so "why this package" has evidence.
- The script relies on npm's public APIs, OSV and an authenticated `gh` for GitHub figures; without `gh`, those columns show `?`.
- Native code pulled in outside npm (Android's Gradle libraries) isn't covered by the audit or the licence check.
