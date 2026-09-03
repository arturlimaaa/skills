export const meta = {
  name: 'gap-scout',
  description: 'Propose open gaps per area, adversarially refute each for novelty, judge value against cost, score deterministically',
  phases: [
    { title: 'Discover', detail: 'one scout per area, N candidate gaps each' },
    { title: 'Verify', detail: 'per gap: novelty refuter; per area: two-axis judge' },
  ],
}

/* args:
 *   context      string   who is doing this, budget, deadline, what accelerates and what does not
 *   areas        [{key,name,scope}]
 *   value        {label, rubric}   the "is it worth doing" axis
 *   cost         {label, rubric, unit}   the "can it be done in budget" axis
 *   perArea      number  default 5
 *   research     string   optional: corpora, APIs and search guidance for the scouts
 *   tiers        [string] optional cost-tier enum, default the compute tiers
 *   calibration  optional {bar:number, rates:[{keys:[areaKey],rate:number,label:string}]}
 *                base rates the judges CANNOT see, applied afterwards in code
 *   model, effort  optional overrides
 */
const A = args
const N = A.perArea || 5
const TIERS = A.tiers || ['api_only', 'single_gpu', 'multi_gpu_8', 'cluster']
const MODEL = A.model || undefined
const mopt = MODEL ? { model: MODEL } : {}

const PRE = `${A.context}
${A.research || 'You MUST search the web for anything recent; your training data may be out of date. FIRST call ToolSearch with query "select:WebSearch,WebFetch" to load web tools.'}
Cite a URL for every factual claim. Never invent a citation: cite only pages you actually fetched or saw in search results. Concrete over generic. Your final output is data for a downstream program, not prose for a human.`

const GAPS = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    searched: { type: 'array', items: { type: 'string' }, description: 'queries/sources you actually checked' },
    gaps: {
      type: 'array', minItems: N, maxItems: N,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'specific, headline-like' },
          statement: { type: 'string', description: 'the precise open question, 2-4 sentences' },
          why_open_evidence: { type: 'string', description: 'what exists, what it does not cover, why you believe this is open' },
          citations: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, year: { type: 'number' }, relation: { type: 'string' } }, required: ['title', 'url', 'relation'] } },
          why_it_matters: { type: 'string' },
          kind: { type: 'string', description: 'the archetype of deliverable this would be' },
          sketch: { type: 'string', description: 'concrete plan within the stated budget, and the expected headline figure' },
          key_steps: { type: 'array', items: { type: 'string' } },
          cost_tier: { type: 'string', enum: TIERS },
          inputs_needed: { type: 'string', description: 'data, access or artifacts required' },
          risks: { type: 'array', items: { type: 'string' } },
          self_novelty: { type: 'number', description: '1-10' },
          self_value: { type: 'number', description: '1-10' },
          self_cost_fit: { type: 'number', description: '1-10, higher means fits the budget better' },
        },
        required: ['title', 'statement', 'why_open_evidence', 'citations', 'why_it_matters', 'kind', 'sketch', 'key_steps', 'cost_tier', 'inputs_needed', 'risks', 'self_novelty', 'self_value', 'self_cost_fit'],
      },
    },
  },
  required: ['area', 'searched', 'gaps'],
}

const NOVELTY = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean', description: 'true ONLY if existing work answers the core question with comparable rigor' },
    existing_work: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, year: { type: 'number' }, coverage: { type: 'string' } }, required: ['title', 'url', 'coverage'] } },
    residual_gap: { type: 'string', description: 'what remains open after accounting for existing work; the positioning sentence' },
    novelty_score: { type: 'number', description: '10 untouched, 5 adjacent work exists but exact question open, 1 done' },
    queries_run: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', description: '0-1' },
  },
  required: ['refuted', 'existing_work', 'residual_gap', 'novelty_score', 'queries_run', 'confidence'],
}

const JUDGE = {
  type: 'object',
  properties: {
    evaluations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gap_index: { type: 'number', description: '0-based index in the input list' },
          gap_title: { type: 'string' },
          value: { type: 'number', description: `1-10 on: ${A.value.label}` },
          cost_fit: { type: 'number', description: `1-10 on: ${A.cost.label}, higher means fits the budget better` },
          archetype_fit: { type: 'string' },
          cost_estimate: { type: 'number', description: A.cost.unit || 'effort units' },
          cost_tier: { type: 'string', enum: TIERS },
          critical_path: { type: 'array', items: { type: 'string' } },
          minimum_viable: { type: 'array', items: { type: 'string' }, description: 'smallest evidence set that is still a complete deliverable' },
          objections: { type: 'array', items: { type: 'string' } },
          mitigations: { type: 'array', items: { type: 'string' } },
          plan: { type: 'object', properties: { early: { type: 'string' }, middle: { type: 'string' }, late: { type: 'string' } }, required: ['early', 'middle', 'late'] },
          one_line_verdict: { type: 'string' },
        },
        required: ['gap_index', 'gap_title', 'value', 'cost_fit', 'archetype_fit', 'cost_estimate', 'cost_tier', 'critical_path', 'minimum_viable', 'objections', 'mitigations', 'plan', 'one_line_verdict'],
      },
    },
  },
  required: ['evaluations'],
}

