---
name: gap-dossier
description: >
  Runs a three-stage adversarial gap analysis over a body of literature or prior
  art and produces a ranked dossier of open opportunities, each novelty-checked
  and scored on value against cost. Use ONLY when the user explicitly asks for a
  gap analysis, a research-opportunity map, a "what is nobody doing" sweep, or
  names this skill. This is a budget-class operation
  costing millions of subagent tokens and hours of wall clock, so never invoke it
  speculatively or as a step inside a larger task the user did not scope that way.
---

# Gap dossier

Finds open gaps in a field, proves they are still open, and ranks them by whether
they are worth doing against whether they can be done in the budget.

The output is a decision, not a literature review. Every run ends with a named
recommendation the user can start on.

## Files and how to run them

```
SKILL.md                 this file
gap-scout.js             stage 2 workflow
selection-patterns.js    stage 1 workflow
templates/patterns.md    skeleton for the stage 1 brief
templates/gaps.md        skeleton for the stage 3 dossier
```

Everything sits in the base directory you were given when this skill was loaded.
Read a template only when you are about to write that output, not up front.

**Read the script file, then pass its contents inline as `script`:**

```
Read <skill dir>/selection-patterns.js
Workflow({ script: "<the file contents>", args: { ... } })
```

Do not use `scriptPath`. That parameter only accepts paths inside the working
directory, so it cannot reach a skill folder. Inline `script` always works and
keeps the bundle portable. The scripts are 7KB and 12KB, which is negligible
against the cost of a real run.

They are deliberately not installed as globally named workflows in
`~/.claude/workflows/`. Entry belongs through this file, because the sequencing
and the cost warning below are what make the result trustworthy, and a bare
`gap-scout` in the registry invites skipping both.

The folder is self-contained: copy or commit it anywhere as a unit, with no
installation step beyond being on a skills path.

## Why it is shaped this way

Four properties carry the quality. Preserve all four or the result degrades into
a plausible-sounding list.

1. **Role separation.** The scout that proposes a gap never scores it. A separate
   refuter attacks its novelty and a separate judge scores it. Self-graded
   proposals are uniformly optimistic.
2. **A refutation bar, not a vibe.** `refuted=true` only when existing work
   answers the core question with comparable rigor. Without the bar, refuters
   either kill everything or nothing. A healthy run refutes roughly 5%.
3. **Two axes, never one.** Value and cost are judged separately and combined in
   code. Collapsing them early hides the moonshots and the cheap wins.
4. **Calibration the judges cannot see.** Base rates come from a separate
   research track and are joined afterwards. Judges asked to estimate "would this
   be selected" systematically ignore how crowded the segment is. This step
   changes the ranking materially and is the most commonly skipped part.

## Sequence

### Stage 1, calibrate

Run first. It produces the base rates stage 2 needs and a sourced brief on what
the gatekeeper actually selects for.

```
Workflow({ script: <contents of selection-patterns.js>, args: {
  target:   "<the venue, market or gatekeeper>",
  context:  "<who, budget, deadline, what accelerates and what does not>",
  research: "<corpora, APIs, search guidance>",
  outPath:  "<absolute path>/patterns.md"
}})
```

The workflow writes the brief itself. Read `templates/patterns.md` first and
pass its section structure through in the prompt if you want to depart from the
seven sections the script already specifies.

Read the resulting brief before stage 2. Its `base_rates` and `overall_bar` are
the calibration input, and its rejection causes tell you where the budget should
go.

### Stage 2, discover

```
Workflow({ script: <contents of gap-scout.js>, args: {
  context: "<same context>",
  areas:   [{ key, name, scope }, ...],
  value:   { label: "...", rubric: "..." },
  cost:    { label: "...", rubric: "...", unit: "GPU-hours" },
  perArea: 5,
  calibration: { bar: <overall_bar>, rates: [{ keys: ["areaKey"], rate: 31.4, label: "..." }] }
}})
```

Split areas across two invocations of about six each. One workflow of twelve
areas serialises behind the concurrency cap and a single failure costs more.

Choosing areas is the main judgment call. Cover the field broadly rather than
deeply, including segments you expect to be dead, because the calibration step
needs the contrast and a dead segment with a live gap is still worth seeing.

### Stage 3, synthesise

Do this in the main loop, not in a workflow. Merge the runs, sort by `adjusted`,
and write the dossier following `templates/gaps.md`.

Read that template now. It carries the section order, what belongs in each, and
the validated chart palette for the published version.

The template is a skeleton, not a form. The value of this stage is judgment about
which candidate to recommend and why, so write that argument rather than filling
blanks. Publish as an artifact when the user will act on it or share it.

## Reading the output

`quadrant` is the headline. `sprint` is high potential and affordable,
`moonshot` is high potential and slow, `safe_bet` is affordable with a lower
ceiling, `skip` is neither, `refuted` failed the novelty check.

`scores.adjusted` outranks `scores.composite`. If they are equal, no calibration
was supplied and the ranking is uncorrected for segment saturation. Say so.

Watch for a `one_line_verdict` that names a scoop risk. Fast-moving gaps are
often being written up by the group that owns the closest prior work, and that
changes the recommendation toward speed over polish.

## Operational hazards

Learned the hard way, all three will bite.

- **Cost.** A twelve-area run cost roughly 14M subagent tokens and 7,000 tool
  calls, and hit a session usage limit mid-flight. Tell the user the scale before
  launching.
- **Resume, do not restart.** On a limit or a crash, relaunch with
  `{ scriptPath, resumeFromRunId }` and the identical `args`, using the
  `scriptPath` the tool returned for that run. That is the one case where
  `scriptPath` is valid, because the tool itself produced the path. Completed agents
  replay from cache. Check `journal.jsonl` in the transcript directory for what
  actually returned before diagnosing an empty result.
- **Pin the model before launching.** Changing the session model does not affect
  agents already in flight, and adding `model` to agent options changes the cache
  key, so every cached result is discarded. Decide first.

Also budget the web search quota. Ninety agents will exhaust a session's
allowance, which blocks verification later in the same session.

## Adapting it

The workflows are domain-neutral. `value` and `cost` are free text rubrics, and
`tiers` overrides the cost-tier enum. It has been used for conference paper
selection; competitive analysis and product opportunity mapping fit the same
shape. Do not add configuration for a case nobody has asked for.
