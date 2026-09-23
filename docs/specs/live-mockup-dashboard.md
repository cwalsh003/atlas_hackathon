# Live mockup dashboard with Atlas edit mode

Stable work-package contract. The GitHub issue # is the tracked copy; this file exists so `/atlas-red-team` can review it by path.

## Problem Statement

Jahnel Group ships dashboards and internal tools to clients. Every one of them comes back with a stream of small change requests: "make overdue rows red", "add a filter", "rename that column". Today each request travels through a chat message or a ticket a developer rewrites, a planning conversation, an implementation, and a review before the client sees anything. Small changes carry the same overhead as large ones, and the client never sees a change until it is finished.

For the hackathon, the audience plays the client. They need a way to point at a thing on the screen, say what they want, and watch it happen, with the risky requests stopped for a human.

## Solution

A client dashboard for a fictional customer, **Abominable Snow Services** (a yeti-staffed driveway snow-removal company in upstate NY), built the way JG would build it for a real client: React, TypeScript, Vite, mock data, client branding, "Built by Jahnel Group" footer.

A build-time **demo mode** adds an **edit mode** toggle. In edit mode every marked **region** on the dashboard shows a pen. Clicking the pen opens a prompt tied to that region. The requester types what they want and chooses a **lane**:

- **Implement**: Atlas creates an issue, triages it, and, when the change is small and well defined, implements it, merges it behind a per-issue **feature flag**, and the dashboard hot-reloads with the change visible to the whole room. Large or unclear requests stop for human plan approval.
- **Vote**: the request becomes a **proposal** on a separate vote page where coworkers vote. A promote button turns the winner into an implement-lane request.

While work happens, the region shows a status pill that walks through triage, building, PR open, and shipped. At the end of the demo a single **consolidation** issue turns the flagged experiments into permanent code through one human-reviewed PR. A production build has no edit mode and every flag reads false, so the untouched dashboard ships clean.

## Glossary

- **Region**: a marked area of the dashboard with a stable edit id (header, each KPI card, chart, work-orders table, each table column header, footer). Not a React component.
- **Request**: a prompt attached to a region by a **requester**, stored as a GitHub issue.
- **Lane**: `implement` or `vote`, chosen by the requester. Triage assigns an implement-lane request a **size**: `small` ships without a human click, `large` stops at plan review.
- **Proposal**: a request in the vote lane.
- **Flag**: a per-issue switch named after the issue, such as `req-42`, wrapping every agent-made change.
- **Demo mode**: build-time env var that enables edit mode, the vote page, and flag overrides.
- **Shipped**: the state, and issue label, of a request whose change is merged behind its flag; in demo mode every viewer sees it.
- **Consolidation**: the closing issue and PR that remove flags for kept changes and delete code for dropped ones.

## User Stories

1. As a dashboard viewer, I want to see work orders, technicians, and status KPIs for Abominable Snow Services, so that the app reads as a real client deliverable.
2. As a dashboard viewer, I want a chart and a sortable table over mock data, so that there are obvious things to ask to change.
3. As a demo operator, I want edit mode to exist only when the app is built with the demo env var, so that a normal build never shows pens or overrides.
4. As a requester, I want an edit-mode toggle in the header, so that pens appear only when I ask for them.
5. As a requester, I want a pen on every marked region, so that I can point at exactly the thing I want changed.
6. As a requester, I want the pen to open a prompt tied to that region, so that I do not have to describe where the thing is.
7. As a requester, I want to enter my name once and have it remembered in the browser, so that my requests and votes carry my name.
8. As a requester, I want to choose Implement or Vote when submitting, so that I can decide whether the room should weigh in first.
9. As a requester, I want the issue created for my request to include my prompt, the region id, the region's current markup, and my name, so that the agent can act without asking me anything.
10. As a requester, I want the region to show a status pill after I submit, so that I can see the request move.
11. As a requester, I want the pill to link to the GitHub issue, so that anyone can inspect the real ticket.
12. As a requester, I want the pill to walk through queued, triage, building, PR open, and shipped, so that I know what stage the work is in.
13. As a requester, I want a small change to appear on the dashboard without a page refresh, so that the moment it lands is visible.
14. As a requester, I want a large request to show "waiting for plan approval", so that I understand why it stopped.
15. As a requester, I want a nonsense or impossible request to be marked as needing info or declined, so that the system visibly says no rather than breaking the page.
16. As a room of viewers, I want every shipped change visible to everyone at once, so that the dashboard evolves collectively during the demo.
17. As a demo operator, I want only one implement-lane request in flight at a time with the rest shown as queued, so that agents never collide on the same region.
18. As a demo operator, I want the agent loop to run on my laptop and pick up new issues on its own, so that nobody types a command during the demo.
19. As a demo operator, I want the small-size rule written into the repository's Atlas policy, so that shipping without a human click is a documented decision rather than a bypass.
20. As a demo operator, I want the large size to follow the standard Atlas route, so that plan approval and merge stay human actions.
21. As a demo operator, I want the dashboard served from the `main` checkout on my laptop with hot reload, so that a merge is the deployment.
22. As a demo operator, I want the laptop server reachable from coworkers' devices through a tunnel, so that the room can file requests from their own phones and laptops.
23. As a voter, I want a vote page listing every proposal with its prompt, region, requester, and vote count, so that I can see what the room wants.
24. As a voter, I want one vote per name per proposal, so that the count is roughly honest.
25. As a demo operator, I want a promote button on a proposal, so that the winner becomes an implement-lane request.
26. As a demo operator, I want to file one consolidation issue naming which flags to keep and which to drop, so that Atlas opens one PR that removes the flags and the dead code.
27. As a reviewer, I want that consolidation PR to be human-reviewed, so that the final code is owned by a person.
28. As a client, I want the production build to contain no edit mode, no vote page, and no flag overrides, so that what I receive is only the dashboard.
29. As a coworker watching the recording, I want to see a small request land, a large request stop for approval, and a nonsense request get declined, so that the guardrails are visible.
30. As a future user, I want the vote page to note that votes could flow to Slack or Jira later, so that the enhancement path is clear.

