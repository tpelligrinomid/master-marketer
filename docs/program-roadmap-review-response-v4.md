# Program Roadmap — Master Marketer's response, v4

Reply to spec v6. Short: **v6 is accepted and we are building against it.** One change
requested, in the flag layer only.

| Response | Replies to | Covers |
|---|---|---|
| `program-roadmap-review-response.md` (v1) | brief v1, spec v1 | `annual_plan` collision, call structure, flag ownership, `commitment_type` |
| `program-roadmap-review-response-v2.md` | brief v2, spec v2 | Overhead double-definition, tier-band consequences, flag vocabulary |
| `program-roadmap-review-response-v3.md` | addendum 1 | Tier cap `min()`, content share via `program`, spec/repo drift |
| **this document (v4)** | **spec v6** | **Split rows and `row_below_baseline`** |

---

## Everything from v3 and the v5 read is closed

Re-derived rather than taken on trust, and the arithmetic holds:

- Four-class archetypes with `Facilitate Client Meetings` in both — quarterly coordination
  is 15.0 against a 13.23 threshold, so a correctly composed Execute option clears
  `overhead_under_reserved` **without** needing a plan document. The catch-22 is gone.
- Strategy & account management carved out of the payload filter unconditionally, with
  Digital PR correctly excluded from the carve-out.
- `scope: 'row' | 'month' | 'option' | 'document'`.
- Month-one arithmetic recomputed against 32.0 throughout — 39% setup, 87% allocated.
- Setup spanning months 1–2, with the zero-deliverable case documented as the reason.
- `stage` typed as the enum.

"The ramp shows up in deliverables, not in allocation" is the right framing, and it is now
consistent everywhere it appears.

---

## The one change: `row_below_baseline` fires on split rows by construction

Spec v6 says a plan document **may be split across months one and two as work in progress.**
That produces two rows sharing a `process_id`, each carrying partial hours against the
**full** baseline.

`row_below_baseline` fires at `hours < baseline_hours × 0.5` with no `adjustment_reason`. For
an 18.75-hour plan document the trip point is 9.375:

| Split | Row 1 | Row 2 | Result |
|---|---|---|---|
| 10.0 / 8.75 | passes | **8.75 < 9.375 — fires** | flagged |
| 60 / 40 | passes | **7.50 < 9.375 — fires** | flagged |
| 50 / 50 | 9.375 | 9.375 — exactly on the boundary | knife-edge |

So the composition the spec now recommends trips a row flag by construction, on the
archetype path, every time a document is split unevenly.

**Requested fix:** compare the **sum of rows sharing a `process_id` within an option**
against `baseline_hours`, rather than each row individually.

It is the same task either way, so the sum is what the flag is actually asking about. It also
keeps `adjustment_reason` meaning *this estimate deviates from standard* rather than
*this row is a fragment*, which matters because that field is the signal you are storing to
correct the library from real use over time. Per-row comparison would fill it with
"part 2 of 2" and make the deviation data unusable.

The same rollup should apply to `row_above_baseline` for symmetry.

Nothing else in the flag layer changes, and the generator emits split rows identically either
way — this is a computation change on your side only.

---

## Our side

Building now, sequenced as in v3 §5:

| Version | Contents | Status |
|---|---|---|
| v0.1 | Input/output schemas, route, task shell, repair re-ask, assembler | in progress |
| v0.2 | Shared calls 1–2, executive summary last | |
| v0.3 | Per-option plan — Perform and Grow | |
| v0.4 | Execute path, four-class archetypes | unblocked by v6 |
| v0.5 | Hardening, fixture run across all three tiers | |

No further blockers. We will flag anything the fixture run turns up.
