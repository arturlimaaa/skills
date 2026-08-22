export const meta = {
  name: 'verify-checkpoint',
  description: 'Try to refute that a checkpoint is genuinely done, from three independent lenses',
  phases: [{ title: 'Refute', detail: 'correctness, test-quality and rules lenses' }],
}

// Three lenses read a finished checkpoint cold and try to prove it is not done.
//
// Two callers use this file. A supervisor runs it as a Workflow script. The loop reads the three
// prompts out of it and dispatches them itself, because `PROMPT.md` step 5 needs the verdicts in
// hand before it records anything. Both refute against the same wording, which is the reason the
// prompts live in one file rather than in each caller.
//
// Args when run as a Workflow:
//
//   {
//     worktree:        "/abs/path/to/worktree",   // required
//     branch:          "al/some-branch",          // required
//     id:              "A4 manifest-builder",
//     goal:            "what the checkpoint had to achieve, in its own terms",
//     files:           "NEW path/a.py; MODIFIED path/b.py, path/c.py",
//     confirmed:       "what the caller already checked, so a lens spends its effort elsewhere",
//     traps:           "the false-failure traps from GUARDRAILS.md section 4",
//     staleDocs:       "the documents GUARDRAILS.md section 3 lists",
//     correctnessExtra:"the specific thing you most suspect about correctness",
//     testsExtra:      "the specific mutations to run",
//     rulesExtra:      "the documents you think just went stale"
//   }
//
// The three *Extra fields carry the caller's own suspicion. They are what turns a generic review
// into a specific one, and they are worth writing every time.
const cp = args
if (!cp || !cp.worktree || !cp.branch) {
  throw new Error('verify-checkpoint needs args.worktree and args.branch')
}
const WT = cp.worktree

// A lens that trips a known trap reports a refutation that is not real, and `PROMPT.md` step 5
// turns a surviving blocking verdict into a halt. A trap nobody wrote down stops an overnight run
// for nothing. Put this project's measured traps in GUARDRAILS.md section 4 and pass them here.
const GATES = `
Use the project's runner, never a bare tool. An activated virtualenv exports VIRTUAL_ENV and
follows you into other worktrees, so a bare call silently runs another worktree's code.

Redirect a gate to a file and then read the file. Never pipe one into tail, head or grep. tail
closes stdout and the runner can die in its own logging teardown, exiting 1 with every test passed.
Piping into grep gives you grep's exit code. Both have produced false failures.

If you mutate a file to test a hypothesis, copy it aside first and restore from the copy. Never
restore with \`git checkout --\` while the tree holds uncommitted work: that discards every
uncommitted edit in the file rather than your mutation, and it has destroyed finished work before.

Run long batches as several tool calls that each print. A single call producing no output for more
than ten minutes is killed by the stall watchdog regardless of load.

${cp.traps || 'This project recorded no further traps. Read GUARDRAILS.md section 4 and say so plainly if it is empty rather than inventing any.'}
`

const COMMON = `
Worktree: ${WT}   (branch ${cp.branch})

READ ONLY. Do not edit, commit, revert, stage, or leave any file changed. You may run read-only
commands. If you mutate anything to test a hypothesis, you MUST restore it and prove the restore
with git status before you finish.
${GATES}
A checkpoint was just implemented. The caller has ALREADY confirmed the things listed under
"already confirmed" below, so do not spend your effort there.

CHECKPOINT: ${cp.id}
GOAL: ${cp.goal}
FILES CHANGED: ${cp.files}
ALREADY CONFIRMED: ${cp.confirmed}

Your job is to REFUTE the claim that this checkpoint is genuinely done. Default to refuted if you
cannot confirm something yourself by opening files and checking. A green gate is not proof. A green
gate is exactly what you are auditing. Untracked files are invisible to git diff, so check
git status --porcelain -uall rather than trusting a diff.

Report severity honestly. "blocking" means it must be fixed before the next checkpoint builds on
this one, and it stops the loop if it survives a fix. "worth-fixing" means a reviewer would send it
back. "note" means say it once and move on. Do not inflate. A checkpoint that is genuinely fine
should come back refuted=false.
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
- Does the change achieve the goal, completely? Name anything the goal asks for that is missing or half done.
- Is there a behaviour change that was not asked for? For a refactor, any behaviour change is a defect.
- Does anything now import in a direction the checkpoint forbids, or create a cycle?
- Is there a caller, script, test, or document that references a moved or renamed thing and was missed? Search the WHOLE worktree, including scripts, markdown and yaml. Do not trust grep alone. Open the files.
- Which directories does the gate set structurally not read? A scripts directory outside the test runner's paths and outside the type checker's files is seen by nothing but the linter. If this change touched one, run it by hand and report the exit code.
- Are there code paths reachable in production that no test reaches?

${cp.correctnessExtra || ''}`,
  },
  {
    key: 'tests',
    prompt: `${COMMON}
LENS: do the tests actually prove anything?

For every test added or modified, and for the tests covering the changed production code:
- Name a specific, plausible mutation to the production code and say whether the suite catches it. Run the mutation if you can restore it cleanly. Report exit codes, not impressions.
- Is any expected value derived from the output under test rather than computed independently? An expectation built from the response cannot fail.
- Does any test assert a category rather than an identity? A bare exception class instead of a specific error kind, constraint name or message.
- Did this change DELETE coverage that used to exist? Compare against git show HEAD.
- Does any test pass vacuously? A generated list that is empty, or an assertion whose two sides both descend from the function under test.
- Does a test that must fail rather than skip actually do so? A refusal mutated into a skip lets the skip exception propagate, the test reports as skipped, and the gate still exits 0.
- Check the repository's own rules on test doubles in GUARDRAILS.md section 3 and flag anything that breaks them.

${cp.testsExtra || ''}`,
  },
  {
    key: 'rules',
    prompt: `${COMMON}
LENS: repository rules, conventions, and documents that went stale.

Read ${WT}/autopilot/GUARDRAILS.md in full, then audit the diff against it.
- Was any forbidden action taken? Read section 1 and check git status --porcelain -uall against every path it names, plus any dependency, lock, migration or generated config file. Confirm nothing was pushed.
- Do the comments follow section 3? Comment intent, never restate the code. No ordering or sequencing narration.
- One term per concept. Flag a file that now uses two names for one thing.
- Which documents did this change make stale? Check ${cp.staleDocs || 'the list under "Documents the repo keeps in step with the code" in GUARDRAILS.md section 3. Say so plainly if that list is absent rather than inventing one'}. Report what is now false. Do NOT propose editing a document to agree with the branch. Report it.
- Does the change introduce a convention this repo does not otherwise have? If so, does anything else need to know about it?

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
