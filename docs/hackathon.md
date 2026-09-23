# Hackathon plan

JG Connection Event, AI Edition. Atlas Build hackathon: build something real using Atlas plugins.

- **Submission due:** 4pm Thursday 2026-09-24, via a form, with a description, screenshots, and a recording.
- **Voting:** separate form after submission, closes 5pm. Winner demos Thursday night.
- **Builder:** Colin, solo. The audience plays the client on demo night and files requests from their phones.

## What we are building

The spec is [GitHub issue #2](https://github.com/cwalsh003/atlas_hackathon/issues/2), mirrored at `docs/specs/live-mockup-dashboard.md`. Vocabulary is in `CONTEXT.md`. Decisions are in `docs/adr/`. Pitch line: every client dashboard JG ships could carry this button, with Atlas as the thing that makes it safe.

## The skill route

The point of the hackathon is to route the work through the Atlas and Matt Pocock skills. Agreed sequence and where we are:

| Step | Skill                             | Status                                                                                           |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | `/grilling` (via grill-with-docs) | done, decisions in the spec                                                                      |
| 2    | `/to-spec`                        | done, issue #2                                                                                   |
| 3    | `/domain-modeling`                | done, `CONTEXT.md` and ADR 0001, 0002                                                            |
| 4    | `/prototype` (UI branch)          | done, verdict on issue #2, variants on branch `prototype/edit-mode-ui` (never merge)             |
| 5    | `/to-tickets`                     | done, tickets below                                                                              |
| 6    | `/atlas-red-team <paths>`         | **next**. It reviews file paths, not issues: export the ticket bodies to files first (see below) |
| 7    | `/atlas-plan <ticket>`            | optional, run once on #11 so the recording shows a plan draft                                    |
| 8    | `/atlas-implement <ticket>`       | per ticket, frontier order                                                                       |
| 9    | `/code-review main`               | on the first PR                                                                                  |
| 10   | `/atlas-improve`                  | after the first implement run, for cost and waste evidence                                       |

Demo loop on Thursday is `/triage` plus `/atlas-implement`, driven by the loop in ticket #6. Wrap-up skills: `/handoff` between sessions, `/retro` after.

Skills that do not fit this repo: the Atlas `design-*` and `deliver-*` families, `atlas-ingest`, the KB skills, `atlas-pursuit-new`, `atlas-heartbeat` (they need a planning repo or an engagement workspace), and `/wayfinder`.

## Tickets

All are sub-issues of #2, labelled `ready-for-agent`, with native GitHub blocking edges. Numbering is not sequential because ticket 1 was created last.

| Ticket                                                     | Blocked by |
| ---------------------------------------------------------- | ---------- |
| #11 Dashboard with mock data, regions, and server skeleton | none       |
| #3 Pen to issue                                            | #11        |
| #4 Flags and the shipped set                               | #11        |
| #5 Status pill                                             | #3, #4     |
| #6 Agent loop for small requests                           | #4         |
| #7 Vote page                                               | #3         |
| #8 Large and declined requests                             | #5, #6     |
| #9 Consolidation                                           | #6         |
| #10 Demo runbook and tunnel                                | #5, #7     |

Cut line is after #8. #9 and #10 are Thursday-morning work if time allows; if #7 slips, the vote page becomes a "coming soon" tab.

Export ticket bodies to files for the red team:

```bash
mkdir -p /tmp/hack_atlas-tickets && for n in 11 3 4 5 6 7 8 9 10; do gh issue view $n --json title,body --jq '"# \(.title)\n\n\(.body)"' > /tmp/hack_atlas-tickets/$n.md; done
```

## Recording plan

Three loops, under four minutes total: a small request that lands on its own, a large request that stops at plan review and is approved on camera, and a nonsense request that triage declines. Record Wednesday morning with two coworkers filing real requests. Thursday night is a second live loop.

## Environment notes for agents

- Node 22 comes from fnm. Interactive shells get it from the profile; a non-interactive shell (the Claude Code Bash tool) must prefix commands with `eval "$(fnm env)"`. The browser preview uses `.claude/launch.json`, which already runs the dev server through `fnm exec`.
- Atlas is installed at user scope from the private `JahnelGroup/atlas-plugins` marketplace (`claude plugin install atlas@atlas-plugins`). Guardrails are off in this repo by choice; the plugin's global hooks were tested and stand down here. Rerun `/setup-atlas` only when commands or structure change.
- The `github` plugin's MCP server has failed to connect with an authorization-header error. `gh` works and is what the tracker policy uses, so nothing depends on the MCP server.
- The small-request auto-merge policy is a team edit at the top of `docs/agents/issue-tracker.md` and takes precedence over the generated lifecycle for `lane:implement` + `size:small` issues.