## Implementation Decisions

- **Stack**: Vite, React, TypeScript, one chart library, mock data as a JSON module. No backend beyond Vite middleware.
- **Fictional client**: Abominable Snow Services. Work orders are driveways, technicians are yetis, statuses are scheduled, plowing, done, buried. Client branding on the app, "Built by Jahnel Group" in the footer.
- **Regions**: about ten marked areas, each rendered by a named React component with a stable `data-edit-id`. Agents edit the React component that owns the region id; new ids are added only when a request creates a new region.
- **Demo mode**: a build-time env var, off by default. It controls the edit toggle, pens, prompt modal, status pills, the vote page route, and flag overrides. Nothing demo-only renders when it is off, and the flag hook returns false unconditionally in that build.
- **Flag hook**: `useFlag(id)` returns true when the id is in the shipped set served by the server or in the viewer's local overrides. There is no flags registry file, so parallel PRs never conflict on one. Agents wrap every change in the flag for their issue and never touch other flags.
- **Flag defaults**: implement-lane flags turn on for everyone once the issue is labeled shipped. Vote-lane overrides are off by default and toggleable per viewer. Production build: all off.
- **Server endpoints** (Vite middleware, one process):
  - create request: takes prompt, region id, region markup, requester name, lane; creates a GitHub issue with the `needs-triage` label plus a lane label; returns the issue number.
  - request status: proxies issue labels and state for a list of issue numbers, cached for five seconds, so the room does not exhaust the unauthenticated GitHub rate limit.
  - flags: returns the set of issue numbers labeled shipped.
  - votes: reads and appends votes stored in a JSON file on the laptop; promote creates the implement-lane issue.
  - All GitHub writes and reads go through the `gh` CLI already authenticated on the laptop. No token lives in the browser.
- **Issue body contract**: prompt, region id, source file hint, current outer HTML of the region, requester, lane. Title is the prompt truncated, prefixed with the region id.
- **Labels**: existing triage labels stay as-is. New labels: `lane:implement`, `lane:vote`, `size:small`, `size:large`, `shipped`. Add them to the triage-labels doc.
- **Triage rule** (written into the Atlas tracker policy): an implement-lane issue is `size:small` when it touches one region, adds no data fields, and adds no dependency. Small skips plan review and the in-progress human gate: the agent implements, opens a PR, merges it, labels the issue shipped. Everything else is `size:large` and follows the standard route. Requests that cannot be understood get `needs-info`; requests outside the dashboard get `wontfix`, both with a comment explaining why.
- **Agent loop**: a Claude Code loop on the laptop polls for `needs-triage` issues, triages, then runs small requests or the standard route. One implement-lane issue in flight at a time, oldest first.
- **Deployment**: the Vite dev server serves the `main` checkout. After each merge the loop pulls `main`; hot reload shows the change. A tunnel exposes the server for the room.
- **Status pill**: polls the status endpoint every five seconds for the issues the viewer submitted or that are open on the board. Label to pill mapping: needs-triage means queued or triage, planning or in-progress means building, human-review means PR open, plan-review means waiting for approval, shipped means shipped, needs-info or wontfix means declined, with the comment shown.
- **Consolidation**: one issue listing keep and drop ids. The agent removes flag wrappers for keep, deletes code for drop, opens one PR for human review.

## Testing Decisions

- The highest seam is the server endpoints plus a real GitHub issue. One end-to-end smoke test posts a request to the local server, asserts an issue exists with the right labels and body, then closes it. This is the only test that touches the real dependency.
- Unit tests, with Vitest, cover the issue body builder, the label to pill state mapping, and the flag hook including the production build returning false. These test behavior through the public functions, not React internals.
- Typecheck and build are verification commands on every change, and small requests must pass both before merging. Update the testing policy doc with `npm test`, `npm run typecheck`, and `npm run build` once they exist.
- Visual proof is a screenshot of the dashboard in demo mode with pens visible, and one with a shipped status pill, saved under the proof folder.
- Prior art: none, this is a new repository.

## Out of Scope

- Agent-built previews for vote-lane proposals. Proposals are text only in this version.
- GitHub Pages or any hosted deployment. The laptop is the server.
- Running the agent loop in CI. Noted in the submission as the production path.
- Parallel agent runs. Flags make this safe later; this version is serial.
- Real authentication. Requester name is a text field remembered in the browser.
- Votes flowing to Slack or Jira. Mentioned on the vote page as a future enhancement.
- Editing anything other than the marked regions.

## Further Notes

- Submission is due 4pm Thursday 9/24/2026 with description, screenshots, and a recording. Build order: dashboard and edit mode, then flags and small requests end to end, then the vote page, then the large size and recording. The cut line is after the large size; if the vote page slips it becomes a "coming soon" tab.
- The recording shows three loops: a small change that lands on its own, a large change that stops for plan approval and is approved on camera, and a nonsense request that triage declines.
- The pitch line: every client dashboard JG ships could carry this button, with Atlas as the thing that makes it safe.
