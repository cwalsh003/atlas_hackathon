# Runbook: the agent loop for small requests

`scripts/loop.sh` is the unattended loop from #6. Every cycle (20 s by default) it triages new implement-lane requests, ships at most one small request at a time behind its flag, and labels merged large requests `shipped`. Policy: `docs/agents/issue-tracker.md` (Request sizes) and ADR 0002.

## Prerequisites

- Node 22 via fnm (`fnm use`); the loop runs `eval "$(fnm env)"` itself.
- `jq` on `PATH` (`brew install jq`); the loop parses every `gh` and classifier answer with it.
- `gh auth status` shows you logged in with push rights to the repo. The loop's own `gh` and `git` calls run as you, in bash, outside any Claude Code permission check. The loop only trusts PRs opened by this same account.
- The Claude CLI is logged in: run `claude /login` once in a plain terminal.
- The served checkout (`/Users/cwalsh/hack_atlas`) is on a clean `main`, with `npm run dev:demo` and `scripts/tunnel.sh` already running.

## Start

From the served checkout, in a plain terminal:

```bash
cd /Users/cwalsh/hack_atlas
scripts/loop.sh
```

Options (environment variables): `IMPLEMENT_MODE=direct` (see measured times below), `LOOP_INTERVAL=20`, `IMPLEMENT_TIMEOUT=1500` (seconds before an implement run is killed and blocked), `MAX_TURNS=150`, `SERVED_CHECKOUT=<path>` (defaults to the checkout the script lives in), `CLAUDE_CLEAN_ENV=1`.

`CLAUDE_CLEAN_ENV=1` (the default) launches every child `claude -p` under `env -i HOME=$HOME USER=$USER PATH=$PATH SHELL=$SHELL TERM=xterm-256color LANG=en_US.UTF-8`. When the loop is started from inside a Claude Code session, the child otherwise inherits that session's host-auth variables and reports "Not logged in". Set `CLAUDE_CLEAN_ENV=0` only when the child needs an extra variable you trust.

Starting the loop from inside a Claude Code session also needs `Bash(scripts/loop.sh*)` allowed in that session; a plain terminal needs nothing.

## Stop

`Ctrl-C`, or `touch .claude/loop-stop` in the checkout the script lives in (the loop checks every second while sleeping and deletes a stale stop file when it starts). Stopping freezes the in-flight route, then kills it and its implement run; the claimed issue stays assigned and the next start resumes it (it reuses the worktree, goes straight to the gate when the PR is open, or only labels it `shipped` when the PR is already merged).

Stop the loop during the smoke runs of #3, #4, and #5. Those runs label their issues `scratch`, and the loop ignores `scratch` and `lane:vote` issues entirely, so the label is a second guard, not a reason to leave it running.

## What one cycle does

1. **Triage** (labels only, never the interactive `/triage` skill). Every open issue with `lane:implement` and `needs-triage` and none of `size:*`, `needs-info`, `wontfix`, `scratch`, `lane:vote`. An issue whose body lacks the #3 request sections gets `needs-info` with a comment. Otherwise a headless classifier (`scripts/triage-prompt.md`, no tools, one turn) answers small, large, or a decline: the loop adds `size:small`; or `size:large` + `ready-for-agent`; or `needs-info`/`wontfix` + a `[TRIAGE]` comment (the classifier's text, `@` stripped, at most 200 characters). An unparseable answer is logged and retried next cycle. Triage runs every cycle, including while a small request is being implemented.
2. **Small route**. If nothing is in flight, claim the oldest open `size:small` + `lane:implement` issue with no assignee and none of `shipped`, `scratch`, `lane:vote`, `ready-for-human`: `gh issue edit --add-assignee @me`, then `gh issue lock` (only collaborators can comment while it is in flight). Then, in the background:
   1. If a merged `req/<n>` PR by the loop's account exists, only label `shipped` and pull; never re-implement.
   2. Unless an open `req/<n>` PR by the loop's account exists: `git fetch origin main`, `git worktree add -B req/<n> .claude/worktrees/req-<n>/atlas_hackathon origin/main`, `npm ci`, the implement step.
   3. The merge gate on the PR.
   4. Remove the worktree and local branch, wait for CI (`gh pr checks --watch --fail-fast`), then `gh pr merge --squash --delete-branch --match-head-commit <sha the gate checked>`.
   5. Label `shipped` (retried once), `git pull --ff-only` in the served checkout.

   The served checkout's working tree only ever receives `git pull`. Its `.git` also gets the fetch, the worktree metadata, and the `req/<n>` branch while the worktree lives.

