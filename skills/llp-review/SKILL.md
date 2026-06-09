---
name: llp-review
description: Run the multi-model review loop for an LLP document (LLP 0005). Prepares the standard review prompt, orchestrates reviews from at least two model families plus the author, and writes one provenance-tracked artifact per review actually received under llp/reviews/. Enforces the loop for documents in Review; offers it otherwise. Never fabricates a review and never accepts on the author's behalf.
---

# llp-review

Use this skill to review an LLP document the way LLP 0005 prescribes: critical feedback from **at least two model families plus the author**, captured as durable artifacts. The point of the loop is cognitive diversity — different model families catch different blind spots — so a single session cannot honestly stand in for the whole loop, and this skill is built so the honest path is the only path.

Invoke as `/llp-review <identifier>` where `<identifier>` is an LLP number, slug, or filename. With no argument, list the `Draft` and `Review` LLPs and ask which to review.

See [LLP 0005](../../llp/0005-rfc-process.guide.md) for the process and [LLP 0008 §Multi-model review protocol](../../llp/0008-distributed-agent-skills.rfc.md#multi-model-review-protocol) for the provenance contract.

## Ground rules

- LLPs live in `llp/`; filenames follow `NNNN-slug.type.md`.
- Review artifacts go under **`llp/reviews/`**, one file per reviewing model family: `llp/reviews/NNNN-slug.<family>.md` (e.g. `0042-widget-api.gpt.md`, `…​.claude.md`, `…​.gemini.md`). These are reference material, not LLPs — no number, no LLP metadata block.
- Each artifact opens with a short **provenance header** (below). That makes its origin auditable.
- **Never record a review that didn't happen.** Do not claim the author review, a fresh Claude-family review, or a non-Claude review is done unless it was actually provided.
- **Never change `**Status:**` or accept/reject.** That's the human's call (LLP 0005 §4–5). Propose transitions; don't apply them.

## When the loop is required vs. optional

- **Required** when the document is in `Review`, or when formal review is explicitly requested. Enforce the full loop.
- **Optional** otherwise — offer it, don't impose it. Small or codifying RFCs, and well-understood decisions, may skip formal review ([LLP 0005 §When to skip](../../llp/0005-rfc-process.guide.md#when-to-skip-formal-review)).

## The standard review prompt

Apply this prompt (or a close variant) to the document under review:

> What do you think of this proposal? Is it a good idea? Do we have a good plan here? How would you change it to make it better? What would you add or take away or change? Is anything definitely or possibly wrongheaded here? Do you have any novel ideas that you think might make this way better even if they are a bit non-standard? What are the key open questions we need to answer to refine this?

Adapt the phrasing if the type isn't a proposal (Research → "Are the findings sound?"; Decision → "Do you agree with this choice?"). The intent is substantive, actionable feedback — not a checklist.

## Workflow

### 1. Locate and read the LLP

Accept a number (`0042`, `LLP 0042`), a slug, a filename fragment, or a full path. Scan `llp/` recursively, match by number first then slug; disambiguate if needed. Read the full file — do not skim.

### 2. Write this session's review (one family only)

If this session is explicitly acting as one independent model-family reviewer — and is **not** the session that authored the draft — produce a review using the structure below, and count it as exactly one family (this session's). If this session authored the draft, it cannot also serve as the independent fresh-Claude review; say so.

### 3. Gather the other required inputs — and stop until they exist

The loop needs the author's review plus at least two distinct model families. For each missing input, use whichever path the environment supports:

1. Human pastes the document into another model manually.
2. A sub-agent/task on a *different* model family, where the runtime offers one.
3. A CLI model runner (e.g. in CI).

**STOP until the missing reviews are actually provided.** Do not mark the loop complete by intent, and do not invent a review for a family that didn't run. Sending code or docs to an external provider is never automatic — it takes an explicit human action; default to redacting secrets/credentials and prefer a local runner for sensitive material.

### 4. Write one artifact per review actually received

For each review you genuinely have, write `llp/reviews/NNNN-slug.<family>.md` (create `llp/reviews/` if absent), opening with the provenance header:

```markdown
**Reviewer family:** <e.g. Claude | GPT | Gemini>
**Provider / runtime:** <e.g. claude-code sub-agent | pasted manually | cli-runner>
**Date:** YYYY-MM-DD
**Redacted:** <yes/no — was anything withheld before sending?>
**Method:** <manual | sub-agent | cli-runner>
```

followed by the review body (structure below).

### 5. Present and propose next steps

Show the review(s) and the saved path(s). Based on the feedback, *propose* a status transition (stay `Draft` and revise / move to `Review` for more families / ready for the author to `Accept`) — but leave the change to the human. Remind them that a single AI review is not sufficient for acceptance under LLP 0005.

## Review body structure

Lead with findings, not process:

```markdown
# Review of LLP NNNN: <Title>

## Overall assessment
One or two paragraphs: is it a good idea, is the plan sound, big-picture reaction.

## Strengths
- Specific things it gets right (cite sections). "Good summary" is useless; "the summary correctly identifies the X/Y trade-off" is useful.

## Concerns
- Substantive issues, each marked severity (definitely-wrong vs possibly-wrong), each with what would resolve it.

## Suggestions
- Additions, removals, reorganizations, alternatives; novel ideas welcome. Prioritize.

## Open questions
- What the document doesn't answer but needs to; assumptions left unjustified.

## Recommended next step
- Revise (stay Draft) / more model reviews (Review) / ready to Accept / major rework.
```

## What tooling can and cannot verify

The header is **auditable self-attestation, not proof**. Mechanically checkable (by `llp-maintain` or the `ref-check` gate): the artifact exists and is well-formed; the header fields are present; the non-author families are distinct and number ≥ 2; and, for `cli-runner`, that a referenced transcript/hash resolves. What is **not** mechanically checkable: whether a `manual` external review actually occurred. A malformed artifact can be rejected; a fabricated-but-well-formed one cannot — which is exactly why step 3 refuses to record a review it wasn't given.

## Scope limits

- Do not fabricate reviews or mark the loop complete by intent.
- Do not change the LLP's `Status`, and do not accept or reject on the author's behalf.
- Do not overwrite a review artifact from a different reviewer; one file per family (add a dated section for a re-review of the same family).
- Do not invent content not in the LLP; quote or paraphrase to ground the review.
