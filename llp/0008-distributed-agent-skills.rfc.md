# LLP 0008: Distributed Agent Skills

**Type:** RFC
**Status:** Review
**Systems:** LLP, Agents
**Author:** Charlie Cheever / Codex
**Date:** 2026-06-08
**Revised:** 2026-06-09
**Related:** LLP 0000, LLP 0001, LLP 0002, LLP 0004, LLP 0005, LLP 0006

## Summary

LLP should ship a small set of first-party **agent skills** — plain-markdown `SKILL.md` files — that make recurring LLP workflows repeatable across projects and agent runtimes. This RFC supersedes the legacy `rfc/SKILL.md` (Exact's RFC process — wrong statuses, wrong paths), an earlier draft that proposed ~14 fine-grained skills, a later draft that paired the skills with a dedicated `llp` CLI, and the init-script approach formerly drafted as LLP 0007 (now removed). It also consolidates the seven first-cut skills that landed in `skills/` into a five-skill core (see [Addendum](#addendum-2026-06-09-consolidation-landed)). Bootstrap belongs in `llp-adopt`: LLP ships **no scripts**, only skills.

The design rests on one decision — **skills orchestrate; the harness computes:**

- **Deterministic work** — next-number, filename formatting, listing, metadata and anchor validation, `@ref` extraction and resolution — is done with the **harness's own exact tools** (`Glob`, `Grep`, `Read`, `Edit`, and shell pipelines). A shell pipeline whose stdout *is* the next LLP number computes it as exactly as a bespoke binary would; where a single pipeline can't express the answer (does this anchor exist in the tree?), the residual judgment is small, named, and tested — not hidden in a model's head (see [Harness-native mechanics](#harness-native-mechanics-the-deterministic-foundation)). The deterministic execution layer already exists in every agent runtime; it does not need to be re-shipped as an `llp` CLI.
- **Cognitive work** — reading rationale, drafting prose, inferring design intent, synthesizing reviews — lives in **five** skills (`llp-orient`, `llp-create`, `llp-review`, `llp-adopt`, `llp-maintain`) that *drive* those harness tools under a fixed recipe. `llp-adopt` is the single way to bring LLP to *any* repo (greenfield or brownfield); `llp-create` is narrowed to authoring one LLP in a corpus that already exists.

The keystone is `llp-orient`: "load the governing rationale before you touch the code" is the behavior LLP exists to make cheap, and it is the highest-leverage thing we can ship. One caveat shapes how it ships: this is an *ambient* trigger ("before editing X, also do Y"), and ambient triggers are the kind skill-description matching fires *least* reliably across runtimes. So the orientation rule's primary carrier is the always-in-context **`AGENTS.md` managed block** (deterministic — it is in context on every run), and the `llp-orient` skill is the elaboration that block routes to for non-trivial work. The skill needs no tooling beyond reading LLP 0000 and following `@ref`s.

There is exactly one thing the harness cannot do, because it has no agent in the loop: gate CI or serve a human who doesn't want to spin up an agent. That non-interactive checker is the **`ref-check` pipeline already planned in [LLP 0000 §6](./0000-linked-literate-programming.explainer.md#6-validation-tooling-planned)** — optional, deferred, and *not* a dependency of any skill (see [The one non-interactive carve-out](#the-one-non-interactive-carve-out)). Until it exists, every guarantee in this RFC is interactive; the RFC is explicit about what that does and doesn't buy.

## Motivation

LLP is meant to be maintained by agents and humans together. The guides (LLP 0001, 0002, 0005) already describe the workflows. What a skill adds over "the agent reads the guide" is three things the guide can't supply on its own:

1. **A trigger** — the agent reliably knows *when* to run the workflow, not just how.
2. **Deterministic execution** — the mechanical steps run through the harness's exact tools under a fixed recipe instead of being improvised.
3. **Enforced gates** — human sign-off and provenance rules are built into the workflow rather than relying on the agent to remember them.

Two failure modes shape the architecture:

**Mechanical tasks reasoned about by an LLM are fragile.** Asking a model to *compute in its head* the next LLP number, format `NNNN-slug.type.md`, parse a metadata header, or judge whether an `@ref` anchor exists produces occasional silent errors. The fix is to make the skill **run the exact tool** instead of reasoning — but be precise about what that buys. A tool use has two parts: the *scan* (glob/grep/read, which is exact) and the *reduction* of its output to an answer (filter, dedupe, exclude, take-max). A bespoke CLI does the reduction in code; a skill that says "glob, then take the max" does the reduction in the LLM. So "run the tool" only removes the model from the loop when the reduction is *also* pushed into the tool — i.e. when a single pipeline's stdout **is** the answer (`ls llp | grep -oE '^[0-9]{4}' | sort -n | tail -1`), so the model copies a result rather than recomputing it. Where the answer genuinely can't be one pipeline's output (does this anchor exist somewhere in the target tree?), the agent runs the primitive and the residual judgment is *backstopped* — by the negative-fixture suite and the optional `ref-check` gate — not eliminated. This is still the right trade against a bespoke binary (no language/packaging/versioning/skew cost — see [Alternatives](#alternatives-considered)), but it is determinism via *pipelines whose output is the answer*, not via "the harness magically can't be wrong." Per [LLP 0004](./0004-design-principles.principles.md) ("composable pipelines over monolithic tools"), the stages stay small and composable — they just compose out of harness tools and shell pipelines rather than CLI subcommands.

**Workflows re-derived each run drift.** Without distributed skills, every agent rediscovers the process from the docs and small variations accumulate: inconsistent scaffolding, shallow retrofits that invent rationale, missing review artifacts, docs that fall out of sync with code. A skill pins the recipe.

This RFC consolidates an existing first-cut skill set rather than starting from scratch. The legacy `rfc/SKILL.md` (Exact's RFC process — statuses LLP doesn't have like `Implemented`/`Shelved`/`Withdrawn`, paths that don't exist here like `rfcs/` and `notes-archive/ai-reviews/`) has been removed. A first implementation of **seven** skills then landed — `llp-init`, `llp-init-retrofit`, `llp-create`, `llp-list`, `llp-review`, `ref-check`, `ref-story` — covering authoring and validation but missing the consumption (orient) and upkeep (maintain) halves of the loop, splitting setup into two skills, and miscategorizing the deterministic reference tooling as skills. This RFC reorganizes those seven into the five-skill architecture below; the [Addendum](#addendum-2026-06-09-consolidation-landed) records the mapping and current state.

## Non-goals

- **Not auto-accepting or auto-promoting documents.** Transitions to `Accepted`/`Active` are proposed, never applied unilaterally (LLP 0005 §4–5: the author iterates and accepts).
- **Not bulk or mechanical annotation.** `@ref` proposals are specific, justified, and applied only after approval (LLP 0004, "accuracy over coverage").
- **Not running review unprompted, and never recording a review that didn't happen.**
- **Not auto-committing or making sweeping edits.** Any skill that touches many files emits a reviewable diff or checklist.
- **Not replacing the guides.** Skills point at LLP 0001/0002/0005; they don't restate them.
- **Not shipping a bespoke `llp` CLI.** Determinism comes from the harness's own tools and shell pipelines, not a new binary to build, package, version, install, and keep in sync with the skills (see [Alternatives](#alternatives-considered)).
- **Skills-only bootstrap.** Bootstrap moves into a skill too. `llp-adopt` scaffolds `llp/` and LLP 0000 through the harness (its `scaffold` mode), following the managed-block and never-overwrite discipline described in [Bootstrap](#bootstrap).
- **Not building the non-interactive CI checker here.** The `ref-check` pipeline (LLP 0000 §6) remains optional and deferred; the skills do not depend on it.
- **Not introducing a new project config format here.** A machine-readable `llp.json` is attractive but deferred (Open Questions).

## Design principles

1. **Deterministic via the harness, cognitive in skills.** If a task is solvable by a glob, grep, file read, or a shell pipeline whose output is the answer, the skill *runs that* — it does not reason about the answer, and it does not shell out to a bespoke CLI. Skills reason about meaning; they call exact tools for facts.
2. **Skills encode workflow, not policy.** A skill summarizes its steps and points to the governing LLP (`llp-review` → LLP 0005). The doc stays authoritative; the skill carries `@ref`s to it so drift is detectable (see Distribution).
3. **Human gates on anything inferred or irreversible.** Recovered rationale, status promotions, retirements, and mass edits are *proposed* for sign-off — LLP 0002's hard-won lesson and LLP 0004's co-evolution rule applied to agents.
4. **Few skills, clear primary triggers.** Five skills, each with a distinct *primary* trigger — not one mega-skill, not fourteen fragments. Two are deliberately multi-mode rather than multiplied into separate skills: `llp-adopt` (scaffold · retrofit — the single way to bring LLP to *any* repo) and `llp-maintain` (pull · pre-PR · audit · retire); their modes are enumerated, not amorphous (see [`llp-adopt` modes](#llp-adopt-modes), [`llp-maintain` modes](#llp-maintain-modes)). `llp-orient`'s trigger is *ambient* ("before editing X"), so its primary carrier is the always-in-context `AGENTS.md` rule, not skill-description auto-fire (see [Distribution](#distribution)). Whether residual trigger overlap warrants a thin router is an open question.

## Architecture

### Harness-native mechanics (the deterministic foundation)

Every agent runtime that can load a skill also exposes file read, glob, and content search; most also expose a shell. Those *are* the deterministic foundation. The skills name the exact recipe for each mechanical task so it is run, not guessed, and so the recipe doesn't drift between skills:

| Mechanical task | Harness recipe (pipeline form preferred) | Residual LLM step |
|---|---|---|
| Next LLP number | `ls llp \| grep -oE '^[0-9]{4}' \| sort -n \| tail -1`, then + 1 | none for flat layouts; nested layouts use the primitive fallback (below) |
| Filename / metadata template | string-format `NNNN-slug.type.md` + the header block | choose slug + type (cognitive, by design) |
| List / group docs | `Grep` metadata headers across `llp/` by `Status`/`Systems`/`Type` | none |
| Find `@ref`s in scope | `Grep '@ref'` over the changed/target files (`git diff --name-only` for change scope) | none |
| Resolve an `@ref` | `Read` the target doc; confirm the `#anchor` heading exists | match anchor ↔ heading text |
| Filename ↔ `Type` agreement | compare the `.type.md` extension to the `**Type:**` field | none |

**Pipeline form vs. primitive fallback.** The recipe column gives the *pipeline form*: a single shell pipeline whose stdout is the answer, so the model copies a result rather than computing one. Two cases need a *primitive fallback*: (1) runtimes that expose file-read/glob/grep but no shell, and (2) nested or alias-heavy `llp/` layouts where the next-number pipeline's flat listing is insufficient — there the agent runs a recursive `Glob llp/**/*.md`, keeps basenames matching `NNNN-*.md` with LLP metadata, excludes `llp/reviews/**`, dedupes symlink aliases, and takes max + 1. The fallback's reduction is the residual LLM step; it is backstopped by the negative-fixture suite and the optional `ref-check` gate, not eliminated. That is the precise content of "skills orchestrate; the harness computes": the harness computes wherever a pipeline can express the answer; the residual cognition is small, named, and tested. (Review artifacts under `llp/reviews/` are zero-padded too, so they would match `NNNN-*`; a top-level listing already excludes them, and the recursive fallback excludes them explicitly.)

**Determinism vs. portability.** The pipeline form is the most deterministic, but `Bash`/shell is the least portable harness primitive — hence the primitive fallback above for shell-less runtimes. Recipes are written in a reference tool vocabulary (`Glob`/`Grep`/`Read`/`Edit`/shell); each runtime maps these to its own tool names — the same per-runtime adapter problem as the install table in [Distribution](#distribution). "Tool-neutral markdown" means neutral in *intent*, with a per-runtime adapter for tool *names*.

**One canonical definition, referenced location-independently.** These recipes have a single home — a numbered section of the spec corpus (this RFC's mechanics section, or the companion guide if [Open question 7](#open-questions) splits it) — and the five skills point at it through the **`llp-spec:` namespace** (`@ref llp-spec:0008#next-llp-number`, …), never a loose repo-relative path. This matters because a skill is *copied into a runtime's skill directory* at install (see [Distribution](#distribution)); a repo-relative path like `skills/llp-mechanics.md` would not resolve from there, whereas `llp-spec:NNNN#anchor` resolves against the vendored `llp-spec/` snapshot wherever the skill lands. Giving each recipe a stable per-recipe anchor (`#next-llp-number`, `#find-refs-in-scope`, …) is a deliverable: the recipes get a heading apiece when this section is finalized (or when [Open question 7](#open-questions) moves them to the companion guide). Until then the section anchor above is the resolvable target, and the worked examples below cite the per-recipe anchors as the intended end state.

This is deliberately the *interactive* path: an agent is present, so the agent runs the tools. The same logic, run with no agent (CI, a git hook, a human who won't open an agent), needs a real program — see the carve-out below.

### The one non-interactive carve-out

The harness only exists when an agent is in the loop. Two consumers live outside it:

1. **CI / git-hooks** — a merge-blocking check can't be "the agent looks at it"; there's no agent in CI.
2. **Humans who want a quick mechanical lint** without starting an agent session.

Both collapse to the same need: one small, deterministic checker. That checker already has a home — the **`ref-check` validation pipeline planned in [LLP 0000 §6](./0000-linked-literate-programming.explainer.md#6-validation-tooling-planned)** (extract · resolve · index · annotate), with its severity model (broken = error, orphaned = warning, coverage = info). This RFC makes three claims about it and otherwise leaves it to LLP 0000:

- **It is optional and deferred.** Nothing in this RFC builds it. The everyday case is covered by `llp-maintain --intent pre-pr` (the agent runs the same checks via the harness before a PR).
- **No skill depends on it.** Skills orchestrate the harness directly. If `ref-check` is never built, every skill still works.
- **If a project wants a CI gate, that is where it goes.** A thin `ref-check`/CI action that exits non-zero on broken refs or provenance violations — not a multi-command product the skills call.

**What this means at ship time.** Until `ref-check` exists, *all* enforcement in this proposal is interactive: the agent runs the checks through the harness and a human reviews the result. There is no non-interactive, merge-blocking gate in the shipped scope, and the mechanical guarantees (anchor resolution, `[inferred]`-not-in-`Accepted`, Evidence resolves, review well-formedness, `llp_spec` equality) are therefore *advisory* — exercised against the fixture suite in this repo's CI, but not enforced in a consuming project until it adopts the gate. That is a deliberate trade: the everyday case has an agent in the loop, so the interactive path covers it. But this RFC should not be read as shipping a deterministic guarantee it doesn't yet have (see [Open questions](#open-questions) #1).

Because the skills no longer try to absorb this pipeline, the corpus keeps the name `ref-check` (LLP 0000 §6, README, LLP 0001/0002/0006) — there is no rename and no new CLI surface.

### The five cognitive skills

Every shipped skill follows one **Skill Contract** — six fields: *Trigger · Cognitive work · Harness recipe · Human gate · Governing LLP · Failure modes*. The table below summarizes the first five across all five skills (plus rollout Phase); **Failure modes** are skill-specific and live in each `SKILL.md` (shown in the worked examples).

| Skill | Phase | Primary trigger | Cognitive work | Harness recipe (from the mechanics recipes) | Human gate / artifact | Governing LLP |
|---|---|---|---|---|---|---|
| **`llp-orient`** | 1 | before touching a subsystem/file or task — *carried by the `AGENTS.md` rule, not ambient skill-fire* | Find governing LLPs, follow `Related` + nearby `@ref`, produce a compact context pack of active constraints + open questions | `Grep '@ref'` over scope → `Read` targets; `Grep` headers to list LLPs by system | read-only; emits a context pack | LLP 0000 |
| **`llp-create`** | 1 | "write a new LLP / capture this decision" — *corpus already exists* | Pick type, draft type-appropriate sections from the conversation | `Glob` for next number; `Grep` `Related:`/`Systems:` for a covering doc first; hand off to `llp-adopt` if there is no corpus | starts `Draft`; prefers updating an existing LLP | LLP 0000 types, 0001 |
| **`llp-review`** | 1 | "review this RFC/Spec/Plan", or a doc enters `Review` | Run the LLP 0005 loop, summarize reviewer concerns, help revise | `Grep` to locate the doc and existing review artifacts | never auto-accepts; artifacts → `llp/reviews/` | LLP 0005 |
| **`llp-adopt`** | 1 (`scaffold`) · 2 (`retrofit`) | "set up / bring LLP to this repo" — greenfield *or* brownfield, one entry point | `scaffold`: none; `retrofit`: comprehend the codebase, draft LLP 0000 + subsystem docs, migrate legacy docs, propose module-level `@ref`s | `scaffold`: `Write` `llp/` + LLP 0000 + managed blocks; `retrofit`: + `Grep`/`Read` to build the `@ref` index | `scaffold`: skeleton + managed blocks only; `retrofit`: generated docs stay `Draft` with provenance markers; annotations propose-then-apply | LLP 0001 (greenfield), 0002, 0006 |
| **`llp-maintain`** | 3 | git pull · pre-PR · audit · "this doc looks stale" | Detect drift across a scope, draft reconciliation, propose status changes, repair refs | `Grep '@ref'` + `Read` targets to resolve; `Grep` provenance markers; diff via `git` | emits a co-evolution checklist; status changes proposed, not applied | LLP 0004, 0000 §6 |

**Hand-offs:** `llp-adopt` → `llp-orient` (once a corpus exists) and → `llp-review` (to ratify generated docs); `llp-orient` → `llp-create`/`llp-review` (if the task needs new design); `llp-create` → `llp-adopt` (when there is no corpus yet to add the doc to); `llp-maintain` → `llp-review` (when reconciliation is real design change, not a doc repair).

`llp-create`'s "prefer updating an existing LLP" is backed by a recipe, not purely cognitive: it first `Grep`s `Systems:`/`Related:` across `llp/` for a covering doc before scaffolding a new one.

**Deliberately folded in, not separate skills:** *greenfield bootstrap* (`llp-adopt`'s `scaffold` mode, not a separate skill — see [`llp-adopt` modes](#llp-adopt-modes)); *implement* (an accepted LLP is realized by `llp-orient` + normal coding + the annotation flow + `llp-maintain`'s PR check); *list/audit* (harness greps, or `llp-maintain audit`); *retire* (an `llp-maintain` proposal); *migrate-docs* (an `llp-adopt` retrofit step); *annotate* (a shared propose→approve→apply flow used by adopt and maintain); *skill-maintainer* (replaced by `@ref`-validated skills — see Distribution).

### `llp-adopt` modes

Greenfield and brownfield are not two skills — they are two ends of one spectrum: how much design knowledge already exists to mine. `llp-adopt` is one skill that *detects* where on that spectrum a repo sits and picks a mode; the human can force either. This is the single answer to "add LLP to this project," so neither the user nor the agent has to choose between a greenfield path and a brownfield path.

| Mode | When | Inputs | Output artifact | Applies changes? |
|---|---|---|---|---|
| `scaffold` | empty / minimal repo (no corpus, little code to mine) | repo root | `llp/`, an LLP 0000 skeleton, the `AGENTS.md` managed blocks | yes — but only new files / managed blocks, never user prose |
| `retrofit` | substantial existing codebase | the codebase + any legacy docs | LLP 0000 + ≥1 subsystem docs (all `Draft`, provenance-tagged), migrated legacy docs, proposed module `@ref`s | drafts only; every inferred claim and every annotation is propose-then-ratify |

`scaffold` is trivial and ships in Phase 1 alongside `llp-create`; `retrofit` is the heavy comprehension flow and ships in Phase 2. The two share one setup spine — create `llp/`, write LLP 0000, write the managed blocks, never overwrite user prose, idempotent reruns — and `retrofit` is `scaffold` plus comprehension, drafting, migration, and annotation. This is the same one-skill-many-modes shape as [`llp-maintain`](#llp-maintain-modes), and it is why there is **one** way to bring LLP to a project.

### `llp-maintain` modes

`llp-maintain` is one skill with four explicit modes. Each names its inputs and its artifact so the engine is auditable, not a catch-all:

| Intent | Default scope | Inputs | Output artifact | Applies changes? |
|---|---|---|---|---|
| `audit` | corpus | all of `llp/` + the codebase | findings list: drift, broken refs, stale statuses | no |
| `reconcile` | range / branch | a diff range (a pull, or branch-vs-base) | per-doc reconciliation proposals | no — proposes edits |
| `pre-pr` | working-tree | uncommitted + staged changes | co-evolution checklist + ref/provenance results | no |
| `retire-proposal` | corpus | a named doc | a `Superseded`/`Tombstoned` proposal with rationale | no — human applies |

`scope ∈ {working-tree, branch, range, corpus}` selects what to diff (via `git diff`); `intent` selects the artifact. No mode mutates docs, code, or status without sign-off — that is the line that keeps consolidation from recreating a mega-skill.

## Worked example: `skills/llp-orient/SKILL.md`

The keystone, shown end-to-end so the format is concrete. (The YAML block is the *runtime's* skill format — intentionally distinct from LLP's plain-markdown metadata block; don't normalize it.) Note it needs no `llp` binary — only the harness's own tools.

```markdown
---
name: llp-orient
description: Before editing a subsystem/file or starting a task, assemble the
  governing LLP context. Use whenever a change touches an area that may have
  documented design rationale.
llp_spec: "ccheever/llp@<commit-or-tag>"   # upstream spec this skill targets
---

# llp-orient

<!-- @ref llp-spec:0008#the-five-cognitive-skills — keystone orientation workflow -->
<!-- @ref llp-spec:0000#1-llp-documents — corpus model this reads -->
<!-- @ref llp-spec:0008#find-refs-in-scope — how to grep @refs -->

Assemble a *context pack* before code work. Read-only: never edits code or docs.

## Steps
1. Read the project root LLP (LLP 0000) first.
2. `Grep '@ref'` over the changed/target files (use `git diff --name-only`
   for change scope) — find @refs already on the code in scope, then `Read`
   each target.
3. `Grep` the `Systems:` headers across `llp/` to find LLPs governing the
   subsystem; follow their `@ref`s into the code.
4. Follow `Related:` and nearby @ref targets one hop out.
5. Emit the context pack (schema below).

## Don't
- Don't summarize the whole corpus; scope to the task.
- Don't restate policy — link to it by `LLP NNNN#anchor`.

## Failure modes
- No corpus yet → hand off to `llp-adopt`.
- An @ref target/anchor doesn't resolve → note it and hand off to
  `llp-maintain` rather than guessing the rationale.
```

**Trigger discipline.** The orient-first *rule* lives in the always-in-context `AGENTS.md` managed block (so it doesn't depend on an ambient skill-fire, which is the least reliable trigger path); this `SKILL.md` is the detailed recipe that rule routes to for non-trivial work. The `description`-match auto-fire is a convenience, not the primary path.

### Context pack format

`llp-orient`'s output is structured so fixture tests can check it without grading prose. Required sections:

- **Scope** — the files/subsystems queried.
- **Governing LLPs** — numbered list, one-line gloss each.
- **Active constraints** — bullets, each citing `LLP NNNN#anchor` (Spec/Decision/Principles sections that bind this work).
- **Relevant rationale** — Explainer/RFC sections, same citation form.
- **Open questions / risks** for this area.
- **Likely doc updates** if the change lands.
- **Hand-off** — one of `none | llp-adopt | llp-create | llp-review`.

For runtimes that don't auto-load `SKILL.md`, `AGENTS.md` carries the one-line orient-first rule pointing here (see Distribution).

## Worked example: `llp-review` (the highest-misuse skill)

`llp-review` is the skill most likely to be misused — by fabricating a review that didn't happen. The contract makes the honest path the only path. Compact form:

```markdown
# llp-review
<!-- @ref llp-spec:0005#3-review — the loop this enforces -->

## When it runs
Enforce the loop when the doc is in `Review` or formal review is explicitly
requested. Otherwise offer it; don't impose it (small/codifying RFCs may skip —
llp-spec:0005#when-to-skip-formal-review).

## Steps
1. `Grep` to locate the doc; read it fully.
2. If this session is explicitly acting as one independent model-family reviewer
   (not the authoring session), write that review and count only that family.
3. Ask the human for the author review/decision and any missing model-family
   reviews: pasted manual review, sub-agent on a different family, or CLI runner.
   STOP until they are actually provided; do not mark the loop complete by intent.
4. Write one artifact per model review actually received:
   `llp/reviews/NNNN-slug.model.md`, each
   opening with the provenance header (family · provider · date · redacted? · method).

## Don't
- Don't record a review you weren't given. Don't claim the author review, fresh
  Claude-family review, or non-Claude review is done unless it was actually provided.
- Don't change `**Status:**` or accept/reject — that's the human's call (LLP 0005 §4–5).
```

## Worked example: `llp-maintain --intent pre-pr`

The maintenance engine, made concrete on its most common moment. Everything here runs through the harness's own tools (`git diff`, `Grep`, `Read`) — no `llp` binary:

```
$ invoke llp-maintain (scope: working-tree, intent: pre-pr)
  → git diff --name-only           (what changed)
  → Grep '@ref' over changed files → Read each target, confirm the #anchor
  → Grep claim markers / Evidence pointers in touched docs
  → emit a co-evolution checklist:

  Co-evolution checklist (working tree)
  [ ] LLP 0042 §retry-budget describes a 30s cap; code now uses 60s — update doc or code
  [ ] @ref broken: src/http/retry.ts:42 → LLP 0042#backoff (anchor renamed) — repair ref
  [ ] New file src/http/circuit.ts has no @ref but implements LLP 0042 — consider annotating

  Proposed status changes (NOT applied)
  - LLP 0042 Accepted → Active (implementation appears complete)
```

Status changes and ref repairs are *proposed*; nothing is written without sign-off. (A project that wants this enforced in CI runs the same checks via the `ref-check` pipeline — see [the carve-out](#the-one-non-interactive-carve-out).)

## Spec namespace (`llp-spec:`)

LLP numbers are *project-local*: a consuming project's `LLP 0008` is whatever it numbered 0008, not this specification. A vendored skill that wrote `@ref LLP 0008#…` would resolve against the wrong corpus. Distributed artifacts therefore reference the specification through a distinct, reserved namespace.

This is a **first-class addition to the reference grammar in [LLP 0000 §2](./0000-linked-literate-programming.explainer.md#2-reference-syntax)** — *not* an instance of the LLP 0006 shorthand mechanism, which maps a bare label (`SPEC#anchor`) to a single file path. `llp-spec:NNNN#anchor` is a three-part target (prefix + number + anchor) resolving against a whole pinned corpus. Listing `llp-spec:` as a target form in LLP 0000 §2 is a deliverable; until then this section is its normative definition.

| Item | Specification |
|---|---|
| **Syntax** | `@ref llp-spec:NNNN#anchor [relation] — gloss`. The `:` and embedded zero-padded number distinguish it from a bare `SPEC#anchor` shorthand. |
| **Resolution** | `llp-spec:NNNN` resolves against a pinned copy of *this* specification, never the consuming project's `llp/`. Resolution is a plain file read of `llp-spec/NNNN-*.md` + an anchor check — the same `Grep`/`Read` recipe used for any `@ref`. |
| **Layout** | A vendored snapshot at `llp-spec/` in the repo root (`llp-spec/0000-…md`, …), brought in as a git submodule or a copied snapshot pinned to a commit/tag. |
| **Offline** | Resolution is filesystem-only against `llp-spec/`; no network calls. A pinned URL may be a *source* for vendoring but is never dereferenced at resolve time. |
| **Pinning** | The vendored snapshot records its source (`owner/repo@commit-or-tag`) — the submodule commit, or a `llp-spec/SOURCE` line for a copied snapshot. Each skill's `llp_spec:` frontmatter records the spec version it was authored against. |
| **Skew** | A skill whose `llp_spec` pin does not equal the vendored snapshot's pin is a **finding** `llp-maintain` surfaces (and the optional `ref-check` gate can flag). Equality is the only check always decidable: "ahead vs. behind" needs commit-ancestry, which requires the spec repo's history — available with a submodule (`git merge-base --is-ancestor`) but **not** with a copied snapshot pinned by a `SOURCE` tag. So the default rule is *mismatch → finding*; direction-based severity (a skill pinned ahead of the snapshot is a hard error) applies only when history is present. No lockfile/digest machinery — the submodule commit (or `SOURCE` line) is the pin. |
| **Shadowing** | `llp-spec` is reserved — it cannot be redefined by a project shorthand. `@ref LLP NNNN` resolves against `llp/` and `@ref llp-spec:NNNN` against `llp-spec/`, so neither corpus can shadow the other. |

## Provenance for generated documents

Retrofit is where agents are most dangerous: they describe *what* code does but invent *why*. Generated content must keep observation and inference visibly separate and stay `Draft` until a human ratifies it. Generated LLPs use three claim markers plus an `## Evidence` section:

```markdown
## Behavior
[observed:retry-backoff] Requests retry with exponential backoff.
[observed:retry-cap] Retries are capped at 30s.

## Rationale
[inferred] Backoff was likely added to survive downstream rate limits.
[confirmed] The 30s cap is required by the upstream SLA — Jane, 2026-03-01.

## Evidence
- [observed:retry-backoff] `src/http/retry.ts` (`retryWithBackoff()`)
- [observed:retry-cap] `src/http/retry.ts` (`RETRY_CAP_MS`)
- [observed:retry-cap] `a1b2c3d`
```

Evidence pointers use a mechanically resolvable target plus, optionally, a human hint in parentheses. The target is one of: a repo path (``src/http/retry.ts``), an `@ref`-style target (``LLP 0042#backoff`` or ``docs/foo.md#bar``), or a commit hash. Symbol names such as `retryWithBackoff()` are hints, not hard validation targets, until a project has symbol-index tooling. The optional claim id (`retry-backoff`) is local to the document; every `[observed:<id>]` claim must have at least one matching `## Evidence` entry with the same id.

**Claim markers.**

| Marker | Meaning | Allowed in `Accepted`/`Active`? | Required companion |
|---|---|---|---|
| `[observed:<id>]` | Behavior evidenced directly in code or tests | yes | a mechanically resolvable `## Evidence` pointer with the same `<id>` |
| `[confirmed]` | Verified by a named human | yes | attribution + date |
| `[inferred]` | Unverified hypothesis about rationale | **no** | must be ratified (→ `[confirmed]`) or removed before promotion |

This per-claim gate complements, rather than duplicates, the document `Status`: `Status` governs the whole document's lifecycle, while the markers let a single `Draft` carry a mix of solid and speculative claims and make promotion mechanically checkable (no `[inferred]` may survive into `Accepted`/`Active`). The cost is one more small format a consuming project must learn; it is opt-in (a document with no markers is unaffected) to keep faith with LLP 0004's "core stays small."

**Enforcement has two layers.** A document is "provenance-tracked" if it contains any claim marker or an `## Evidence` section (so ordinary hand-written docs are unaffected).

The **mechanical layer** is checkable by harness tools or the optional `ref-check` gate:

- **error** on any `[inferred]` marker in an `Accepted` *or* `Active` LLP — because `Accepted` means "approved for implementation" (LLP 0005), and unverified rationale must not reach that bar;
- **error** on an `[observed:<id>]` claim missing a matching `## Evidence` entry, or whose matching Evidence target does not resolve to a repo path, `@ref` target, or commit;
- **error** on a `[confirmed]` claim missing attribution or date;
- **warn** on an `[observed:<id>]` claim with only a file-level target and no symbol/human hint, because the evidence may be too coarse.

The **cognitive layer** is review guidance, not a merge-blocking deterministic check: `llp-adopt` and `llp-maintain` may flag likely untagged declarative claims in generated `Draft` docs and ask the author to mark them `[observed:<id>]`, `[confirmed]`, or `[inferred]`. CI must not pretend it can infer untagged rationale reliably.

Who runs it: interactively, `llp-adopt` and `llp-maintain` apply the mechanical layer with harness greps (`Grep` for markers, `Read`/git commands to confirm Evidence targets resolve) and surface cognitive-layer concerns as proposals. Non-interactively, the optional `ref-check` gate enforces only the mechanical layer in CI.

## Multi-model review protocol

[LLP 0005](./0005-rfc-process.guide.md) reserves multi-model review for documents that warrant it: an RFC in `Review`, and `Spec`/`Plan` documents at the author's discretion — small or codifying RFCs may skip it ([LLP 0005 §"When to skip"](./0005-rfc-process.guide.md#when-to-skip-formal-review)). So `llp-review` **enforces the loop when a document is in `Review` or formal review is explicitly requested**, and otherwise offers it rather than imposing it. A single agent session cannot honestly supply ≥2 model families plus the author, and `llp-review` must not pretend otherwise. Its contract:

- **It orchestrates; it does not fabricate.** It prepares the [standard review prompt](./0005-rfc-process.guide.md#3-review) and the document, then uses whichever path the environment supports:
  1. Human pastes into another model manually.
  2. A sub-agent/task on a *different* model family, where the runtime offers one.
  3. A CLI model runner in CI.
- **Guardrails (preserved from the old skill):** never record a review that didn't occur; never claim the author review, fresh Claude-family review, or non-Claude review is done unless it was actually provided; never accept or reject on the author's behalf.
- **Privacy.** Sending code or docs to an external provider is never automatic — it requires an explicit human action. Default redaction rules until a project defines its own: no secrets or credentials; respect proprietary-code constraints; prefer a local runner for sensitive material. (Where project-specific redaction rules should live — likely `llp.json` — is an open question.)
- **Model names are not pinned.** Per LLP 0005, the requirement is cognitive diversity across *families*, not specific version IDs — which is why we do not hardcode model IDs in config.
- **Artifacts.** `llp/reviews/NNNN-slug.model.md`, one file per reviewer (the [LLP 0005](./0005-rfc-process.guide.md#review-artifacts) convention — `model` is the family, e.g. `…​.gpt.md`). Each opens with a short **provenance header**: reviewer family, provider/runtime, date, redaction flag, and method (`manual` | `sub-agent` | `cli-runner`).

**What the header gives you is auditable self-attestation, not proof.** The structural facts are mechanically checkable (interactively by `llp-review` via `Grep`/`Read`, or in CI by the `ref-check` gate): the artifact exists and is well-formed; the header fields are present; the non-author reviewing families are distinct and number ≥2; and, when method is `cli-runner`, that a referenced transcript or hash resolves. None of that can verify that a `manual` external review actually occurred — that rests on the human's attestation. Concretely: the mechanical layer can reject a *malformed* artifact (missing fields, fewer than two distinct families) but cannot detect a *fabricated* one whose fields are all present; that gap is closed only by `llp-review` refusing to record a review it wasn't given (a behavioral guarantee, testable with mock model adapters, not by inspecting artifacts). This header *extends* LLP 0005's artifact convention (which currently says these files carry no metadata header); it is lightweight provenance, not an LLP metadata block, and LLP 0005 is updated to note it.

## Distribution

The point is that *other* projects use these. With no CLI, distribution is just files.

**Source of truth:** `skills/llp-*/SKILL.md` in the LLP repo (tool-neutral markdown), plus the shared mechanics recipes, which live in the spec corpus and are referenced via the `llp-spec:` namespace (not a loose file). A bare `skills/` directory is inert; nothing auto-loads it.

**Install = copy the markdown into the runtime's skill directory.** Runtime skill locations change, so the table below is an adapter reference (per-runtime, dated, verify at use) for *where the files go*, not a command:

| Runtime | Skill directory | Source (per runtime docs; verify) |
|---|---|---|
| Claude Code | project `.claude/skills/<name>/`, user `~/.claude/skills/<name>/`, plugin `skills/` | code.claude.com/docs/en/skills |
| Cursor | `.cursor/skills/<name>/` and `.agents/skills/<name>/` | cursor.com/docs/skills |
| Codex | `$CODEX_HOME/skills/<name>/` | Codex skills docs |
| No skills mechanism | `AGENTS.md` routing block (below) | — |

You get the skills into a runtime in two phases:

1. **Cold start: manual or preinstalled copy.** A human copies `skills/llp-*/` into a runtime skill dir (or uses a globally preinstalled copy). This is the only bootstrap path that assumes no LLP skill is already available.
2. **Project adoption: `llp-adopt` vendors local copies.** Once a runtime can load `llp-adopt`, asking an agent to "bring LLP to this repo" writes project-local skill files, vendors `llp-spec/`, and inserts the routing block through the harness's `Write`/`Edit` tools. `llp-adopt` is not the cold-start installer; it automates project-local setup after the skill is available.

**The `AGENTS.md` routing block.** A separate managed region from any scaffolding guidance block. It carries the orient-first rule deliberately, *here* rather than relying on the `llp-orient` skill to auto-fire on an ambient trigger — this block is in context on every run, so the rule is reliable where a skill-description match would not be. `llp-adopt` (or a human) writes and updates *only* this block, never other managed blocks or user prose:

```markdown
<!-- BEGIN LLP SKILLS MANAGED BLOCK -->
Before editing a subsystem with documented design, orient first (read its
governing LLP; for non-trivial work invoke `llp-orient`).

Skills: orient = context before coding · create = author one LLP · review = LLP 0005 loop
        · adopt = set up LLP in any repo (scaffold or retrofit) · maintain = drift / PR / pull / retire checks
<!-- END LLP SKILLS MANAGED BLOCK -->
```

**Security & trust.** Skills are still code distribution — a `SKILL.md` can carry executable scripts and request tool permissions — so whoever installs them (the human directly, or `llp-adopt` on their behalf):

- **Confirms before writing user/global dirs.** Project-local copies (`.claude/skills/`) may proceed; writing `~/.claude/skills/` requires explicit confirmation.
- **Preserves existing files.** Never overwrites a skill it didn't write; on conflict it shows a diff and asks.
- **Prefers copies over symlinks** for vendored skills; symlinks are opt-in for local skill development only.

**Keeping shipped skills honest (this replaces `llp-skill-maintainer`):** every `SKILL.md` carries (a) `@ref llp-spec:NNNN#section` annotations to the spec sections it depends on, validated like any other `@ref`, and (b) an `llp_spec` pin (the upstream commit/tag it was authored against). The [Spec-namespace skew rule](#spec-namespace-llp-spec) makes a mismatched pin an `llp-maintain` finding (and an optional `ref-check` gate finding). The skills become the first real consumer of `@ref` outside examples — dogfooding, with version skew solved by LLP's own mechanism rather than a `min_cli` contract.

**Skill `@ref` extraction.** Because skills dogfood `@ref`, the `@ref` scan covers `skills/**/SKILL.md` (and installed skill dirs) in addition to source files. Skill references use markdown HTML-comment form: `<!-- @ref llp-spec:NNNN#anchor — gloss -->` for spec-corpus sections (including the shared mechanics recipes, e.g. `<!-- @ref llp-spec:0008#find-refs-in-scope — gloss -->`). Attachment mirrors code: a `@ref` in the header/intro block attaches to the whole skill; a `@ref` immediately above a numbered step attaches to that step. (Interactively the maintain skill greps these; the optional `ref-check` gate scans them too.)

**Responsibility boundary.** Upstream (this repo) validates the *source* skills under `skills/`. A consuming project validates the *installed* skills and `llp-spec/`. Either side can notice drift on its own, with the harness interactively or the optional gate in CI.

## Golden paths

- **Greenfield:** make `llp-adopt` available by manual/preinstalled copy → `llp-adopt` (detects an empty repo → `scaffold` mode) scaffolds `llp/` + LLP 0000 → `llp-create` drafts the first real decisions → write code with `@ref`s → `llp-review` on anything proposal-shaped.
- **Retrofit:** make `llp-adopt` available by manual/preinstalled copy → `llp-adopt` (detects existing code → `retrofit` mode): comprehend → draft LLP 0000 + top subsystems + migrate legacy docs + propose module `@ref`s, all `Draft` + provenance markers; optionally vendor project-local skill copies → human ratifies → `llp-review` where warranted → `llp-maintain` ongoing.
- **Daily development:** `llp-orient` before the change → code + `@ref` → `llp-maintain --intent pre-pr` (co-evolution checklist) → `llp-review` if the change is new design.

## Bootstrap

Bootstrap is a skill too — specifically `llp-adopt`'s `scaffold` mode (greenfield) and `retrofit` mode (existing repo), which create `llp/` and LLP 0000 directly through the harness's `Write` tools. `llp-create` then drafts real content into the scaffolded corpus. There is one entry point for "add LLP to this project" (`llp-adopt`), not a greenfield/brownfield fork the agent has to choose between.

The scaffolding mode follows four rules: explicit managed blocks for generated instructions, never overwriting user prose outside those blocks, idempotent reruns, and conservative `AGENTS.md` / `CLAUDE.md` symlink handling. The scaffolding block markers are:

```markdown
<!-- BEGIN LLP SCAFFOLD MANAGED BLOCK -->
...
<!-- END LLP SCAFFOLD MANAGED BLOCK -->
```

Two managed blocks can coexist in `AGENTS.md` — the SCAFFOLD block and the SKILLS routing block (above) — both written by skills, each replacing only its own block.

> *Skills-only is a deliberate choice, and reversible.* If an agent-less, zero-token cold start turns out to matter, a future RFC can introduce a small non-interactive bootstrapper. Nothing here forecloses that.

## Implementation plan (phased rollout)

Each phase is "done" only when it passes against fixture repos checked into this repo (`fixtures/greenfield/`, `fixtures/established/`) with expected-output diffs — the regression harness that keeps the skills from rotting as the spec evolves. A **negative-fixtures** suite asserts the failure paths too: a broken anchor, a skill `llp_spec` that mismatches the vendored snapshot, a *malformed* review artifact (missing provenance fields, or fewer than two distinct non-author families), an `[inferred]` marker in an `Accepted`/`Active` LLP, an `[observed:<id>]` claim without matching Evidence, and a filename↔`Type` mismatch must each be caught, not passed. (Note the limit: the malformed-artifact fixture tests *well-formedness*, not *authenticity* — a fabricated-but-well-formed review cannot be caught by inspecting artifacts; that path is covered only by `llp-review`'s refuse-by-default behavior, tested with mock model adapters.)

**Test layers.** Skill behavior is non-deterministic, so phases gate on the deterministic layers and use mocks for the rest. No phase blocks on grading LLM writing quality:

| Layer | What's tested | Deterministic? |
|---|---|---|
| Mechanics recipes | next-number / filename / ref-resolve recipes give the right answer on fixtures | yes — golden output |
| Skill artifacts | filenames, headers, markers, hand-off messages | mostly — structural checks |
| Skill prose | context-pack quality, drafted LLP content | no — mock model adapters + human review |

**Phase 1 — consolidate the first-cut skills, dogfood in this repo.** The shared mechanics recipes + `llp-orient`, `llp-create`, `llp-review`, and `llp-adopt`'s `scaffold` mode; the `llp_spec` pin convention. (The five core `SKILL.md` files now exist in `skills/`; see the [Addendum](#addendum-2026-06-09-consolidation-landed).)
*Done when:* in `fixtures/greenfield`, `llp-adopt --mode scaffold` writes `llp/` + an LLP 0000 skeleton + both managed blocks idempotently; `llp-create` produces a valid `NNNN-slug.type.md` in that corpus whose filename↔`Type` and metadata check out; `llp-review`, given canned reviewer responses (mock model adapters), files correctly-named artifacts **and refuses to record a review it wasn't given** (the only authenticity test; artifact inspection only tests well-formedness); `llp-orient` returns a context pack (schema above) citing the right spec sections, resolving `@ref`s by reading the targets; the standing token cost of the always-loaded skill descriptions + routing block is measured (Open question 6); the legacy `rfc/SKILL.md` is gone and the seven first-cut skills are consolidated into the five core skills plus the `llp-list` utility and the experimental `ref-story`.

**Phase 1.5 — installable elsewhere.** The `llp-spec/` vendoring convention (submodule or pinned snapshot) + the skew (equality) check; `llp-adopt`'s install step (copy skills, vendor spec, write the SKILLS block); the adapter-table locations confirmed per runtime.
*Done when:* installing into a fixture consumer (manual/preinstalled cold start, then project-local vendoring via `llp-adopt`) places skills in the right runtime dir, vendors `llp-spec/`, writes only the SKILLS managed block (leaving an existing SCAFFOLD block intact), and a skill `llp_spec` that mismatches the snapshot is flagged.

**Phase 2 — adoption.** `llp-adopt`'s `retrofit` mode (comprehension + drafting); provenance enforcement as an interactive rule.
*Done when:* against `fixtures/established`, `llp-adopt --mode retrofit` drafts LLP 0000 + ≥2 subsystem docs, every inferred claim is tagged, every observed claim is evidenced, and no generated doc is `Accepted`/`Active`.

**Phase 3 — keep projects healthy.** `llp-maintain` (audit / reconcile / pre-pr / retire-proposal). The optional `ref-check` CI/git-hook gate (LLP 0000 §6) may land here for projects that want non-interactive enforcement, but is not required for the skills to be "done."
*Done when:* a seeded code/doc divergence in a fixture yields a correct co-evolution checklist with proposed (not applied) status changes.

## Alternatives considered

- **A dedicated `llp` CLI (the prior draft of this RFC).** Rejected. The CLI was meant to be the deterministic foundation, but that foundation already exists in every agent runtime as `Glob`/`Grep`/`Read` plus shell pipelines — a pipeline whose stdout is the answer is exactly as exact as a bespoke binary. A separate CLI duplicated that layer and added real cost: an unresolved language/packaging decision, a per-platform install, a versioning contract (`min_cli`), a lockfile + digest, and a standing skill↔CLI skew problem — machinery that existed mostly to keep the binary in sync with the skills. Deleting the CLI removes all of it. The one genuinely non-interactive need (CI gating) is served by the already-planned `ref-check` pipeline (LLP 0000 §6), which the skills don't depend on. The honest residue: the no-CLI choice means there is no non-interactive guarantee until `ref-check` exists (see [the carve-out](#the-one-non-interactive-carve-out)).
- **Naive "skills only," reasoning about mechanical work (an earlier status quo).** Rejected — and this is the trap the CLI was over-correcting for. Asking the model to *compute* the next number or *judge* an anchor in its head is fragile. The fix is not a CLI; it is to make the skill **run a pipeline whose output is the answer** (or, where it can't, run the primitive and backstop the small residual with fixtures + the gate). "Skills orchestrate; the harness computes" is the chosen design precisely because it gets most of the determinism without the binary.
- **The init-script approach (LLP 0007, now removed).** Rejected and deleted. A standalone bootstrap script was a fourth distribution artifact to maintain, separate from the skills, doing what `llp-adopt`'s `scaffold` mode now does through the harness. Folding it in keeps one entry point and no scripts.
- **Fourteen fine-grained skills (an even earlier draft).** Rejected: trigger ambiguity, token bloat, and a maintenance surface that needed a skill to maintain skills.
- **One mega-skill / router.** Rejected for trigger clarity, but a thin `llp` index/router skill remains a possible later convenience (Open Questions).
- **Reference skills globally instead of vendoring.** Rejected: project-specific conventions need local copies; staleness is managed with `@ref` validation + the pinned `llp-spec/` snapshot instead.
- **An MCP server for the mechanical pipeline.** Deferred, not rejected. LLP 0003's prior-art survey notes an MCP server as a delivery vehicle for the `ref-check` pipeline, and some runtimes may prefer MCP tools over harness file ops. The harness tools are the portable baseline; an MCP wrapper over the *same* `ref-check` pipeline is a possible later adapter for the non-interactive checker (Open Questions).
- **`llp.json` taxonomy/config baked in now.** Deferred. Configuring `allowed_systems` is appealing, but a new config format is its own decision, and pinning review model IDs in config contradicts LLP 0005.

## Open questions

1. **The optional `ref-check` gate — and the only path to a non-interactive guarantee.** Should this RFC's rollout include building the non-interactive checker (LLP 0000 §6) for CI, or leave it entirely to LLP 0000? This is more than a convenience: until it exists, every mechanical check is advisory (see [the carve-out](#the-one-non-interactive-carve-out)). Recommended default for projects that adopt it: broken refs and mechanical provenance/validation violations are **merge-blocking errors**, orphaned refs are **warnings**, coverage is **info**. Open on whether/when LLP ships it.
2. **`llp.json`.** Worth introducing? Strong candidates: `allowed_systems`, `docs_dir`, per-repo CI severity overrides, and project redaction rules for review. Review config should name *families*, never version-pinned model IDs.
3. **Vendoring `llp-spec/`: submodule vs. copied snapshot.** A git submodule pins cleanly and makes ancestry (hence ahead/behind skew) decidable but adds submodule friction; a copied snapshot with a `SOURCE` line is simpler but drifts more silently and supports only equality skew. Which is the default `llp-adopt` uses?
4. **Will skills-only hold for non-interactive setup?** Manual copy + `llp-adopt` cover install, and `llp-maintain --intent pre-pr` covers checks — all interactive. The open bet is whether an agent-less path (a CI gate, a `curl | sh` cold start with no model available) ever becomes load-bearing enough to reintroduce a small script. Deferred by choice; revisit with real usage. This is the explicit "change later" lever for the no-scripts decision.
5. **Router skill / residual trigger overlap.** With the orient-first rule moved to the always-in-context `AGENTS.md` block (not relying on ambient skill-fire), the main residual overlaps are `llp-maintain --intent pre-pr` vs. a final `llp-orient`, and `llp-create` vs. `llp-adopt` on a near-empty repo (mitigated: `llp-create` hands off to `llp-adopt --mode scaffold` when there's no corpus). If these still mis-fire in practice, add a thin `llp` dispatcher — or not.
6. **Token footprint — a named adoption risk, not a footnote.** Five always-loaded skill descriptions plus the routing block have a standing cost — the very thing the ETH AGENTS.md study cited in LLP 0000 measured (14–22% for verbose context). It also cuts against LLP's own "pointers, not prose" premise, since `llp-orient` plus the ambient rule push "assemble context up front." Phase 1 measures the standing cost; the ambient-orientation rule must earn its tokens, and descriptions get trimmed accordingly.
7. **Splitting the doc — and extracting two independent specs.** If the worked examples and Skill Contract grow, move the per-skill `SKILL.md` templates (and the shared mechanics recipes) into a companion guide (`0009-agent-skill-contract.guide.md`). More consequentially, two pieces of this RFC are independently reviewable specs that should become their own LLPs *at acceptance*, so the five-skill architecture can be accepted atomically without ratifying them: (a) the `llp-spec:` reference grammar (a normative addition to LLP 0000 §2), and (b) the provenance claim-marker taxonomy (`[observed]`/`[inferred]`/`[confirmed]` + `## Evidence`). Each can be reworked without touching the architecture. Recommended: keep them inline while in `Review` so the design reads in one place; extract both when 0008 moves to `Accepted`.

## Addendum (2026-06-09): Consolidation landed

A first-cut implementation of seven skills had landed in `skills/` in parallel with this RFC. Those seven were reorganized into the architecture above. This addendum records the mapping and the current state; it does not change the design.

**Skill mapping (7 → 5 core + 2 secondary):**

| First-cut skill(s) | Becomes | Notes |
|---|---|---|
| `llp-init` + `llp-init-retrofit` | **`llp-adopt`** (core) | Unified; `scaffold`/`retrofit` modes auto-detected. The old `llp-init` already detected "substantial code" and bounced to retrofit — that detection is the mode-select. |
| `llp-create` | **`llp-create`** (core) | Kept; type naming fixed (`principles`); "prefer updating an existing LLP" added. |
| `llp-review` | **`llp-review`** (core) | Realigned to LLP 0005: multi-model loop, `llp/reviews/` path (was the stale `notes-archive/`), provenance header, refuse-by-default. |
| — (new) | **`llp-orient`** (core) | The keystone. The first cut had no consumption-side skill at all. |
| `ref-check` (interactive part) | **`llp-maintain`** (core) | New skill; absorbs interactive `@ref` validation plus drift/provenance/status checks across four modes. |
| `llp-list` | `llp-list` (utility) | Kept as a read-only utility, not a core workflow. |
| `ref-story` | `ref-story` (experimental) | Kept but marked experimental; canonical form is the LLP 0000 §7 generated view, not an LLM skill. |
| `ref-check` (deterministic part) | — (not a skill) | A `SKILL.md` can't be a CI gate with exit codes; the deterministic checker is the LLP 0000 §6 `ref-check` pipeline. |

**Implemented:** the five core `SKILL.md` files plus `llp-list` and `ref-story`; the `AGENTS.md` SKILLS routing block; README and these docs updated.

**Still pending (this keeps the RFC in `Review`, not `Active`):** the `llp-spec/` vendoring convention and skew check; `@ref`/`llp-spec:` dogfooding *inside* the `SKILL.md` files — the in-repo skills currently use relative markdown links, since `llp-spec:` targets are meant for vendored copies; the deterministic `ref-check` pipeline (LLP 0000 §6); the fixture and negative-fixture harness; and the multi-model review of this RFC itself.

The five-vs-seven decision and this mapping were weighed against the first-cut implementation before consolidating — that comparison is the rationale for the architecture above.
