# Findings

Facts that cost a measurement to learn. **Trust these over your priors.** Nothing here is ever
deleted, because a fact that is deleted gets re-learned at the same cost.

A finding is not a task. It is something that would have changed how an iteration worked: a gate
that fails while passing, a tool that lies about its exit code, a suite slow enough to need
chunking, a convention two documents disagree about, a measurement that corrected an earlier one.

Numbered sections, in the order they were learned. When several sessions run at once, an agent
writes its finding to a scratchpad file and names the path in its report; <PERSON> merges it and
assigns the number at commit time, because two sessions cannot see each other's numbering and the
numbers are referenced elsewhere.

---

## 1 · <the fact, as a sentence>

<How it was measured, on what date, and what it changes. If a later measurement corrected this one,
say so here rather than editing the original.>
