export const meta = {
  name: 'verify-checkpoint',
  description: 'Try to refute that a checkpoint is genuinely done, from three independent lenses',
  phases: [{ title: 'Refute', detail: 'correctness, test-quality and rules lenses' }],
}

// Invoke through the Workflow tool with `args` shaped:
//
//   {
//     worktree:        "C:/abs/path/to/worktree",   // required
//     branch:          "my/branch",                 // required
//     id:              "A4 manifest-builder",
//     goal:            "what the checkpoint had to achieve, in the checkpoint's own terms",
//     files:           "NEW path/a.py; MODIFIED path/b.py, path/c.py",
//     confirmed:       "what the supervisor already checked, so a lens spends its effort elsewhere",
//     correctnessExtra:"the specific thing you most suspect about correctness",
//     testsExtra:      "the specific mutations to run",
//     rulesExtra:      "the documents you think just went stale"
//   }
//
// The three *Extra fields are where the supervisor's own suspicion goes. In the reference run they
// were what turned a generic review into a specific one.
const cp = args
if (!cp || !cp.worktree || !cp.branch) {
  throw new Error('verify-checkpoint needs args.worktree and args.branch')
}
const WT = cp.worktree

const COMMON = `
Worktree: ${WT}   (branch ${cp.branch})

READ ONLY. Do not edit, commit, revert, stage, or leave any file changed. You may run read-only
commands. If you mutate anything to test a hypothesis (a mutation test, moving a file), you MUST
restore it and prove the restore with git status before you finish.

Use uv run for any python invocation, never a bare python/pytest/mypy/ruff. A bare call silently
runs another worktree's code on this machine.
Never pipe a command into grep and then read the exit code; the code would be grep's. Capture it first.
The pipelines unit suite takes about 2 minutes. Budget for that; do not assume it hung.

A checkpoint was just implemented by a coding agent. The supervisor has ALREADY independently
confirmed the things listed under "already confirmed" below, so do not spend your effort there.

CHECKPOINT: ${cp.id}
GOAL: ${cp.goal}
FILES CHANGED: ${cp.files}
ALREADY CONFIRMED BY THE SUPERVISOR: ${cp.confirmed}

Your job is to REFUTE the claim that this checkpoint is genuinely done. Default to refuted if you
cannot confirm something yourself by opening files and checking. A green gate is not proof; a green
gate is exactly what you are auditing. Untracked files are invisible to git diff, so check
git status --porcelain -uall rather than trusting a diff.

Report severity honestly. "blocking" means it must be fixed before the next checkpoint builds on
this one. "worth-fixing" means a reviewer would send it back. "note" means say it once and move on.
Do not inflate. A checkpoint that is genuinely fine should come back refuted=false.
`

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    severity: { type: 'string', enum: ['blocking', 'worth-fixing', 'note', 'none'] },
    finding: { type: 'string', description: 'what you checked and what you found, with file:line. Empty string if nothing.' },
  },
  required: ['refuted', 'severity', 'finding'],
  additionalProperties: false,
}

phase('Refute')

const LENSES = [
  {
    key: 'correctness',
    prompt: `${COMMON}
LENS: correctness and completeness against the stated goal.

Read the full diff (git diff, plus every untracked file). Then:
- Does the change actually achieve the goal, completely? Name anything the goal asks for that is missing or only half done.
- Is there a behaviour change that was not asked for? For a refactor, any behaviour change is a defect.
- Does anything now import in a direction the checkpoint forbids, or create a cycle?
- Is there a caller, script, test, or document that references a moved or renamed thing and was missed? Search the WHOLE worktree, including scripts/, markdown, and any yaml. Do not trust grep alone for python; open the files.
- Are there code paths reachable in production that no test reaches?

${cp.correctnessExtra || ''}`,
  },
  {
    key: 'tests',
    prompt: `${COMMON}
LENS: do the tests actually prove anything?

For every test added or modified, and for the tests that cover the changed production code:
- Name a specific, plausible mutation to the production code and say whether the suite catches it. Actually run the mutation if you can do it without leaving the tree changed (patch in memory via a pytest plugin in your own scratch directory, or edit-run-restore and prove the restore). Report exit codes, not impressions.
- Is any expected value derived from the output under test rather than computed independently? That is the repo's own rule and the most common violation.
- Does any test assert a category rather than an identity (a bare exception class instead of a specific error kind, constraint name, or message)?
- Did this change DELETE coverage that used to exist? Compare against git show HEAD.
- Does any test pass vacuously, for example a generated list that is empty, or an assertion whose both sides are constants written by the same author?

${cp.testsExtra || ''}`,
  },
  {
    key: 'rules',
    prompt: `${COMMON}
LENS: repository rules, conventions, and documents that went stale.

Read ${WT}/autopilot/GUARDRAILS.md in full, then audit the diff against it.
- Was any forbidden action taken? Read the forbidden list in GUARDRAILS.md and check git status --porcelain -uall against every path it names, plus any dependency, lock, migration or generated-config file. Confirm nothing was pushed.
- Comment style: default to FEWER comments; comment intent not arrangement; never restate the code; no ordering or sequencing narration; one or two lines; no " -- " separator; no em dashes in prose.
- One term per concept. Flag a file that now uses two names for one thing.
- Which documents did this change make stale? Check the root AGENTS.md map, packages/pipelines/AGENTS.md, SPEC-meeting-capture-mvp.md section 7, and PRD-meeting-loop.md. Report what is now false. Do NOT propose editing a spec to agree with the branch; report it.
- Does the change introduce a convention this repo does not otherwise have? If so, does anything else need to know about it (packaging, collection, line endings, CI)?

${cp.rulesExtra || ''}`,
  },
]

const verdicts = await parallel(
  LENSES.map((l) => () =>
    agent(l.prompt, { label: `refute:${l.key}`, phase: 'Refute', schema: VERDICT })
  )
)

const real = verdicts.filter(Boolean)
log(`${real.length} lenses, ${real.filter((v) => v.refuted).length} refuted, ${real.filter((v) => v.severity === 'blocking').length} blocking`)
return { checkpoint: cp.id, verdicts: real }
