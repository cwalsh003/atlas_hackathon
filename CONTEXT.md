# Live mockup dashboard

A client dashboard where viewers point at a region of the screen, say what they want changed, and Atlas delivers the change behind a flag. The audience plays the client; the dashboard is the mockup.

## Language

### The mockup

**Region**:
A marked area of the dashboard with a stable edit id that a viewer can attach a request to.
_Avoid_: component (collides with React components), element, block, widget

**Viewer**:
Anyone looking at the dashboard. A viewer who submits a request is its **requester**; a viewer who votes is a **voter**.
_Avoid_: user, client, audience, member

**Demo mode**:
A build of the dashboard that includes edit mode, the vote page, and flag overrides. A production build is not in demo mode.
_Avoid_: dev mode, hackathon mode

**Edit mode**:
A viewer's toggle, available only in demo mode, that shows a pen on every region.
_Avoid_: editing, edit view

**Status pill**:
The badge on a region that shows where its request is: queued, triage, building, PR open, waiting for approval, shipped, or declined.
_Avoid_: badge, indicator

### Requests

**Request**:
A prompt attached to one region by a requester, stored as a GitHub issue.
_Avoid_: ticket, change request, feature request, issue (say "issue" only for the GitHub record itself)

**Lane**:
Which path a request takes: `implement` or `vote`. Chosen by the requester at submit time.
_Avoid_: mode, track, path

**Size**:
Triage's judgement of an implement-lane request: `small` ships without a human click, `large` stops for plan review.
_Avoid_: fast lane, slow lane, complexity, effort

**Proposal**:
A request in the vote lane. It has votes and no code until promoted.
_Avoid_: idea, suggestion, candidate

**Promote**:
Turn a proposal into an implement-lane request.
_Avoid_: accept, approve (approve is the human plan gate), escalate

**Shipped**:
The state of a request whose change is merged behind its flag. In demo mode every viewer sees a shipped change.
_Avoid_: live, deployed, done, merged, released

**Declined**:
The state of a request triage will not act on, with a comment saying why. Covers both "needs info" and "won't do".
_Avoid_: rejected, closed

### Flags

**Flag**:
A per-request switch, named after the request's issue, that wraps every code change made for it.
_Avoid_: feature flag (implies a product feature), toggle, gate

**Override**:
A viewer's local choice to turn a flag on or off for themselves, available only in demo mode.
_Avoid_: preview, opt-in

**Consolidation**:
The closing request that removes flags for kept changes and deletes code for dropped ones, through one human-reviewed PR.
_Avoid_: cleanup, finalize, merge-down

### The fictional client

Abominable Snow Services, a yeti-staffed driveway snow-removal company in upstate NY. These terms exist only inside the dashboard's data.

**Work order**:
One driveway to clear on one date, assigned to a yeti.
_Avoid_: job, ticket, task

**Yeti**:
A technician who clears driveways.
_Avoid_: technician, driver, worker, employee

**Work order status**:
One of `scheduled`, `plowing`, `done`, or `buried`. Buried means the snow returned before the order was closed.
_Avoid_: state, stage
