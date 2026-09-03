export const meta = {
  name: 'selection-patterns',
  description: 'Research what a gatekeeper actually selects for: rules, anatomy of accepted work, rejection causes, base rates, saturation',
  phases: [
    { title: 'Research', detail: 'parallel lenses, one per question' },
    { title: 'Synthesize', detail: 'one agent distils the lenses into a sourced brief' },
  ],
}

/* args:
 *   target    string  the venue, market or gatekeeper being characterised
 *   context   string  who is doing this, budget, deadline
 *   research  string  optional corpora, APIs and search guidance
 *   lenses    optional [{key, prompt}] to override the five defaults
 *   outPath   string  absolute path for the synthesised brief
 *   model, effort  optional overrides
 */
const A = args
const MODEL = A.model || undefined
const mopt = MODEL ? { model: MODEL } : {}

const PRE = `${A.context}
TARGET: ${A.target}
${A.research || 'You MUST search the web for anything recent; your training data may be out of date. FIRST call ToolSearch with query "select:WebSearch,WebFetch" to load web tools.'}
Cite a URL for every factual claim. Never invent a citation. Prefer primary sources over commentary, and say explicitly when a fact could not be verified. Your final output is data for a downstream synthesiser, not prose for a human.`

const FINDINGS = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'quote or figure that supports the claim' },
          source_urls: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', description: '0-1' },
        },
        required: ['claim', 'evidence', 'source_urls', 'confidence'],
      },
    },
    base_rates: {
      type: 'array',
      description: 'quantified selection rates per segment, where the lens found them',
      items: {
        type: 'object',
        properties: { segment: { type: 'string' }, rate: { type: 'number', description: 'percent' }, n: { type: 'number' }, trend: { type: 'string' }, source_url: { type: 'string' } },
        required: ['segment', 'rate', 'source_url'],
      },
    },
    actionable_rules: { type: 'array', items: { type: 'string' }, description: 'imperative rules, each one actionable' },
    open_questions: { type: 'array', items: { type: 'string' }, description: 'what you could not verify' },
  },
  required: ['lens', 'findings', 'base_rates', 'actionable_rules', 'open_questions'],
}

const DEFAULT_LENSES = [
  { key: 'rules', prompt: `LENS: the hard rules and the calendar.
Find and verify every gate that can disqualify an entry before it is ever judged: deadlines with time zones, format and length limits, eligibility and quota rules, disclosure requirements, and the full list of automatic rejections. Get the decision timeline end to end. Flag anything that is unverified for the current cycle and say what you fell back to.` },
  { key: 'anatomy', prompt: `LENS: the anatomy of what got selected.
Pull a large sample of recently selected work. Classify it into archetypes and estimate each archetype's share. For each archetype report the typical scale of the effort behind it and give exemplars with URLs. Identify what the top-honoured entries have in common that ordinary accepted ones lack. Estimate what fraction was achievable on a modest budget.` },
  { key: 'rejection', prompt: `LENS: why entries are rejected.
Find real evaluations of rejected and borderline work. Tally the complaint types and, if the data allows, estimate the cost of each complaint in whatever score the gatekeeper uses. Establish the score threshold that separates accept from reject and how steep it is around the boundary. Distil into rules the entrant can act on.` },
  { key: 'playbook', prompt: `LENS: how constrained entrants succeed.
Find concrete cases of selected work produced on a small budget or in a short time. For each: the thesis, the scale of evidence, and why it was accepted. Then research how practitioners currently use AI assistance for this kind of work, any measured speedups, and the documented pitfalls. Conclude with a phased execution playbook that fits the stated budget.` },
  { key: 'trends', prompt: `LENS: what is rising and what is saturated.
Quantify submission volume and selection rate per topic or segment across the last two to three cycles. Identify segments that are rising and still thin, segments that are saturated, and segments that are effectively dead. Report a rate and an n for every segment so the numbers can be joined to a downstream ranking. Name the open questions being actively debated right now.` },
]

const LENSES = A.lenses || DEFAULT_LENSES

phase('Research')
const results = (await parallel(LENSES.map(l => () =>
  agent(`${PRE}\n${l.prompt}`, { label: `lens:${l.key}`, phase: 'Research', schema: FINDINGS, ...mopt }),
))).filter(Boolean)
log(`${results.length}/${LENSES.length} lenses returned`)
if (!results.length) return { error: 'no lenses returned', lenses: [] }

phase('Synthesize')
const synthesis = await agent(`${PRE}
Synthesise the lens results below into one decision-ready brief for someone working against the stated budget and deadline.
Write the file ${A.outPath} using the Write tool or a Bash heredoc. Structure it:
1. Hard facts and the calendar, with URLs; mark anything unverified.
2. What gets selected: archetypes with shares, exemplars, typical scale.
3. What gets rejected: ranked complaints, each with the counter-move.
4. Rising versus saturated segments, as a table with a rate and an n per segment.
5. Which archetypes fit the stated budget, and why.
6. Ten imperative rules for this specific attempt.
7. A phased execution plan.
Keep every claim sourced. Prefer tables and short bullets. Do not pad.
Then return the compact JSON summary. In base_rates return EVERY segment rate you can, because a downstream ranking joins to it by segment name.
LENS RESULTS:
${JSON.stringify(results)}`, {
  label: 'synthesize', phase: 'Synthesize', effort: A.effort || 'high', ...mopt,
  schema: {
    type: 'object',
    properties: {
      hard_facts: { type: 'array', items: { type: 'string' } },
      archetypes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, share: { type: 'string' }, fits_budget: { type: 'boolean' } }, required: ['name', 'share', 'fits_budget'] } },
      top_rejection_causes: { type: 'array', items: { type: 'string' } },
      base_rates: { type: 'array', items: { type: 'object', properties: { segment: { type: 'string' }, rate: { type: 'number' }, verdict: { type: 'string' } }, required: ['segment', 'rate'] } },
      overall_bar: { type: 'number', description: 'the headline selection rate, percent, used as the calibration bar downstream' },
      rules: { type: 'array', items: { type: 'string' } },
      file_written: { type: 'string' },
    },
    required: ['hard_facts', 'archetypes', 'top_rejection_causes', 'base_rates', 'overall_bar', 'rules', 'file_written'],
  },
})

log(`brief written to ${synthesis?.file_written || A.outPath}; ${synthesis?.base_rates?.length || 0} segment rates for calibration`)
return { lenses: results, synthesis }
