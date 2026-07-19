# Security Policy

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting** for this repository
(Security tab → "Report a vulnerability"). Do **not** open a public issue for
security problems, and never include real financial data or secrets in a report.

You can expect an initial response within a few days. Fixes ship as regular
commits/releases; credit is given unless you prefer otherwise.

## Scope & posture

Kist is a **local-first, single-user** app: it binds to `127.0.0.1`, stores data
in a local SQLite file outside the repo, and has no accounts or server-side
components. The most relevant vulnerability classes are therefore: anything that
makes the app listen beyond localhost, code execution via crafted local data,
secrets/PII leaking into the repository, and CSRF/DNS-rebinding against the
local server or a local LLM.

## What already guards the repo

- `server/security_review.py` — secret scan of the tree **and full git
  history**, static dangerous-pattern checks, maintainer personal-data audit,
  config hygiene, endpoint smoke tests and an active probe of any local LLM
  server; runs on every push/PR + weekly in CI and is available from the
  Control Center.
- Scanner-efficacy tests plant synthetic leaks and assert they are caught.
- CI enforces a coverage floor and a bandit gate; CodeQL and Dependabot are on.
