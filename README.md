# Live mockup dashboard

A client dashboard for a fictional customer, Abominable Snow Services, built for the Jahnel Group Atlas hackathon. In demo mode, every region of the dashboard gets a pen: a viewer describes a change, Atlas turns it into a GitHub issue, triages it, and ships small changes behind a per-request feature flag while the room watches.

Spec: [docs/specs/live-mockup-dashboard.md](docs/specs/live-mockup-dashboard.md). Vocabulary: [CONTEXT.md](CONTEXT.md). Decisions: [docs/adr/](docs/adr/). Hackathon plan and ticket map: [docs/hackathon.md](docs/hackathon.md).

## Run it

```bash
fnm use            # Node 22 from .node-version
npm install
npm run dev        # http://localhost:5173
npm run dev:demo   # same, with demo-only UI (edit mode, vote page) enabled
```

Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`. CI runs them all on every PR.

To share a running `dev:demo` server over the internet (for a phone or a remote viewer), install `cloudflared` once with `brew install cloudflared`, then run `scripts/tunnel.sh`. It prints a `trycloudflare.com` URL that proxies to your local dev server.

<!-- atlas-v3:readme:start -->
## Atlas

This repo uses Atlas, a Claude Code plugin that acts as a shared path for AI-assisted development — generated, customizable policies, guidelines, and guardrails that keep agent-driven work safe and consistent without locking teams into one rigid workflow. Read [`docs/atlas-operators-guide.md`](./docs/atlas-operators-guide.md) for how to work in this repo, in plain language, and the **Atlas** section in [`CLAUDE.md`](./CLAUDE.md) for the policy the agents follow.

Everything Atlas generated here — hooks, the `CLAUDE.md` section, `docs/agents/` — is a **base recommendation**, not fixed policy. Adapt it to this project's actual needs and processes.
<!-- atlas-v3:readme:end -->
