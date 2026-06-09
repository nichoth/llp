# Linked Literate Programming (LLP)

**Keep humans in markdown. Let AI write and review the code.**

LLP is infrastructure for codebases where humans work at the level they're good at — English prose, design decisions, principles, tradeoffs — and AI handles the code and most of the review. It's a structured way to give AI agents the context they need so that what they produce stays consistent with what the humans (and other AIs) behind the project actually want.

> **Rule of thumb:** if an AI agent might "simplify" this code in a way that would break the design intent, it needs a reference.

## Reference syntax at a glance

| Element | Format | Example |
|---------|--------|---------|
| LLP reference | `@ref LLP NNNN#anchor — gloss` | `@ref LLP 0005#token-strategy — Why we rotate tokens` |
| With relation | `@ref LLP NNNN#anchor [rel] — gloss` | `@ref LLP 0005#token-strategy [implements] — Token rotation` |
| LLP (broad) | `@ref LLP NNNN` | `@ref LLP 0012 — Auth subsystem` |
| Path reference | `@ref path/to/doc.md#anchor` | `@ref docs/vendor/spec.md#tokens — Token format` |

## The problem

Living codebases carry an enormous amount of implicit knowledge: the decisions, principles, and constraints behind why things are the way they are. Today that knowledge lives in Notion pages, Google Docs, Slack threads, half-finished wiki articles, and the heads of senior engineers. When an AI agent writes new code, it can't see any of it.

Some AI harnesses address this with "memory" — ambient notes the agent accumulates over time. That helps, but it's unstructured and hard to curate. When you change your mind about a decision, remnants of the old one linger in memory and keep influencing new code. You can't cleanly version it, review it, or hand it to someone else.

LLP is the structured, explicit version of that idea. Decisions live in markdown documents in the repo. They are versioned like code. When a decision changes, you update the document, and the next thing the AI writes reflects the new intent — not an echo of the old one.

## The core idea

Humans stay in markdown. That's where they read fastest, argue most clearly, and make the decisions that actually matter. A plan refined a few times at the markdown level almost always produces better software — and less slop — than the same plan worked out directly in code.

The code itself, and most of the review, can be left to AI. The catch is that the AI needs to know *why* the code exists in the form it does. LLP gives it that, via thin pointers from code to the exact section of the exact document that explains a given decision:

```rust
// @ref LLP 0042#token-strategy — Session tokens must be rotated on privilege escalation
pub fn escalate_privilege(session: &Session) -> Result<Session> {
```

The `@ref` comment is a machine-readable link. An agent reviewing this function can follow it to the rationale and check whether a proposed change still satisfies the constraint. A human can follow it too — but the point is that they mostly shouldn't have to.

## What this buys you

**For agents:**

- **More correct code.** An agent writing a new function can follow `@ref` links to the exact constraints it needs to satisfy, instead of guessing from surrounding code.
- **Consistency with the rest of the codebase.** Decisions recorded once in an LLP document apply everywhere they're referenced. A new feature written a year later lands in the same shape as the old ones.
- **Faster, more efficient review.** Review shifts from "what is this doing?" to "does this still match the referenced decisions?" — a check agents can do quickly and reliably along the `@ref` edges.

**For humans:**

- **A well-documented system, by construction.** The documentation *is* the source of truth the agents work from, so it can't drift into stale wiki territory without the code starting to drift with it.
- **A malleable surface made of English.** Want to change how the system behaves? Edit the markdown. The next thing an agent writes reflects the new intent. You're steering the codebase through prose, which is faster and more natural to read, write, and argue about than code.
- **Versioned decisions, not ambient memory.** When you change your mind, you update the document. No lingering echoes of old decisions drifting through the AI's next suggestions.

## Quick start

**1. Create an `llp/` directory and write your first LLP document:**

```markdown
# LLP 0000: My Project

**Type:** Explainer
**Status:** Active
**Systems:** Core
**Role:** Root
**Author:** ...
**Date:** YYYY-MM-DD

## Overview

What the project does and why.

## Architecture

Major subsystems and how they relate.
```

**2. Add references from your code to the decisions behind it:**

```typescript
// @ref LLP 0000#architecture — Widget service boundary
export function handleWidgetRequest(req: Request): Response {
  // ...
}
```

**3. Check references and doc/code drift:**

```bash
/llp-maintain --intent audit
```

