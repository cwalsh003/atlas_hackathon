# Demo runbook: checklist and recording plan

Ticket #10. The loop itself is documented in [runbook-loop.md](runbook-loop.md); the tunnel script and Vite host config shipped in #11. Submission is due 4 pm Thursday 2026-09-24; the live loop runs Thursday night with the audience filing requests from their phones.

## Pre-demo checklist

Run from a fresh terminal on the demo laptop, in this order. Every step names what you should see.

1. **Node 22.** `cd /Users/cwalsh/hack_atlas && fnm use` prints `Using Node v22.x`.
2. **GitHub CLI.** `gh auth status` shows you logged in with repo scope.
3. **Claude CLI.** `claude /login` once in a plain terminal if `claude auth status` says logged out. The loop's child sessions need it.
4. **Tools.** `cloudflared --version` and `jq --version` both print a version (`brew install cloudflared jq` if not).
5. **Served checkout.** `git status --short` prints nothing and `git branch --show-current` prints `main`; `git pull --ff-only` is a no-op. This checkout is what the room sees; never edit it by hand during the demo.
6. **Dev server in demo mode.** `npm run dev:demo` and open http://localhost:5173: the dashboard shows the Edit mode toggle and the Vote link in the header. Plain `npm run dev` has neither and its request endpoints are off.
7. **Tunnel.** In a second terminal `scripts/tunnel.sh`; copy the boxed `https://<words>.trycloudflare.com` URL. Open it on a phone with wifi off: the dashboard renders with no "Blocked request" page. Keep this URL off every screen you record; share it by message or QR only.
8. **Loop.** In a third terminal `scripts/loop.sh`; the first line reads `loop start: served=... mode=atlas ... as cwalsh003`. See [runbook-loop.md](runbook-loop.md) for the allowlist it uses and how to stop it.
9. **Scratch request.** With the loop stopped (`touch .claude/loop-stop`, wait for `loop stopped`), file one request from the phone through the modal, confirm it appears as an issue, close it with a comment, then restart the loop. Never run `npm run smoke` or the #4/#5 evidence flows while the loop runs.
10. **Board is clean.** `gh issue list --label needs-triage` shows nothing unexpected; no `size:small` issue is assigned without `shipped`; no leftover `.claude/worktrees/req-*`.
11. **Viewport.** On the phone: pens are absent, the whole region is the tap target, the hint banner shows under the header when edit mode is on; at 1280px on the laptop: pens on all 15 regions.
12. **Vote page.** `/vote` on the phone lists proposals with a Vote button and no Promote button; on the laptop it shows Promote (operator only).

## Recording plan

Three loops, cut to under four minutes total. Record the laptop screen at 1280px plus a phone over the shoulder. The tunnel URL is never in frame.

| Loop                                | What happens on screen                                                                                                                                                                                                                                                           | Measured today                                                | Cut to                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| 1. Small request lands on its own   | Phone taps the Buried KPI, types "Rename the Buried KPI to Snowed in", Build it. Laptop: pill goes queued, triage, building, PR open, shipped; label changes with no reload.                                                                                                     | 407–496 s filed to shipped (#42, #44, #45, #51: 368 s)        | 60–75 s: file, pill states, the label flip            |
| 2. Large request approved on camera | Phone asks for a two-region change ("Rename the Yeti column to Crew in the table and the roster"). Pill: waiting for approval. Laptop shows the plan comment; presenter runs the approve command; pill: building, PR open; presenter merges; pill: shipped, both regions change. | plan 284 s, approval to PR 421 s, merge to shipped 12 s (#49) | 75–90 s: file, plan appears, approve, PR, merge, flip |
| 3. Nonsense request declined        | Phone asks "make it Tuesday". Pill: declined; tap shows the triage comment.                                                                                                                                                                                                      | 13 s after filing (#50)                                       | 20–30 s                                               |

Approve command for loop 2 (also in runbook-loop.md): `gh issue edit <n> --remove-label plan-review --add-label in-progress`. Merge: `gh pr merge <pr> --squash --delete-branch`.

Closing shot: the vote page with two proposals and a Promote, and the pitch line: every client dashboard JG ships could carry this button, with Atlas as the thing that makes it safe.

## Dry run

Measured runs on 2026-09-24 stand in for the dry run: four small requests shipped unattended (368–496 s), one large request went through both human gates, one nonsense request was declined in 13 s, all through the loop against the served checkout with the tunnel up. Before recording, run loops 1 and 3 once more end to end and note the times here:

| Rehearsal | Small filed→shipped | Declined | Notes |
| --------- | ------------------- | -------- | ----- |
| (fill in) |                     |          |       |

## If something breaks

- Loop blocked a request: the issue carries `ready-for-human` and a `[BLOCKED]` comment with the reason; fix, remove the label, the loop retries.
- No pills: check `curl localhost:5173/api/requests/status` returns JSON; the server must be `dev:demo`.
- Tunnel 502: the dev server is not running on 5173.
- Change merged but not visible: `git -C /Users/cwalsh/hack_atlas pull --ff-only`, then check the issue carries `shipped`.
