# The Algorithm

The source of truth the audit's subagents are briefed from. Five steps, strict sequence, plus the two operational rules most summaries omit. Documented in Walter Isaacson's *Elon Musk* (2023); Musk cites it as the operating method behind SpaceX, Tesla, Boring, and Neuralink.

## Why the sequence is non-negotiable

> "I've gone backwards so many times where I've automated something, sped it up, simplified it, and then deleted it. And I got tired of doing that, so that's why I've got this mantra." — Musk

Each step amplifies whatever it touches. Apply a later step to something an earlier step would have removed, and you have invested in waste. The sequence exists to prevent that, and it was learned the expensive way (see [Failure modes](#failure-modes-the-cost-of-going-backwards)).

In this skill the sequence is enforced structurally: each workflow phase consumes only the *surviving set* of the phase before it. The gate is the point.

## Step 1 — Make requirements less dumb

Every requirement is suspect until a specific person can currently justify it.

> "Your requirements are definitely dumb. It does not matter who gave them to you. Requirements from smart people are the most dangerous, because you're less likely to question them. Always question requirements, even if it came from me." — Musk

**The named-person rule.** Every requirement must trace to a specific human, not a department, team, or abstract authority. "Required by legal" with no name attached has no current owner; an ownerless requirement cannot be questioned, updated, or removed through normal channels. Surfacing the owner is how you find *orphaned* requirements — added by people who left, based on concerns since resolved, or written in a spec nobody can locate.

If you can't name the owner, the requirement is already suspect and goes to Step 2.

## Step 2 — Delete any part or process you can

Once a requirement survives Step 1, ask whether the thing it justifies should exist at all. Bias hard toward subtraction.

> "We are on a deletion rampage!! Nothing is sacred. We will delete any remotely questionable tubes, sensors, manifolds, etc. tonight." — Musk (SpaceX standing order)

**The 10% add-back calibration.** Deliberately over-delete, far enough that you have to restore roughly one item in ten.

> "We tend to remember, with sometimes a jarring level of pain, where we deleted something that we subsequently needed… so they overcorrect and put too much stuff in there. So you actually have to say 'we're deliberately going to delete more than we should, so that we're putting at least one in ten things back in.'" — Musk

Zero restoration means zero risk was taken — you didn't cut deep enough. Restoring most of the list means you cut recklessly. One-in-ten is the calibrated depth. The rule turns "delete more" from a vibe into a measurable feedback signal.

## Step 3 — Simplify and optimize

Only earns its investment after Steps 1 and 2.

> "The most common error of a smart engineer is to optimize a thing that should not exist. Everyone's been trained in high school and college to answer the question; you can't tell the professor your question is dumb or you'll get a bad grade. So everyone, without knowing it, has a mental straitjacket on." — Musk

Engineers are most in their element here, which is exactly the trap: arriving at Step 3 before Steps 1 and 2 are done. The gates ahead of this phase exist to ensure nothing reaches it that should have been deleted.

## Step 4 — Accelerate cycle time

Apply speed only to what's been deleted-down and simplified.

> "If you're digging your grave, don't dig it faster. Stop digging." — Musk

Acceleration of a validated process compounds returns; acceleration of unexamined waste produces more waste, faster. Musk's own retrospective: "I mistakenly spent a lot of time accelerating processes that I later realized should have been deleted."

## Step 5 — Automate

Last. Always last.

> "The big mistake in Nevada and at Fremont was that I began by trying to automate every step. We should have waited until all the requirements had been questioned, parts and processes deleted, and the bugs were shaken out." — Musk

Automating a flawed process locks the flaw in at scale. Every automation built before Steps 1–4 is a future decommissioning project — at Tesla, the "alien dreadnought" fully-automated factory had to be partly torn out, including cutting a hole in the wall to remove robots.

## The corollaries (managing the people running it)

Isaacson records these as corollaries — the organizational conditions under which the algorithm actually runs. Two matter directly to this audit:

- **Hands-on judgment.** "All technical managers must have hands-on experience… otherwise they are like a cavalry leader who can't ride a horse." Step 1 requires knowing a requirement well enough to challenge it. The audit's defender agents must actually read the code, not pattern-match.
- **Challenge over comradery.** "Comradery is dangerous. It makes it hard for people to challenge each other's work… That needs to be avoided." This is the rationale for the adversarial defender pass: the agent that tries to *refute* a finding must be independent of the agent that produced it.

Others: "It's OK to be wrong. Just don't be confident and wrong." · "The only rules are the ones dictated by the laws of physics. Everything else is a recommendation." · skip-level review · a maniacal sense of urgency.

## Failure modes (the cost of going backwards)

Each is a case of applying a later step before an earlier one.

| Case | What broke | Order applied | Fix |
| --- | --- | --- | --- |
| Tesla fiberglass mats | $2M robot built to install mats no team could justify; a test showed zero audible/measurable difference | automate → accelerate → optimize, *then* question | Deleted the mats; the $2M of robotics went with them |
| Tesla "alien dreadnought" | Over-automated line; robots couldn't grip materials | automate before questioning/deleting | De-automated; cut a hole in the factory wall to extract equipment |
| Tesla battery prong caps | Prong protectors caused supply delays; nobody could prove prongs were being damaged | Step 1 skipped | Requirement removed; no failures followed |
| SpaceX Starlink antenna | Separate antenna justified by an overheating claim with no test data | simplify before delete | Redesigned as one integrated flat satellite — half the size, 2× per launch |
| Boring Co. vertical shaft | Engineers required a vertical shaft at tunnel start — convention, not physics | Step 1 | Borer redesigned to start nose-down; no shaft |

The fiberglass-mat story is the canonical argument for the gate: questioning the requirement *first* would have prevented the robotics investment entirely. The audit reproduces "question first" as Phase 1, and "confirm zero difference before cutting" as the Phase 2 defender pass.

## Honest limits (bake these into the audit, don't paper over them)

The framework was calibrated on physical hardware; transferring it to software has real seams where it breaks. The audit must respect them rather than pretend they don't exist.

- **Hardware-centric feedback loop.** On a factory floor you can remove a part and test against a zero baseline. In software — especially knowledge-work processes — deleting a workflow also removes *invisible coordination*, which surfaces downstream as confusion or rework. The feedback loop is slower and murkier. → The audit reports candidates; it does not auto-apply, precisely because the zero-baseline test isn't always available.
- **Safety redundancy is genuine.** In aerospace, medical, regulated, or otherwise safety-critical paths, redundancy *is* the design; a rare-firing check can be load-bearing. The algorithm gives no quantitative guidance on when redundancy earns its cost. → Phase 1 marks these load-bearing and requires domain-expert sign-off before they're even eligible for Phase 2.
- **Founder-centricity / authority.** The documented wins are in companies where Musk had cross-domain authority to override any team's convention. Bottom-up, the most aggressive (highest-value) deletions get filtered out by people without the mandate. → The audit surfaces the aggressive candidates *with proof* so a person who does have authority can act on them; it doesn't pretend the workflow itself has the mandate.
- **No statistical rigor.** "Enough deletion" and "a dumb requirement" are judgment calls, not thresholds. The 10% add-back rule is the only calibration, and it's experiential. → Report the realized add-back rate honestly; don't dress judgment up as a metric.