const scoutPrompt = a => `${PRE}
You are a senior practitioner scouting open, currently-unanswered gaps in: ${a.name}.
Scope: ${a.scope}
Goal: find exactly ${N} concrete gaps that could become a complete deliverable within the stated budget.
Method, do all of it:
1. Pull the freshest literature and prior art. Run at least 6 different queries. Read the limitations and future-work sections of 6-10 promising sources, not just abstracts.
2. Hunt specifically for: (a) claims everyone repeats but nobody has tested, (b) a result established in only one regime (one model family, one scale, one language, one domain), (c) contradictory findings between sources, (d) a missing baseline or control that would change a published conclusion, (e) a recent release that invalidates or newly enables something, (f) measurement and benchmark blind spots, (g) simple ideas skipped because the field moved fast, (h) theory never checked empirically or vice versa.
3. Favor gaps answerable within the budget: careful empirical studies, controlled or minimal experiments, evaluation methodology, well-evidenced negative results, audits of published artifacts.
4. For each gap state the evidence it is open: what you searched, what you found, and why it does not cover the gap.
Rank your ${N} by value times feasibility. Be ambitious, but never invent a citation.`

const refuterPrompt = (g, a) => `${PRE}
You are an adversarial novelty checker for a proposed gap in ${a.name}. Try hard to REFUTE it by finding existing work that already answers it.
Run at least 6 distinct queries: rephrase with synonyms, use the field's jargon, search the obvious groups and authors, check the citations the proposer listed and the work citing them. Include very recent preprints, workshop papers and lab blog posts. Open the top candidates and check whether they answer the CORE question, not merely share the topic.
Verdict rule: refuted=true ONLY if a found source answers the gap's core question with comparable rigor, and you give the URL and explain how. If existing work is merely adjacent, set refuted=false, list it with what it covers, and state the residual gap precisely. That sentence becomes the positioning.
GAP: ${JSON.stringify(g)}`

const judgePrompt = (gaps, a) => `${PRE}
You are simultaneously a gatekeeper who decides what gets selected and a pragmatic delivery lead. Below are ${gaps.length} proposed gaps in ${a.name}. Evaluate EACH independently on two axes.
A) ${A.value.label} (1-10). ${A.value.rubric}
B) ${A.cost.label} (1-10, higher means it fits the budget better). ${A.cost.rubric} Estimate cost in ${A.cost.unit || 'effort units'}, give the ordered critical path, and the minimum viable evidence set that is still a complete deliverable. Be optimistic where the stated accelerators genuinely help and honest where they do not.
Give objections with concrete mitigations and a phased plan. Return one evaluation per gap, in input order, with gap_index.
GAPS: ${JSON.stringify(gaps.map(g => ({ title: g.title, statement: g.statement, why_open_evidence: g.why_open_evidence, why_it_matters: g.why_it_matters, kind: g.kind, sketch: g.sketch, key_steps: g.key_steps, cost_tier: g.cost_tier, inputs_needed: g.inputs_needed, risks: g.risks })))}`

/* calibration the judges never saw, joined in code afterwards */
const BAR = A.calibration?.bar
const rateFor = key => {
  const hit = (A.calibration?.rates || []).find(r => r.keys.includes(key))
  return hit || null
}

const results = await pipeline(
  A.areas,
  a => agent(scoutPrompt(a), { label: `scout:${a.key}`, phase: 'Discover', schema: GAPS, ...mopt }),
  async (found, a) => {
    if (!found || !found.gaps?.length) { log(`scout:${a.key} returned nothing`); return null }
    const gaps = found.gaps
    const [novelty, judged] = await parallel([
      () => parallel(gaps.map((g, i) => () => agent(refuterPrompt(g, a), { label: `refute:${a.key}#${i + 1}`, phase: 'Verify', schema: NOVELTY, ...mopt }))),
      () => agent(judgePrompt(gaps, a), { label: `judge:${a.key}`, phase: 'Verify', schema: JUDGE, effort: A.effort || 'high', ...mopt }),
    ])
    const evals = judged?.evaluations || []
    const cal = rateFor(a.key)
    const scored = gaps.map((g, i) => {
      const n = novelty?.[i] || null
      const e = evals.find(x => x.gap_index === i) || evals[i] || null
      const novelty_score = n?.novelty_score ?? g.self_novelty
      const value = e?.value ?? g.self_value
      const cost_fit = e?.cost_fit ?? g.self_cost_fit
      const composite = Math.round((0.4 * value + 0.3 * cost_fit + 0.3 * novelty_score) * 10) / 10
      const potential = (value + novelty_score) / 2
      const quadrant = n?.refuted ? 'refuted'
        : potential >= 6.5 && cost_fit >= 6.5 ? 'sprint'
        : potential >= 6.5 ? 'moonshot'
        : cost_fit >= 6.5 ? 'safe_bet' : 'skip'
      const adjusted = (cal && BAR != null)
        ? Math.round((composite + (cal.rate - BAR) / 10) * 100) / 100
        : composite
      return {
        area: a.name, area_key: a.key, gap: g, novelty: n, judge: e,
        scores: { novelty_score, value, cost_fit, composite, adjusted },
        calibration: cal ? { rate: cal.rate, label: cal.label, bar: BAR } : null,
        quadrant,
      }
    })
    const c = q => scored.filter(s => s.quadrant === q).length
    log(`${a.key}: ${c('sprint')} sprint, ${c('moonshot')} moonshot, ${c('safe_bet')} safe bet, ${c('refuted')} refuted`)
    return { area: a, searched: found.searched, scored }
  },
)

const all = results.filter(Boolean)
const flat = all.flatMap(r => r.scored)
const missing = A.areas.map(a => a.key).filter(k => !all.some(r => r.area.key === k))
if (missing.length) log(`INCOMPLETE, no results for: ${missing.join(', ')} — resume with resumeFromRunId`)
if (!A.calibration) log('no calibration supplied: "adjusted" equals "composite". Run selection-patterns first to get base rates.')
log(`done: ${flat.length} gaps across ${all.length} areas; ${flat.filter(s => s.quadrant === 'sprint').length} sprint, ${flat.filter(s => s.quadrant === 'refuted').length} refuted`)

return { areas_done: all.map(r => r.area.key), areas_missing: missing, calibrated: !!A.calibration, gaps: flat }