See the [Skills](#skills) section below for how to install and use the orientation, authoring, review, and maintenance tooling.

## Skills

This repo ships a set of skills for working with LLP documents and references — five core workflows plus a couple of utilities. They are plain markdown directories under [`skills/`](./skills/), each centered on a `SKILL.md` file. The format is broader than any one harness: Claude Code can consume them directly, and other agent tools can adopt the same artifact shape.

### Using with Claude Code

The skills are self-contained — each is a directory under `skills/` with a `SKILL.md` file. To install one into Claude Code:

```bash
# Copy the skill directory into your Claude Code skills location
cp -r skills/llp-orient ~/.claude/skills/
```

(Or install all of them at once by copying the full `skills/` directory.) After installation, invoke them with the slash commands shown below.

### Available skills

The five **core** skills cover the daily loop — orient → create/adopt → review → maintain — plus a couple of utilities.

| Skill | Slash command | What it does |
|-------|---------------|-------------|
| [`llp-orient`](./skills/llp-orient/SKILL.md) | `/llp-orient <path-or-task>` | **(core)** Before editing code, load the governing LLP context: read `LLP 0000`, follow the `@ref`s on the code in scope, find the LLPs covering the relevant systems, and emit a compact context pack. Read-only. |
| [`llp-create`](./skills/llp-create/SKILL.md) | `/llp-create <title>` | **(core)** Create a new LLP document — next available number, filename/slug, and metadata scaffold. Prefers extending an existing LLP when one already covers the topic. |
| [`llp-review`](./skills/llp-review/SKILL.md) | `/llp-review <llp>` | **(core)** Run the LLP 0005 multi-model review loop (≥2 model families plus the author) and save one provenance-tracked artifact per review under `llp/reviews/`. Never fabricates a review or accepts on the author's behalf. |
| [`llp-adopt`](./skills/llp-adopt/SKILL.md) | `/llp-adopt` | **(core)** Bring LLP to a repository, greenfield or brownfield. Detects how much already exists and runs `scaffold` mode (fresh repo) or `retrofit` mode (survey an existing codebase, draft the root LLP, propose an adoption plan). |
| [`llp-maintain`](./skills/llp-maintain/SKILL.md) | `/llp-maintain --intent <mode>` | **(core)** Keep the corpus healthy: detect code/doc drift, validate `@ref` annotations, check provenance, and propose reconciliations and status changes. Modes: `pre-pr`, `audit`, `reconcile`, `retire-proposal`. Proposes; never applies. |
| [`llp-list`](./skills/llp-list/SKILL.md) | `/llp-list [filters]` | *(utility)* List LLPs grouped by status or filtered by type, system, or author. Useful for "what's still in draft?" or "what covers the auth system?" |
| [`ref-story`](./skills/ref-story/SKILL.md) | `/ref-story <file>` | *(experimental)* Rationale-order view of a source file, grouped by the LLP sections that explain each construct. A stopgap for the annotated-source tooling planned in LLP 0000 §7. |

Reference *validation* (`ref-check`) is intentionally **not** a skill: the interactive checks run inside `llp-maintain`, and the deterministic, CI-gating version is the `ref-check` pipeline planned in [LLP 0000 §6](./llp/0000-linked-literate-programming.explainer.md#6-validation-tooling-planned) (a real program, not an LLM workflow). See [LLP 0008](./llp/0008-distributed-agent-skills.rfc.md) for the design behind this skill set.

Every skill's `SKILL.md` is readable on its own — it describes the command surface, the workflow, and the edge cases the skill handles.

### Writing new skills

A skill in this format is just a directory with a `SKILL.md` file that has YAML frontmatter and markdown instructions. Claude Code can use these directly, and other agent tools can adopt the same structure. To add a new skill:

1. Create `skills/your-skill-name/SKILL.md`.
2. Add frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: One-sentence description of what the skill does and when to use it.
   ---
   ```
3. Write the instructions that Claude should follow when the skill is invoked.
4. If testing with Claude Code, install it locally: `cp -r skills/your-skill-name ~/.claude/skills/`

The existing skills in this repo are examples of the structure. Keep descriptions precise — they are the signal Claude uses to decide whether to invoke the skill.

## What's in this repo

**Start here** depending on what you're trying to do:

- **New to LLP?** Read [LLP 0000](./llp/0000-linked-literate-programming.explainer.md) — the root specification for core concepts, extensions, conventions, and examples.
- **Setting up a new project with LLP?** Read [LLP 0001: Greenfield setup](./llp/0001-greenfield-setup.guide.md).
- **Adding LLP to an existing codebase?** Read [LLP 0002: Retrofitting LLP](./llp/0002-retrofitting-llp.guide.md).
- **Interested in the thinking behind LLP?** Read [LLP 0003: Prior art](./llp/0003-prior-art.research.md) and [LLP 0004: Design principles](./llp/0004-design-principles.principles.md).
- **Curious how the skills are designed?** Read [LLP 0008: Distributed Agent Skills](./llp/0008-distributed-agent-skills.rfc.md) — the RFC behind the skill set.
- **Want to start using the tooling?** Install the [Skills](#skills) above and run `/llp-list` in a project that already has LLPs.

All LLP documents live under [`llp/`](./llp/). All skills live under [`skills/`](./skills/).

## License

MIT
