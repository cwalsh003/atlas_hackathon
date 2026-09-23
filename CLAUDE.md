# atlas_hackathon

Live-mockup client dashboard for the Jahnel Group Atlas hackathon. Spec: `docs/specs/live-mockup-dashboard.md` (tracked as GitHub issue #2). Vocabulary: `CONTEXT.md`. Decisions: `docs/adr/`. Plan, ticket map, and skill route: `docs/hackathon.md`.

## Stack

Vite, React 19, TypeScript, Vitest, oxlint, Prettier. Node 22 via `.node-version` (fnm). No backend beyond Vite dev-server middleware.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:5173
npm test             # Vitest, single run
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm run format       # prettier --write
npm run build        # production build to dist/
```

Run typecheck and the affected test file while working; run the full set before opening a PR. CI runs all of them on every PR.

Node 22 comes from fnm. In a non-interactive shell prefix commands with `eval "$(fnm env)"`; the plain `node` on PATH is 16 and cannot run Vite.

## Conventions

- Use the terms in `CONTEXT.md` in code, tests, issues, and comments. A dashboard *region* is not a React component; say "React component" when you mean one.
- Every agent-made change for a request is wrapped in `useFlag('req-<issue>')`. Never add a flags registry file (ADR 0001).
- Tests live beside the code they cover as `*.test.ts(x)` and test behavior through public interfaces.
- Demo-only UI (edit mode, pens, status pills, vote page) renders only when the demo-mode env var is set. Production builds must contain none of it.
- Prefer the standard library and existing dependencies. Add a dependency only when a few lines cannot do the job.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Request labels: `lane:implement`, `lane:vote`, `size:small`, `size:large`, `shipped`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- atlas-v3:guidance:start -->
## Workspace framing

Atlas workspace: **atlas_hackathon**. Confirmed repositories:

- `atlas_hackathon` at `.`; base `main`; source host `github`.

When isolation or parallel delivery benefits from worktrees, they live beneath
`.claude/worktrees/<work-package>/<repository-id>/`. The frontier
orchestrator chooses direct checkout, worker worktrees, and an optional
integration worktree from the dependency, concurrency, file-ownership, and
shared-state risks. Never place worktrees beneath `.atlas/`. Each affected
repository keeps its own base SHA, branch, verification result, and pull request.

## Repository framing

**atlas_hackathon** — Live-mockup client dashboard: a React dashboard for a fictional client where an edit mode turns element-level requests into Atlas-delivered changes behind feature flags.

### Structure

- `src/` — Vite React TypeScript application source
- `src/**/*.test.ts*` — Vitest unit tests beside the code they cover
- `docs/` — Agent policy and the Atlas operator guide
- `.github/workflows/ci.yml` — CI: format check, lint, typecheck, test, build on every PR

### Repository-specific rules

- No additional repository-specific rules are confirmed.

## Atlas repository workflow

Use the lightest route that fits:

- Small, clear change: `/implement <description-or-spec>` then verify.
- Normal feature: `/grill-with-docs` → optional prototype → `/to-spec` → optional `/to-tickets` → `/atlas-red-team` when required → optional `/atlas-plan <ticket-epic-or-spec>` → `/atlas-implement`.
- Huge or unclear effort: `/wayfinder`, then rejoin at the spec route.
- Existing ticket, epic, or stable spec: optional `/atlas-plan <work-package>` → `/atlas-implement <work-package>`.

Run `/atlas-plan` and `/atlas-implement` using the most capable approved
frontier-grade model available. These commands reserve frontier capacity for
planning, orchestration, review, and final verification; implementation
delegates tightly specified or mechanical work to the least expensive capable
worker model.

Managed work uses `/atlas-implement <ticket-or-epic-or-spec>`. A frontier
orchestrator chooses the execution structure and delegates bounded deliverables
when useful. It uses the least expensive capable worker model per delegation;
tight, mechanical packets favor cheaper models, while final review and
verification judgment stay with the frontier orchestrator. Implementation
workers read and follow the supported Matt Pocock implementation skill source
while deferring its final review step. Size alone is never a reason to stop.

## Repository policy and contract model

`CLAUDE.md` is the agent entry point and cross-cutting policy router. Team-owned
documents under `docs/agents/` are authoritative for their named scope. Within
a document that classifies entries, the classification determines authority;
recommendations and repository facts do not silently become mandatory policy.
Tickets and specs remain stable work-package contracts. Planning resolves the
applicable repository policy and facts into technical plans and execution
packets. Generic skills provide reusable mechanics and do not override
repository policy.

Setup initializes `docs/agents/*`; the team owns those files afterward. A setup
rerun refreshes only the managed sections Atlas itself last wrote, preserves any
section the team has edited, and reports every preserved edit in `plan` and
`verify` output.

- Before any tracker read, write, comment, claim, or transition, read and follow
  `docs/agents/issue-tracker.md`.
- Before creating, classifying, prioritizing, or decomposing tickets, read and
  follow `docs/agents/triage-labels.md`.
- Before clarifying, researching, prototyping, specifying, decomposing,
  technically planning, or red-team reviewing proposed work, read and follow
  `docs/agents/planning.md`. This includes `/grill-with-docs`, Wayfinder,
  planning prototypes, `/to-spec`, `/to-tickets`, and `/atlas-plan`.
- During planning, read `docs/agents/domain.md` when the work introduces or
  changes domain concepts and resolve conflicting terminology in the plan.
- Before writing acceptance criteria, Definition of Done, fixtures, or
  verification steps, read `docs/agents/testing.md`.
- During planning, read `docs/agents/tooling.md` when work depends on a detected
  capability and resolve the applicable tool into the execution plan.

Execution workers receive resolved decisions, exact verification commands, and
the evidence location in their task packet. Do not make execution workers
reread planning, tracker, triage, domain, testing, or tooling guidance.

## Atlas planning contract

- Invoking `/atlas-implement` approves the fixed work-package contract and any
  existing technical plan. When the contract is content-complete but no plan
  exists, the frontier orchestrator derives the execution plan without inventing
  missing product or architectural decisions.
- `/atlas-plan` is optional. Read `docs/agents/issue-tracker.md` for the
  project's configured readiness, availability, claim, transition, and
  writeback policy; do not infer those rules here.
<!-- atlas-v3:guidance:end -->
