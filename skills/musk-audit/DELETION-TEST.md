# The tests and the vocabulary

The two tests every agent applies, and the architecture vocabulary Phases 2–3 use. The deletion test, the module/interface/seam/depth vocabulary, and the dependency categories are adapted from Matt Pocock's `improve-codebase-architecture` skill — use the terms *exactly*, the way that skill insists, because consistent language is what keeps the findings legible.

## The two tests

### The provenance / named-owner test (Phase 1)

Adapted to software from the named-person rule. For each requirement, flag, rule, integration, or dependency, an agent asks: **who, by name, can currently justify this?**

- A live, named owner with a current reason → **load-bearing**, exits the pipeline.
- No name — only a department, a dead ticket, a vanished spec, or a commit by someone who left → **orphaned**, becomes a deletion candidate.

"Required by safety/legal/compliance" with nobody attached is not a justification; it's an unowned constraint. The test is satisfied only by a person who can defend it today.

### The deletion test (Phase 2)

Adapted directly from Pocock. Imagine deleting the module.

- If complexity **vanishes**, it was a pass-through — it wasn't hiding anything. Delete.
- If complexity **reappears across N callers**, it was earning its keep. It's load-bearing; defend it.

A "yes, deleting it concentrates complexity back into the callers" is the signal that the module is *not* a deletion candidate. A "deleting it changes nothing observable" is the fiberglass-mat signal — confirm with the defender agent, then cut.

## Architecture vocabulary (use exactly — Phases 2 and 3)

Don't drift into "component," "service," "API," "boundary," "wrapper," or "layer." The point is consistency.

- **Module** — anything with an interface and an implementation: a function, class, package, or tier-spanning slice. Scale-agnostic.
- **Interface** — *everything a caller must know to use the module correctly*: types, but also invariants, ordering constraints, error modes, required config, performance characteristics. Not just the signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: how much behaviour a caller or test exercises per unit of interface it must learn. **Deep** = a lot of behaviour behind a small interface. **Shallow** = interface nearly as complex as the implementation.
- **Seam** *(Feathers)* — where an interface lives; a place behaviour can be altered without editing in place. Use this, never "boundary."
- **Adapter** — a concrete thing satisfying an interface at a seam. Describes role, not substance.
- **Leverage** — what callers get from depth: more capability per unit of interface learned.
- **Locality** — what maintainers get from depth: change, bugs, and knowledge concentrate in one place. Fix once, fixed everywhere.

Core principle for Phase 3: **the interface is the test surface.** Callers and tests cross the same seam; if you want to test *past* the interface, the module is the wrong shape. And: **one adapter is a hypothetical seam, two adapters is a real one** — don't introduce a seam unless something actually varies across it (typically production + test).

## Dependency categories (Phase 3 — how a deepened module is tested)

When proposing to deepen a shallow cluster, classify its dependencies; the category dictates how it's tested across its seam.

1. **In-process** — pure computation, in-memory state, no I/O. Always deepenable; merge the modules and test through the new interface directly. No adapter.
2. **Local-substitutable** — has a local test stand-in (PGLite for Postgres, in-memory filesystem). Deepenable if the stand-in exists; the seam is internal, no port at the external interface.
3. **Remote but owned (ports & adapters)** — your own services across a network. Define a **port** at the seam; logic lives in the deep module, transport is an injected **adapter** (HTTP/gRPC in prod, in-memory in tests).
4. **True external (mock)** — third-party services you don't control (Stripe, Twilio). Injected port; tests use a mock adapter.

**Testing strategy: replace, don't layer.** Once tests exist at the deepened module's interface, the old unit tests on the shallow pieces are waste — delete them. New tests assert observable outcomes through the interface and survive internal refactors.