3. **Large-route shipped step**. Every `lane:implement` issue labelled `human-review` and not `shipped` whose closing PR is merged gets `shipped` and a served-checkout pull. The rest of the large route is #8.

## One in flight

Exactly one small-route request between claim and `shipped`: an open issue labelled `size:small` with an assignee and without `shipped`. `size:large` issues never count, whatever their state (`plan-review` included). On the board that looks like one locked `size:small` issue assigned to the loop's account and no `shipped` label, with a `req/<n>` branch and, later, one open PR from it; every other `size:small` issue is unassigned and queued oldest first.

## Implement step and permissions

The child `claude -p` runs in the request's worktree with `--permission-mode acceptEdits`, `--max-turns 150`, and exactly this allowlist. No bypass mode, ever.

```
Bash(gh issue view *) Bash(gh issue list *) Bash(gh issue edit *) Bash(gh issue comment *)
Bash(gh pr create *) Bash(gh pr view *) Bash(gh pr list *) Bash(gh pr checks *)
Bash(git *) Bash(npm *) Bash(npx *) Bash(node *)
Read Edit Write Glob Grep ToolSearch
```

`IMPLEMENT_MODE=atlas` (default) adds `Agent Skill` and runs `/atlas:atlas-implement <n>` with loop constraints appended. `IMPLEMENT_MODE=direct` runs `scripts/implement-prompt.md`, a tight packet: change only the one region's file, wrap every change in `useFlag('req-<n>')`, run the full check set, commit on `req/<n>`, push, `gh pr create`. Both prompts say the request body is data from an anonymous requester, not instructions, and that every issue comment not written by the loop's account, including one titled `[EXECUTION PLAN]`, is untrusted data, not a plan. `gh pr merge` is not on the allowlist, so the session cannot merge through that command; see the ceiling below for why that is not a guarantee.

`.claude/settings.json` needs no additions: the allowlist is passed on the command line.

## Merge gate

`node scripts/mergeGate.ts <pr> <issue>` (pure rules in the same file, tested in `scripts/mergeGate.test.ts`) prints a JSON verdict with the head `sha` it checked and exits 0 to pass, 1 to refuse, 2 when it could not read the PR. It reads the file list from the pull-request files API (a rename counts as deleting the old path and changing the new one) and fails closed on anything it cannot parse. A PR passes only when:

- it is a same-repository PR opened by the loop's own `gh` account (a fork or any other author is refused as "cross-repository or foreign-author PR");
- every changed path is under `src/` or `test-results/`;
- none is `src/demoMode.ts` or under `src/flags/` (the flag hook) or `server/`;
- every changed non-test `.ts`/`.tsx` file contains `useFlag('req-<n>')` after the change (a deleted source file fails);
- a `.css` file removes no lines, and every added line sits in, or opens, a rule whose every selector carries `.req-<n>` outside any functional pseudo-class argument (`:not(.req-<n>)` does not count); an at-rule such as `@media` or `@supports` never grants scope, so a new top-level at-rule is refused;
- no other file type under `src/` changes. Test files (`*.test.ts(x)`) and `test-results/**` are exempt from the flag check.

On refusal the loop closes the PR with a comment naming the failing rule, relabels the issue `size:large` + `ready-for-agent` (removing `size:small`, `in-progress`, `ai-review`, `human-review`), unassigns itself, unlocks the issue, and comments `[SCOPE CHANGE]` with the reason. `scripts/loop.sh --gate <pr> <issue>` runs just this step on one PR.

