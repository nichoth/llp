---
name: llp-maintain
description: Keep an LLP corpus healthy as code and docs evolve. Detects drift between code and the LLPs it references, validates @ref annotations (broken, tombstoned, stale-gloss), checks provenance markers, and proposes reconciliations, ref repairs, and status changes. Runs as a pre-PR check, a periodic audit, a post-pull reconcile, or a retirement proposal. Proposes; it does not apply.
---

# llp-maintain

Use this skill to keep an LLP corpus in sync with the code it describes. LLP documents are living documents (LLP 0004): when code changes, the docs and `@ref` annotations have to co-evolve, or they rot into stale guidance that misleads the next agent. This skill is the upkeep engine — it finds drift and **proposes** fixes, but it never mutates docs, code, or status without sign-off. That propose-only line is what lets one skill cover four maintenance moments without becoming a mega-skill.

Invoke as `/llp-maintain --intent <intent> [--scope <scope>]`:

- `--intent pre-pr` — check the working tree before a PR (the most common use)
- `--intent audit` — sweep the whole corpus for drift, broken refs, and stale statuses
- `--intent reconcile` — reconcile a diff range (e.g. after a `git pull`, or branch-vs-base)
- `--intent retire-proposal` — propose retiring a named doc (`Superseded`/`Tombstoned`)

See [LLP 0008 §llp-maintain modes](../../llp/0008-distributed-agent-skills.rfc.md#llp-maintain-modes) for the design.

## Ground rules

- Read [LLP 0004](../../llp/0004-design-principles.principles.md) (co-evolution, living documents) and [LLP 0000 §6](../../llp/0000-linked-literate-programming.explainer.md#6-validation-tooling-planned) (the validation pipeline) for the model this skill operationalizes interactively.
- `scope ∈ {working-tree, branch, range, corpus}` selects what to diff (via `git diff`); `intent` selects the artifact. Each intent has a sensible default scope.
- **Propose, never apply.** Every reconciliation, ref repair, and status change is emitted for a human to approve. No mode writes on its own.
- This is the *interactive* checker. A non-interactive, merge-blocking CI gate is a different thing — the deterministic `ref-check` pipeline planned in LLP 0000 §6 — and is out of scope here. When a project wants enforcement in CI, it runs that pipeline; this skill is what an agent runs with a human present.

## The mechanical checks

These run in every mode (this is the interactive form of `ref-check`). For the `@ref` annotations in scope:

- **Broken reference** — the target LLP or `#anchor` doesn't exist. Severity: **error**. When an anchor is wrong, list the anchors that *do* exist so the user can pick the replacement.
- **Tombstoned / superseded target** — the reference points at a retired LLP. Severity: **warning** (note the replacement if the header gives one).
- **Stale gloss** — the gloss text no longer resembles the referenced section. Severity: **hint** (soft; never blocks).
- **Orphaned annotation** — a `@ref` whose attachment target (the next construct) is gone, or that floats free of any construct. Severity: **warning**.

For provenance-tracked docs (any doc with a claim marker or an `## Evidence` section), also check (per [LLP 0008 §Provenance](../../llp/0008-distributed-agent-skills.rfc.md#provenance-for-generated-documents)):

- **error** on any `[inferred]` marker in an `Accepted` or `Active` LLP.
- **error** on an `[observed:<id>]` claim with no matching `## Evidence` entry, or whose Evidence target doesn't resolve to a repo path, `@ref` target, or commit.
- **error** on a `[confirmed]` claim missing attribution or date.

## Modes

### `--intent pre-pr` (default scope: working-tree)

The everyday check before opening a PR.

1. `git diff --name-only` to find what changed.
2. Run the mechanical checks over the changed files and the docs they touch.
3. Look for **code/doc drift**: code whose behavior no longer matches the LLP section it references; new files that implement a documented LLP but carry no `@ref`; LLP sections whose described behavior the diff contradicts.
4. Emit a **co-evolution checklist** — each item a concrete "update doc or code" / "repair ref" / "consider annotating" action — plus the ref and provenance results.
5. If the implementation of an `Accepted` LLP now appears complete, note a **proposed** `Accepted → Active` status change (not applied).

Example output:

```
Co-evolution checklist (working tree)
[ ] LLP 0042 §retry-budget describes a 30s cap; code now uses 60s — update doc or code
[ ] @ref broken: src/http/retry.ts:42 → LLP 0042#backoff (anchor renamed) — repair ref
[ ] New file src/http/circuit.ts has no @ref but implements LLP 0042 — consider annotating

Proposed status changes (NOT applied)
- LLP 0042 Accepted → Active (implementation appears complete)
```

### `--intent audit` (default scope: corpus)

Sweep all of `llp/` plus the codebase. Output a findings list: drift between docs and code, broken/orphaned refs, and stale statuses (e.g. an `Accepted` LLP that looks fully implemented, or a `Draft` that's clearly superseded in practice). Nothing is applied.

### `--intent reconcile` (default scope: range / branch)

Given a diff range — a pull, or branch-vs-base — produce **per-doc reconciliation proposals**: for each LLP whose referenced code changed in the range, the specific edits that would bring the doc back in line (or the note that the code, not the doc, is what drifted). Proposes edits; does not apply them. If a reconciliation is really a new design decision rather than a doc repair, hand off to `llp-review`.

### `--intent retire-proposal` (default scope: corpus, one named doc)

For a named LLP, draft a `Superseded` or `Tombstoned` proposal with rationale (and the replacement LLP, for `Superseded`). The human applies the status change and any move to `llp/tombstones/`.

## Hand-offs

- A reconciliation that's actually new design → `llp-review`.
- A broken ref surfaced during `llp-orient` → comes here for repair.
- Deterministic CI enforcement → the `ref-check` pipeline (LLP 0000 §6), not this skill.

## Scope limits

- Do not apply edits, ref repairs, or status changes. Propose them; the human decides (LLP 0005 §4–5).
- Do not mass-rewrite refs or docs; emit a reviewable checklist or diff.
- Do not infer untagged rationale and assert it as fact — flag likely-untagged claims for the author to classify, don't classify them silently.
- Do not claim to be a CI gate; that is the separate, deterministic `ref-check` pipeline.
