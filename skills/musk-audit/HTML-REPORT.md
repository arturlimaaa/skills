# HTML report format

The audit lands as a single self-contained HTML file in the OS temp dir — nothing written into the repo. Tailwind and Mermaid both load from CDNs. Adapted from Matt Pocock's `improve-codebase-architecture` report scaffold; reorganized around the five phases and the sequence funnel.

Resolve the temp dir from `$TMPDIR`, fall back to `/tmp` (or `%TEMP%` on Windows), and write `<tmpdir>/musk-audit-<scope>-<timestamp>.html` so each run gets a fresh file. Open it (`xdg-open` / `open` / `start`) and tell the user the absolute path.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Musk-algorithm audit — {{scope}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .seam { stroke-dasharray: 4 4; }
      .gate { stroke-dasharray: 6 3; stroke: #6366f1; }
      .cut  { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-14">
      <header>...</header>
      <section id="funnel">...</section>          <!-- the sequence funnel + add-back readout -->
      <section id="phase-1">...</section>
      <section id="phase-2">...</section>
      <section id="phase-3">...</section>
      <section id="phase-4">...</section>
      <section id="phase-5">...</section>
      <section id="top-cut">...</section>           <!-- the one thing to cut first -->
    </main>
  </body>
</html>
```

## Header

Scope, date, and a compact legend: solid box = module, dashed indigo line = phase gate, red = cut candidate, thick dark box = deep module. No intro paragraph — straight into the funnel.

## Funnel section (the centrepiece — it makes the sequence visible)

The argument of the whole report is the sequence, so lead with it. Render a left-to-right **funnel**: how many items entered, how many each gate let through, how many exited as load-bearing/proven-real. A Mermaid `flowchart LR` carries this well, with the surviving-set count on each gate edge and exits dropping out below.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      P1[Phase 1\nQuestion\n148 items] -->|orphaned: 31| P2[Phase 2\nDelete\n31 + 44 dead]
      P1 -.load-bearing: 117.-> X1[(kept)]
      P2 -->|proven real: 9| P3[Phase 3\nSimplify\n66 survive]
      P2 -.deletable: 66.-> CUT[(cut list)]
      P3 -->|simplified: 12| P4[Phase 4\nAccelerate]
      P4 -->|stable: 5| P5[Phase 5\nAutomate]
      classDef cut stroke:#dc2626,stroke-width:2px;
      class CUT cut
  </pre>
</div>
```

Beside or below the funnel, the **add-back calibration readout** — a single honest line:

> Deletion candidates: 75 · Defenders saved: 9 · **Add-back rate: 12%** — calibrated (target ≈10%).

Colour the verdict: emerald for ≈10%, amber if ~0% (under-deleted, re-run Phase 2 wider) or ≫10% (over-aggressive net).

## Phase sections

One section per phase. Findings are **cards**; the diagrams carry the weight; prose is sparse and uses the [DELETION-TEST.md](DELETION-TEST.md) vocabulary without ceremony.

### Phase 1 cards — requirements

Per orphaned requirement:
- **Item** — the requirement/flag/dep, `font-mono text-sm`.
- **Provenance** — the evidence trail: last toucher, linked ticket (or "none"), spec location (or "not found").
- **Verdict badge** — `Orphaned` (amber) / `Load-bearing` (slate) / `Needs domain sign-off` (indigo, for safety-critical).
- One line: why no current owner could be found.

### Phase 2 cards — deletions (the core of the report)

Per candidate, show the adversarial result side by side:
- **Target** — file/module, monospaced.
- **Deletion-test result** — "complexity vanishes" (pass-through → cut) or "concentrates across N callers" (load-bearing → keep).
- **Defender verdict** — what the independent agent found: the live caller it located, or "no real dependency found — confirmed deletable." This pairing is the fiberglass-mat test; show both agents' conclusions so the reader sees the convergence.
- **Strength badge** — `Strong` (emerald) / `Worth exploring` (amber) / `Speculative` (slate).
- **Before/after** — a small Mermaid graph or hand-built boxes: the call graph with the dead node, then the graph with it gone. Style the cut node/edge red.

### Phase 3 cards — simplifications

Reuse the Pocock deepening card: **Files · Problem (one sentence) · Solution (one sentence) · Wins (≤6-word bullets in glossary terms) · Before/After diagram**, plus a dependency-category tag (`in-process` / `local-substitutable` / `ports & adapters` / `mock`). The before/after shows a shallow cluster collapsing into one deep module with greyed internals. ADR conflict → one-line amber callout.

### Phase 4 cards — acceleration

Per slow point: the build/test/CI loop, current cycle time, the bottleneck, and an estimated after. Keep it to surfaces that survived Phase 3 — assert that in the section intro.

### Phase 5 cards — automation

Two lists, clearly separated:
- **Safe to automate** — now-stable processes, each with the precondition that made it safe (which earlier phase validated it).
- **Automation liabilities** — existing automations sitting on top of deletion candidates. Frame each as a decommissioning project, red-tagged. These are the report's warnings, not its wins.

## Diagram patterns

Mix them — don't make every diagram look the same. Mermaid `flowchart`/`graph` for call flow and the funnel; hand-built `<div>` boxes with absolutely-positioned inline-SVG arrows when you want a thick-bordered deep module Mermaid won't render with the right weight; a cross-section of stacked thin bands collapsing to one thick band for layered shallowness; a mass diagram (interface rectangle vs implementation rectangle) for "interface as wide as implementation." Keep diagrams ~320px tall so before/after sits side by side. Module labels: `text-xs uppercase tracking-wider`, schematic not UI.

## Top-cut section

One larger card: the single highest-value, fully-proven deletion or deepening to do first, one sentence on why, anchor link to its card. The equivalent of "which fiberglass mat do we pull today."

## Style and tone

Editorial, not corporate-dashboard. Generous whitespace, `font-serif` headings work with stone/slate. One accent (indigo or emerald) plus red for cuts and amber for warnings. Plain English, concise — but the architectural nouns come straight from [DELETION-TEST.md](DELETION-TEST.md): module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality. Never substitute component/service/unit, API/signature, boundary, layer/wrapper. Wins bullets name the gain in those terms ("locality: bugs concentrate in one module"), not "easier to maintain." No hedging, no throat-clearing. If a diagram needs a paragraph to be understood, redraw the diagram. The only scripts are the Tailwind CDN and the Mermaid import — the report is otherwise static.
