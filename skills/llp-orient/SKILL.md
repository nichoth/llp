---
name: llp-orient
description: Before editing a subsystem, file, or starting a task, assemble the governing LLP context — read the root LLP, follow the @ref annotations on the code in scope, and find the LLPs that cover the relevant systems. Produces a compact context pack of the active constraints and rationale a change must respect. Use whenever a change touches an area that may have documented design rationale.
---

# llp-orient

Use this skill at the **start of a coding task**, before changing a subsystem or file, to load the design rationale that governs the area you're about to touch. This is the consumption side of LLP: the whole point of `@ref` is on-demand context, and orienting first is what turns that from a possibility into a habit. It is read-only — it never edits code or docs.

Invoke as `/llp-orient <path-or-task>` (a file, directory, subsystem name, or a short description of the task). With no argument, it uses the current change scope (`git diff --name-only`).

A note on triggering: the *rule* "orient before editing documented code" belongs in the repo's always-in-context `AGENTS.md` so it fires reliably; this skill is the detailed recipe that rule routes to for non-trivial work (see [LLP 0008 §Distribution](../../llp/0008-distributed-agent-skills.rfc.md#distribution)). Don't rely on an ambient description-match alone to invoke it.

## Ground rules

- Read [LLP 0000](../../llp/0000-linked-literate-programming.explainer.md) for the corpus model (documents, `@ref` syntax, the `Systems:` field) this skill reads.
- LLP documents live in `llp/`; references in code use the `@ref LLP NNNN#anchor — gloss` syntax.
- **Scope to the task.** Orientation is not a corpus summary. Pull only the constraints and rationale that bind the change at hand.
- **Link, don't restate.** Cite policy by `LLP NNNN#anchor`; don't paraphrase whole sections into the context pack.
- This skill reads and reports. It proposes no edits.

## Workflow

### 1. Read the root LLP

Read `LLP 0000` first — it orients you to the project's systems and where things live. Note the `Systems:` vocabulary so you can map the task to the right documents.

### 2. Follow the @refs already on the code in scope

Determine the scope (the argument, or `git diff --name-only` for the current change). `Grep` for `@ref` across those files, then `Read` each referenced LLP section. These are the constraints the existing authors thought mattered enough to annotate — they are the highest-signal context.

### 3. Find the LLPs that govern the relevant systems

`Grep` the `**Systems:**` headers across `llp/` to find LLPs tagged with the subsystem(s) the task touches. Read the ones that look governing (Spec, Decision, Principles, and the relevant RFCs/Explainers). Follow their `@ref`s back into the code to see what already implements them.

### 4. Follow one hop out

Follow `Related:` fields and nearby `@ref` targets one hop further, to catch cross-cutting constraints (auth, error handling, data-model invariants) that the immediate files don't name directly. Stop at one hop unless something is clearly load-bearing.

### 5. Emit the context pack

Produce the structured output below. Keep it tight — it should be faster to read than the documents it points at.

## Context pack format

Output these sections so the result is checkable and skimmable:

- **Scope** — the files / subsystems queried.
- **Governing LLPs** — numbered list, one-line gloss each.
- **Active constraints** — bullets, each citing `LLP NNNN#anchor` (the Spec / Decision / Principles sections that bind this work).
- **Relevant rationale** — Explainer / RFC sections that explain *why*, same citation form.
- **Open questions / risks** for this area.
- **Likely doc updates** if the change lands (which LLPs may need co-evolution).
- **Hand-off** — one of `none | llp-adopt | llp-create | llp-review`.

## Failure modes

- **No corpus yet** (no `llp/`, or only a stub) → hand off to `llp-adopt`; there's nothing to orient against.
- **An `@ref` target or anchor doesn't resolve** → note it as a finding and hand off to `llp-maintain` to repair the reference. Do not guess the rationale behind a broken link.
- **The task needs a new decision** (no LLP covers it) → note it and hand off to `llp-create` (or `llp-review` if it's proposal-shaped).

## Scope limits

- Do not edit code or LLP documents. This skill is read-only.
- Do not summarize the entire corpus; scope to the task.
- Do not invent constraints. If a constraint isn't documented, say so rather than inferring one.
