# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Request labels

Added for the live-mockup dashboard. A request is a GitHub issue created from the dashboard's edit mode (see `CONTEXT.md`).

| Label | Meaning |
| ----- | ------- |
| `lane:implement` | The requester asked for the change to be built. |
| `lane:vote` | The requester submitted a proposal for the vote page. No code until promoted. |
| `size:small` | Triage judged the implement-lane request small: one region, no new data fields, no new dependency. Ships without a human click (ADR 0002). |
| `size:large` | Everything else in the implement lane. Follows the standard Atlas route. |
| `shipped` | The change is merged behind its flag. In demo mode every viewer sees it. |

Triage applies exactly one `size:*` label to every `lane:implement` issue. A request that cannot be understood gets `needs-info`; one outside the dashboard gets `wontfix`; both get a comment saying why.
