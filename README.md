# skills

A collection of [Claude Code](https://claude.com/claude-code) skills I find useful — the full loop from *"I have an idea"* to *"it shipped and I've audited it"*.

Write a PRD → break it into a plan → break that into issues → build it with TDD → review and adversarially verify the PRs → audit and simplify what you shipped.

**17 skills. One command. macOS, Linux, and Windows.**

---

## Install

```
npx skills@latest add arturlimaaa/skills
```

That's it. One command, identical on every platform, and it works for **more than just Claude Code** — [skills.sh](https://skills.sh) installs into Cursor, Codex, Copilot, Windsurf, Gemini, Cline, Zed, Amp, and a dozen others. It gives you an interactive picker so you can take only the skills you want.

Add `-g` to install globally (user-level) instead of into the current project, and `--all` to take everything without prompting:

```
npx skills@latest add arturlimaaa/skills -g          # all your projects
npx skills@latest add arturlimaaa/skills --all       # no prompts
npx skills@latest add arturlimaaa/skills --list      # just show me what's in here
```

Skills land in `.agents/skills/`, get symlinked into each agent's own directory, and are recorded in `skills-lock.json` so a teammate can restore the exact set with `npx skills@latest experimental_install`.

Requires Node, which is where `npx` comes from. The two options below need no Node at all.

<details>
<summary>Alternative — as a Claude Code plugin</summary>

Claude Code only, but no Node dependency, and it installs as one bundle you can update or remove in a single step without touching your `~/.claude/skills` directory:

```
claude plugin marketplace add arturlimaaa/skills
claude plugin install artur-skills@arturlimaaa-skills
```

The same two work as slash commands inside a session (`/plugin marketplace add …`). Restart Claude Code and the skills are live.

Two lines rather than one because Windows PowerShell 5.1 has no `&&`. On bash, zsh, or PowerShell 7+ you can chain them.
</details>

<details>
<summary>Alternative — copy the files into `~/.claude/skills`</summary>

Use this if you'd rather have the skills as loose directories you can edit in place.

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/arturlimaaa/skills/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 | iex
```

The installers are non-destructive by default: an existing skill of the same name is backed up to `<name>.bak-<timestamp>` before being replaced, identical skills are skipped, and symlinked skills are left alone.

**Options.** Because the script is piped into the shell, they're passed as environment variables:

| Variable | Effect |
| --- | --- |
| `SKILLS_DIR` | Install somewhere other than `~/.claude/skills` |
| `SKILLS_REF` | Install a branch or tag other than `main` |
| `ONLY` | Install only the named skills, e.g. `ONLY="tdd qa"` |
| `DRY_RUN=1` | Print what would happen, change nothing |
| `NO_BACKUP=1` | Overwrite existing skills without backing them up |

```bash
# preview first
curl -fsSL https://raw.githubusercontent.com/arturlimaaa/skills/main/install.sh | DRY_RUN=1 bash

# just two of them
curl -fsSL https://raw.githubusercontent.com/arturlimaaa/skills/main/install.sh | ONLY="tdd qa" bash
```

```powershell
# preview first
$env:DRY_RUN=1; irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 | iex

# just two of them
$env:ONLY="tdd qa"; irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 | iex
```

Download the script instead of piping it if you want real named parameters:

```powershell
irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 -OutFile install.ps1
.\install.ps1 -Only tdd,qa -DryRun
```
</details>

### Manual

```bash
git clone https://github.com/arturlimaaa/skills.git
cp -R skills/skills/* ~/.claude/skills/
```

Or cherry-pick a single one — every skill is a self-contained directory:

```bash
cp -R skills/skills/tdd ~/.claude/skills/
```

---

## The skills

| Skill | What it does |
| --- | --- |
| [`adversarial-pr-verification`](skills/adversarial-pr-verification) | Verifies a PR by re-deriving ground truth — builds, lints, tests — instead of trusting the description. Reports findings as true / false / coverage-gap. |
| [`autoreview`](skills/autoreview) | Pre-commit and pre-ship code review. Uses Codex by default; Claude and Pi are optional backends. |
| [`clone-website`](skills/clone-website) | Reverse-engineers a site and rebuilds it section by section, dispatching parallel builder agents in worktrees as it goes. |
| [`explain-diff`](skills/explain-diff) | Produces a rich HTML explanation of a diff, branch, or PR. |
| [`graphify`](skills/graphify) | Turns any input — code, docs, papers, images, video — into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools. |
| [`grill-me`](skills/grill-me) | Interviews you about a plan or design relentlessly, resolving every branch of the decision tree before you build. |
| [`handoff`](skills/handoff) | Compacts the current conversation into a handoff document another agent can pick up cold. |
| [`improve-codebase-architecture`](skills/improve-codebase-architecture) | Scans for deepening opportunities, presents them as a visual HTML report, then grills you through whichever one you pick. |
| [`lizard`](skills/lizard) | Removes the tells of AI-generated writing — inflated symbolism, rule of three, em dash overuse, negative parallelisms. Based on Wikipedia's "Signs of AI writing". |
| [`musk-audit`](skills/musk-audit) | Runs the five-step algorithm — question requirements, delete, simplify, accelerate, automate — in strict order, with adversarial verification on every finding. |
| [`prd-to-plan`](skills/prd-to-plan) | Turns a PRD into a multi-phase implementation plan built from tracer-bullet vertical slices. |
| [`qa`](skills/qa) | Conversational QA session — you describe bugs in plain language, it files the GitHub issues. |
| [`taste-frontend`](skills/taste-frontend) | Anti-slop frontend work for landing pages, portfolios, and redesigns. Audit-first on redesigns, with a strict pre-flight check. |
| [`tdd`](skills/tdd) | Test-driven development with a real red-green-refactor loop. |
| [`teach`](skills/teach) | Teaches you a new skill or concept inside a dedicated workspace, tracking missions and a learning record. |
| [`to-issues`](skills/to-issues) | Breaks a plan, spec, or PRD into independently-grabbable issues on your tracker, as tracer-bullet vertical slices. |
| [`write-a-prd`](skills/write-a-prd) | Builds a PRD through user interview, codebase exploration, and module design, then submits it as a GitHub issue. |

### Suggested pipeline

```
write-a-prd  →  prd-to-plan  →  to-issues  →  tdd  →  autoreview  →  adversarial-pr-verification  →  musk-audit
```

`grill-me` slots in anywhere you want a plan stress-tested. `handoff` slots in anywhere you run out of context.

---

## Requirements

Claude Code is the only hard requirement. Individual skills reach for extra tooling when you invoke them:

| Skill | Also wants |
| --- | --- |
| `autoreview` | [`codex`](https://github.com/openai/codex) CLI (default backend), `gh`, `jq`, Python 3 |
| `adversarial-pr-verification`, `qa` | [`gh`](https://cli.github.com) CLI, authenticated |
| `graphify` | Python 3 (or [`uv`](https://docs.astral.sh/uv/)), Node |
| `clone-website` | [Playwright](https://playwright.dev) via `npx` |

The rest are pure Markdown and need nothing beyond Claude Code.

---

## Updating and removing

| Installed with | Update | Remove |
| --- | --- | --- |
| `npx skills` | `npx skills@latest update` | `npx skills@latest remove` |
| Plugin | `claude plugin marketplace update arturlimaaa-skills` | `claude plugin uninstall artur-skills` |
| Script | re-run the install command | delete the directories from `~/.claude/skills` |

Re-running the shell installer backs up any skill you've edited locally to `<name>.bak-<timestamp>` before replacing it, so local changes are never silently lost.

---

## Not included

My `~/.claude/skills` also carries LangChain's official skill set — `deep-agents-*`, `langchain-*`, `langgraph-*`, `langsmith-*`. Those aren't mine to redistribute, and they're better installed from the source so you track upstream:

```
https://github.com/langchain-ai/langchain-skills
```

## License

[MIT](LICENSE). Take them, fork them, rewrite them to fit how you work.