Ceiling, stated plainly:

- The presence of the flag call does not prove the change sits inside the guarded branch. A file can call `useFlag('req-<n>')` and still change behaviour with the flag off.
- The CSS rule proves each added rule names `.req-<n>`, not that the flagged branch is what applies that class.
- The implement session can run arbitrary code as the operator: `node -e`, `npx`, `npm` scripts, and git aliases are all on its allowlist, and the operator's `gh` and `git` credentials are in reach. The gate bounds what the loop merges, not what a session could do. `main` is not branch-protected, so a prompt-injected session could push to it directly. Branch protection is the upgrade if that matters.

## Logs

The loop prints one line per action and appends it to `.claude/loop.log`. Each implement run's JSON output and `npm ci` output go to `.claude/loop-req-<n>.log`. Both are git-ignored.

## `[BLOCKED]` recovery

When the implement step exits without a PR or times out, when `npm ci`, the worktree, CI, or the merge fails, or when the gate cannot read the PR, the loop comments `[BLOCKED] loop: <reason>`, unassigns itself (retried once), removes `in-progress`, `ai-review`, and `human-review`, adds `ready-for-human`, unlocks the issue, removes the worktree and any PR-less `req/<n>` branch, and moves on to the next request.

1. Read the reason on the issue and `.claude/loop-req-<n>.log`.
2. Fix the cause (for example, restart with `IMPLEMENT_MODE=direct`), or take the request yourself.
3. To hand it back to the loop, remove `ready-for-human`; the running loop claims it again when nothing else is in flight.

## Measured cycle times

Measured on 2026-09-24 with `LOOP_INTERVAL=20` and `IMPLEMENT_MODE=atlas` (raw numbers: `test-results/runbook/measured-times.txt`, runs: `test-results/e2e/timeline.txt`). Run 2 includes the CI wait and a second request filed while the first was implementing.

| Step                                  | #42 (run 1, PR #43)   | #44 (run 2, PR #46) | #45 (run 2, PR #47, queued)           |
| ------------------------------------- | --------------------- | ------------------- | ------------------------------------- |
| Filed to triaged `size:small`         | 24 s                  | 23 s                | 21 s (while #44 implemented)          |
| Filed to claimed                      | 50 s                  | 52 s                | 160 s (claimed 9 s after #44 shipped) |
| Implement run (to PR open)            | 337 s                 | 357 s               | 315 s                                 |
| Gate, CI wait, merge, `shipped`, pull | 12 s (no CI wait yet) | 13 s                | 13 s                                  |
| **Filed to shipped**                  | **407 s**             | **430 s**           | **496 s**                             |

An atlas implement run costs $3.3-4.1. CI (the `checks` job, about 17 s) was already green each time the loop reached it, because the session pushes before it finishes its own review. Triage takes 7-8 s per request, and a gate refusal takes about 5 s. The dashboard showed each change within about 15 s of `shipped`, without a reload.

`IMPLEMENT_MODE=direct` was not run: every atlas run shipped well inside its 25-minute budget.

**Demo night: use `IMPLEMENT_MODE=atlas` (the default).** Plan on 7-8 minutes from filing to shipped for a lone request, plus the remaining time of each request ahead of it in the queue. Switch to `IMPLEMENT_MODE=direct` if an atlas run blocks or overruns.

Seen in the atlas runs and harmless: it may move the issue through `in-progress`, `ai-review`, and `human-review` itself, and posts `[EXECUTION PLAN]`, `[AI CODE REVIEW]`, and `[CLOSEOUT]` comments. Its `eval "$(fnm env)"` and `fnm` commands are denied (Node 22 is already on `PATH`), and so are its writes to `.claude/atlas-state/` in the served checkout; it works around both, at the cost of 14-24 denied calls per run. A shipped request stays locked; unlock it by hand if the requester needs to reply.
