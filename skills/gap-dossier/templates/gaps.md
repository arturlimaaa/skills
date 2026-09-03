# <domain> gaps — ranked by <value axis> against <cost axis>

Skeleton for the stage 3 dossier. Replace every angle-bracket placeholder.

The reader wants a decision. Lead with it. Everything after the recommendation is
evidence for it, ordered so a reader can stop early and still be correctly
informed.

---

## How this was produced

Agent count, areas covered, and the per-area topology: one scout proposing N
gaps, one adversarial refuter per gap, one two-axis judge per area.

State the scoring formula, the calibration source and its bar, and the quadrant
definitions. Say how many gaps were refuted outright. A run that refutes none is
suspect and should be reported as such.

## Executive read

Three or four paragraphs, each opening with a claim in bold, not a heading.

Cover: the dominant archetype among viable candidates and why the budget selects
for it; which constraint is actually binding, backed by the stage 1 rejection
costs; and any cross-cutting risk the judges flagged repeatedly, such as a
competitor plausibly writing the same thing.

## Recommendation

Name the primary pick. State the single fact that makes it feasible at all,
usually an artifact or dataset that already exists. State what makes it
publishable whichever way the result lands. Name its first kill gate.

Name a cheaper hedge and the condition that triggers switching to it.

Name the candidate most likely to be finished, if different, and say what its
risk actually is.

Say what to avoid despite a good raw score, and why the calibration demoted it.

## Briefs for the leaders

One subsection per leading candidate, in rank order. Each carries:

- a metadata line: area, kind, adjusted score, cost tier and estimate, segment rate
- the open question, in the scout's own framing
- the residual gap after adversarial search, which is the positioning sentence
- the minimum viable evidence set that is still a complete deliverable
- the sharpest objections a critic will raise, with mitigations
- the judge's one-line verdict

## Full ranking

One table, every surviving gap, sorted by adjusted score. Columns: adjusted,
composite, quadrant, area, kind, the three sub-scores, cost tier, cost estimate,
segment rate, title.

If a filter or cap hides rows, say so in a line under the table. Silent
truncation reads as complete coverage.

## Refuted

The gaps the novelty check killed, each with the work that closed it and a URL.
Keep them. They are the evidence the refuters were doing their job, and they stop
the same idea being re-proposed next cycle.

## Caveats

Scores are model judgments, not measurements. Give the date the novelty verdicts
were searchable. Name anything the calibration could not cover.

---

## If publishing as an artifact

The 2D matrix is the deliverable the reader remembers: cost fit on x, value on y,
colored by quadrant, with the leaders directly labelled. Nudge points apart
within each integer cell or they stack invisibly, and de-collide the labels
vertically with a leader line back to the mark.

Load `artifact-design` and `dataviz` before writing it.

Quadrant colors below are validated for all-pairs scatter in both themes: they
clear the colorblind separation floor and the normal-vision floor against the
surfaces given. Reuse them rather than re-running the validator, and keep the
fourth class recessive since three is the all-pairs ceiling.

| Role | Light | Dark |
|---|---|---|
| surface | `#F7F8FA` | `#12161F` |
| sprint | `#2a78d6` | `#3987e5` |
| moonshot | `#eb6834` | `#d95926` |
| safe bet | `#1baf7a` | `#199e70` |
| skip | recessive neutral, not a categorical hue | |

The light-mode safe-bet green sits below 3:1 contrast, so the relief rule
applies: ship the full ranking table, which the layout above already does.
