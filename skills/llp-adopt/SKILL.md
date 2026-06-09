---
name: llp-adopt
description: Add LLP to a repository — greenfield or brownfield. Detects how much already exists and either scaffolds a fresh llp/ tree (scaffold mode) or surveys an existing codebase and drafts a root LLP plus an adoption plan (retrofit mode). The single entry point for "bring LLP to this project".
---

# llp-adopt

Use this skill when the user wants to bring LLP to a repository — whether it's a brand-new project or an existing codebase with history. There is **one** entry point for "add LLP here"; this skill decides whether to *scaffold* (greenfield) or *retrofit* (brownfield) based on how much already exists, rather than making the user pick.

Invoke as:

- `/llp-adopt` — inspect the repo, choose a mode, and proceed
- `/llp-adopt --mode scaffold` — force greenfield scaffolding
- `/llp-adopt --mode retrofit` — force the existing-codebase survey + plan

Greenfield and brownfield are two ends of one spectrum (how much design knowledge already exists to mine), not two separate skills — the same idea as the modes in `llp-maintain`. See [LLP 0008](../../llp/0008-distributed-agent-skills.rfc.md#llp-adopt-modes) for the rationale, [LLP 0001](../../llp/0001-greenfield-setup.guide.md) for the greenfield workflow, and [LLP 0002](../../llp/0002-retrofitting-llp.guide.md) for the retrofit workflow.

## Ground rules

- Read [LLP 0000](../../llp/0000-linked-literate-programming.explainer.md) for the core conventions before making changes.
- LLP documents live in `llp/` and use the `NNNN-slug.type.md` naming convention.
- The first document is `LLP 0000`, an `Explainer` carrying `**Role:** Root`.
- Generated content is **proposed**, not imposed: new files and clearly-marked managed blocks may be written directly, but existing user prose is never overwritten without showing a diff and asking.
- Keep the first pass lean. The goal is to establish orientation and the core loop, not to pre-document speculative design or annotate the whole repo.

## Choosing a mode

Inspect the repository before doing anything:

- Is there already an `llp/` directory? (If partial LLP adoption exists, **extend** it — don't start a second setup layer.)
- Are there agent-instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalent)?
- Read the top-level `README` and skim the directory structure: how much code and documentation is there, and how mature is the project?

Decide:

- **Little or no code/docs to mine** → `scaffold` mode. Establish the structure and a starter `LLP 0000`.
- **Substantial existing code, docs, or history** → `retrofit` mode. Survey first, then draft a root LLP and an adoption plan.

If `--mode` was supplied, honor it. If the repo is ambiguous (some code, no docs), say which way you're leaning and why, then proceed unless the user redirects.

## Shared setup spine

Both modes share the same foundation. Do these in either mode:

1. **Create the LLP foundation** (if not already present): create `llp/`; reserve `LLP 0000` for the root document; keep the tree flat unless the user already knows they need subsystem subdirectories.
2. **Set up agent instructions.** Add or update `AGENTS.md` (or the repo's existing agent-instructions file) so agents are told: LLP documents live in `llp/`; read relevant LLPs before changing areas they cover; add `@ref` annotations when implementing non-obvious documented decisions; update LLPs when the design changes; flag code that contradicts its referenced LLP. If the repo already has agent instructions, integrate LLP guidance into a clearly-marked managed block rather than creating competing instructions. When a tool expects `CLAUDE.md`, symlink it to `AGENTS.md` when safe rather than maintaining two divergent copies.
3. **Reruns are idempotent.** Running the skill again must not duplicate files or managed blocks; it updates in place.

## Mode: scaffold (greenfield)

For a fresh or very early-stage repository (the workflow in LLP 0001).

### 1. Draft LLP 0000

Create `llp/0000-<project-slug>.explainer.md` as the root document, including:

- Title `# LLP 0000: <Project or system name>`
- Metadata header: `**Type:** Explainer`, `**Status:** Draft` or `Active` (ask the user's preference), `**Systems:**` the top-level system name(s), `**Role:** Root`, `**Author:**`, `**Date:**`
- A concise summary of what the project does
- High-level architecture or major components
- Key constraints or invariants that will matter to future code changes

If the user has already described a design direction, incorporate it rather than leaving a blank scaffold.

### 2. Suggest the next documents, but don't overbuild

Recommend the smallest sensible follow-on set, typically:

1. `LLP 0000` root explainer (done above)
2. One Principles, RFC, or Decision that captures the first non-obvious architectural choice
3. Additional LLPs only as real decisions arise

Hand off to `llp-create` to author each of these. Do not create a batch of extra LLPs unless the user asks.

### 3. Close with practical next steps

Tell the user what was created, what number the root document got, and the next high-value step (usually refining `LLP 0000` or capturing the first substantive design decision with `llp-create`).

## Mode: retrofit (brownfield)

For an existing repository with meaningful code, docs, or history (the workflow in LLP 0002). Retrofit is the shared spine **plus** comprehension, drafting, migration, and annotation — and it is where agents are most dangerous, because they describe *what* code does but invent *why*. Keep observation and inference visibly separate (see Provenance, below).

### 1. Survey the existing repository

Build a high-level map before creating LLPs:

- Read the top-level `README` and notable documentation.
- Inspect the directory structure and major packages/modules.
- Identify entry points, boundaries, and obvious subsystems.
- Check for existing design docs, ADRs, RFCs, wiki exports, or architecture notes — these are source material, not noise.
- Optionally inspect recent git history (`git log --stat`, `git shortlog -sn`) to see where activity concentrates.

The output of this step is a concise architecture summary and an initial subsystem list.

### 2. Draft LLP 0000

Create or revise the root LLP so it acts as the entry point for the codebase: `**Type:** Explainer`, `**Role:** Root`, metadata matching the current project, and sections covering what the system does, its major subsystems, cross-cutting constraints or invariants, and where a new contributor or agent should look first. This document should reduce cold-start cost for someone reading the repo for the first time.

### 3. Propose the first subsystem LLPs

Identify the 2–5 highest-value follow-on LLPs based on: active development, frequent confusion or bugs, non-obvious design choices, and cross-cutting invariants. For each, provide a provisional title, likely type, systems tags, and why it should exist. Only create them immediately if the user asks; otherwise hand off to `llp-create`.

### 4. Mark provenance on everything generated

Generated documents stay `Draft` until a human ratifies them, and every claim is tagged so observation and inference don't blur (see [LLP 0008 §Provenance](../../llp/0008-distributed-agent-skills.rfc.md#provenance-for-generated-documents)):

- `[observed:<id>]` — behavior evidenced directly in code or tests; needs a matching `## Evidence` pointer (a repo path, an `@ref`-style target, or a commit) with the same `<id>`.
- `[confirmed]` — verified by a named human; needs attribution + date.
- `[inferred]` — an unverified hypothesis about rationale; must be ratified to `[confirmed]` or removed before the doc is promoted out of `Draft`.

Surface likely-untagged declarative claims and ask the author to classify them. Do not generate rationale from code alone without making the inference visible.

### 5. Recommend an annotation rollout plan (propose-then-apply)

Propose a phased plan rather than mass-annotating:

1. Module-level references for the first few documented subsystems
2. Function-level references for non-obvious design points
3. Ongoing boy-scout-rule maintenance (handled by `llp-maintain`)
4. Validation tooling once the corpus is large enough

Propose specific `@ref` annotations and apply them only after approval. Do not mass-annotate the whole repository unless the user explicitly asks.

## Hand-offs

- Once a corpus exists, day-to-day work starts with `llp-orient` (load context before coding).
- Author individual follow-on LLPs with `llp-create`.
- Ratify generated `Draft` docs with `llp-review` where the design warrants it.
- Keep the corpus healthy over time with `llp-maintain`.

## Scope limits

- Do not perform a retrofit-style codebase survey in `scaffold` mode, and do not create a large batch of LLPs proactively in either mode.
- Do not overwrite existing docs or agent instructions without checking whether they carry useful project-specific guidance; show a diff and ask.
- Do not promote any generated document past `Draft`, and do not leave `[inferred]` claims in a document you propose for promotion.
- Do not add `@ref` annotations to volatile early code unless the user explicitly asks.
