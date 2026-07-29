---
name: adversarial-pr-verification
description: "Adversarially verify another agent's (or your own) PRs — open or already-merged. Re-derive ground truth (build, lint, tests, docs:check) instead of trusting the PR body, trace every claim to actual code, and report findings with a true / false / coverage-gap taxonomy. Use when asked to verify, audit, double-check, or QA one or more PRs."
---

# Adversarial PR Verification

> An auditor's process, not a reviewer's. The PR body is a set of **claims to be disproven**, not a description to be summarized.
> Default to disbelief: a claim is unverified until you have re-derived it from the code or a command you ran yourself.
> Honest, evidence-grounded reporting — no rubber-stamping. See [[honest-evidence-grounded-feedback]].

## When to use

- "Verify / audit / double-check / QA PR #N" (or a range `#N–#M`).
- After a subagent or another agent reports a batch of PRs done.
- Before relying on a merged change you didn't write.

Works for **open** PRs (check out the branch) and **already-merged** ones (verify against the merge commit + current `main`).

## Mindset

1. **Trust nothing in the PR body.** "build ✅", "13/13 tests", "regression test added" are claims. Re-run them. A green checkmark in prose is worth zero.
2. **Ground truth beats CI.** Re-run build/lint/tests **locally yourself**. CI can be stale, skipped, or `--no-verify`'d.
3. **Trace every claim to a line of code.** "Fixes X by doing Y" → open the file, confirm Y exists and actually causes X. Confirm helpers/models the diff references (`countPlansFor`, `PlanTypeWithCount`, a hook) really exist.
4. **Tests must be real and non-vacuous.** A "regression test" that asserts nothing, or only re-asserts the mock, is not coverage. Read the asserts.
5. **Honesty is itself a finding.** A PR that says "partial — blocked by missing backend field" and is *telling the truth* passes that check; one that quietly drops scope fails it.

## Steps

### 1. Extract the claims
```bash
for pr in <list>; do gh pr view $pr --json number,title,state,mergedAt,headRefName,additions,deletions,body; done
for pr in <list>; do gh pr view $pr --json commits | <parse oid>; done   # squash → one commit each
git show --stat <commit>                                                  # files touched per PR
```
Turn the body into a checklist: every "#NNN — does X", every "✅", every "+ test", every "(backend) …", every "partial/blocked" claim is one line to verify.

### 2. Re-derive ground truth (do not trust the body)
Run the verification floor yourself (`verification-before-completion`), scoped to what changed:

```bash
bun run build                          # all 5 projects; the universal "build ✅" claim
bunx biome check <changed files>       # check-only lint (don't lint:fix — you're auditing, not fixing)
bun run docs:check                     # if .claude/rules/*, AGENTS.md, or evals/ were touched
```

**Repo-specific test gotchas (these bite every time):**
- **Backend** must run from the app dir with the test env, or `dbClient` is `undefined` and *every* test fails while the process still exits 0:
  ```bash
  cd apps/main-server && NODE_ENV=test bun test src/api/<mod>/<mod>.test.ts
  ```
  `bun --filter=@repo/main-server test` skips `test.env` → false failures. The test DB must be up (`docker compose --profile test-only up -d`; port 5433).
- **Frontend** is Vitest, not bun test — `bun --filter=@repo/web test` invokes bun's runner and the `@test/index` alias fails to resolve. Use:
  ```bash
  cd apps/web && bun --bun vitest run <file.test.tsx> ...
  ```
- A background command exiting **0 does not mean tests passed** — open the output and read the pass/fail line.

### 3. Trace each claim to the code
For every checklist line:
- Open the diff (`git show <commit> -- <file>`) and the **current** file on `main`.
- Confirm the change exists, does what's claimed, and that referenced symbols exist (`grep -n`).
- For "added a test": read the asserts — is it non-vacuous, the single owner of a distinct observable risk, and not duplicated at an adjacent layer? A missing test file can be a coverage gap, but apply `.claude/rules/testing.md`'s test-creation gate before recommending a new case.
- For i18n: new keys present in **both** `pt-BR` *and* `en`? Sentence case? Forbidden verbs (`Inativar`, `Cadastrar`, `Deletar`)? CLDR plurals need i18next ≥ 23 and no `compatibilityJSON`.
- For backend correctness: does the SQL/join actually produce the asserted result? Does a "mirrors X" claim actually match X?
- For "blocked / partial": is the blocker real? (e.g. confirm the field genuinely is absent from the model.)

Use parallel `Explore`/`general-purpose` subagents to fan out claim-tracing across many files when the range is large — see [[default-to-workflows-for-large-sweeps]].

### 4. Classify and report
Group findings — never a flat "looks good":

| Class | Meaning |
|---|---|
| **Verified true** | Re-derived from code or a command you ran. Cite the evidence (test count, line, command). |
| **False / overstated** | Claim contradicts the code or a failing command. The important class — call it out plainly. |
| **Coverage gap** | Claim is true but its evidence is insufficient. Rate the observable risk; this classification does not automatically justify another test. Recommend one only for an uncovered Essential risk after applying the test-creation gate. |
| **Inconsistency** | Sibling PRs solve the same requirement differently; drift vs the rules. |
| **Process note** | `--no-verify`, floor bypassed, stale CI, merge-order risk. |
| **Out of scope** | Pre-existing issue not introduced by this PR (prove with `git show <commit>~1`). |

End with a one-line bottom line: did you try to break it and fail, or did something not hold up?

## Anti-patterns

- Summarizing the PR body back as if it were verification. (It is not.)
- Reporting "tests pass" from a background run you didn't read to completion.
- Trusting a green CI badge instead of re-running locally.
- Flagging pre-existing issues as regressions without checking `<commit>~1`.
- A flat findings list with no true/false/gap distinction — the taxonomy is the value.
- Burying a false claim under praise. Lead with what didn't hold up.

