# Findings

Facts a fresh agent context cannot re-derive cheaply. Each one cost a measurement, a live API call,
or a failed run. Read this before planning any checkpoint that touches <the expensive areas>.

Append new findings at the end of the matching section. **Never delete one.** A finding that turns
out wrong gets a `SUPERSEDED` line under it saying what replaced it and what proved it, so the
record of the wrong turn survives.

> Fill this before the first iteration with everything already learned the expensive way. Every
> entry here is an agent that does not rediscover something at your cost.

---

## 1 · <measured performance>

**<The number, stated as a fact.>** Measured <date>: <the measurement>. <The exact configuration,
because a number without it cannot be reproduced or trusted.>

Consequences:

- <What this makes impossible, or what budget it forces.>
- <Any document that now states something false because of it. Name the section.>

---

## 2 · <a wire format, schema or API shape confirmed against reality>

Confirmed against <the artifact>, not documentation.

<The shape. Field names, types, ordering, whatever a parser must know.>

<Where the artifact is committed, so this is checkable rather than recalled. A finding backed by a
committed artifact is worth several backed by memory.>

---

## 3 · <an external corpus, dataset or vendor>

<How to reach it, what it costs, and the mapping onto this project's contract.>

**Never <the tempting wrong choice>.** <Why it breaks the property the contract depends on.>

<Any licence or access question that is unresolved. Say it is unresolved rather than assuming.>

---

## 4 · Traps that produced a wrong answer rather than an error

<This section earns its keep faster than any other. A tool that fails loudly costs minutes; one
that returns a confident wrong answer costs the rest of the run.>

- **<The trap.>** <The symptom, and the fix.> <How many times it has fired.>
- **<The trap.>** <...>

---

## 5 · Repository facts that changed recently

<Rules that documents still assert but that no longer hold, with the commit that killed each. An
agent obeying a dead rule burns iterations.>

<Duplicated or stale documents, and which copy is authoritative.>
