**Reviewer family:** GPT
**Provider / runtime:** Codex GPT-5 interactive session
**Date:** 2026-06-10
**Redacted:** no
**Method:** manual

# Review of LLP 0009: The Capability-Invariant Core

## Overall assessment

This is a strong proposal. The capability test is the right simplifying lens for LLP: keep the corpus, reference grammar, lifecycle, provenance, and review protocol because they preserve information models cannot infer; mark or delete mechanics whose only job is compensating for weaker agents. The proposed direction would make the system more credible by replacing speculative tooling prose with one small checker and by making the skills behave like adapters rather than sources of policy.

I would revise before moving to formal `Review`. The biggest problems are compatibility edges in the reference grammar and a missing replacement for `llp-spec:` as the location-independent citation mechanism for distributed skills. Both are fixable, but without them the proposal cuts some of the same durability/provenance properties it says are kernel.

## Strengths

- The kernel/shell split is clear and useful. It gives future maintainers a decision procedure instead of a taste argument.
- The RFC correctly identifies that multi-model review and provenance appreciate as models get more persuasive, not less.
- Building `ref-check` v1 instead of continuing to specify a larger planned pipeline is the right kind of simplification.
- The implementation plan is phased, measurable, and mostly leaves the repo in coherent intermediate states.
- The compatibility posture is appropriately conservative: preserve numbering, metadata, statuses, and the ordinary `@ref` surface.

## Concerns

- **Definitely wrong / high: the proposed kernel silently drops existing `@ref` target forms.** LLP 0009 says consuming projects are unaffected and that the reference grammar is unchanged, but its kernel target list is only "LLP numbers, repo paths, or URLs," and `ref-check` v1 only names LLP/path/URL resolution. Existing LLP 0000 also supports project-defined shorthands such as `SPEC#binary-header`, and examples allow whole-document references like `@ref LLP 0074` without a section anchor. This is a compatibility break unless the RFC explicitly carries forward shorthands and anchorless whole-document targets. Resolution: update the kernel grammar and `ref-check` checks to include project shorthands and optional anchors, or state a deliberate migration away from them.

- **Possibly wrong / high: cutting `llp-spec:` leaves distributed skills without resolvable provenance.** LLP 0009 requires every skill `MUST` to cite the LLP section it comes from, and says policy must live in the corpus rather than in skills. But it also cuts the `llp-spec:` namespace and vendored snapshot, replacing it with a human-readable `source: <repo>@<tag>` line. A source pin tells a human where the skill came from; it does not give an installed skill a stable, offline, location-independent way to resolve `@ref`s to the upstream LLP corpus. LLP 0008's argument for `llp-spec:` exists exactly because relative links resolve against the wrong project after copying. Resolution: keep a smaller spec-corpus reference mechanism, embed canonical upstream URLs for skill citations, or explicitly require installed skills to bring a minimal spec snapshot. A plain source pin is not enough to preserve the cited-MUST invariant.

- **Possibly wrong / medium: the provenance kernel is normative but only partly checkable.** The kernel says `[observed]` must say where and `[confirmed]` must name a human with a date, but `ref-check` v1 only gates `[inferred]` in `Accepted`/`Active` docs. If the evidence and attribution requirements matter, they need a small checkable syntax; if they are intentionally advisory, the kernel should say so and narrow the normative claim. Resolution: either keep a minimal structured form for observed/confirmed markers or state that only `[inferred]` promotion blocking is mechanically enforced.

- **Possibly wrong / medium: the distribution simplification may remove the only drift detector for copied skills.** Deleting skew checks is reasonable if no project is actually vendoring LLP yet, but the replacement needs some way for a future consumer to know "this copied skill was authored against spec version X, and the local corpus/runtime rule is Y." Resolution: if `llp-spec:` is too much, define the smaller invariant now: source pin is informational; stale installed skills are found by comparing the pin to a release tag; no offline section resolution is promised. That would make the downgrade explicit.

- **Minor: the size claim is slightly overstated.** The acceptance table targets current-guidance docs going from about 1,760 lines to <=1,100, which is a substantial reduction but not "roughly half" for the document corpus. The whole docs-plus-skills system may shrink by about half; the wording should distinguish those.

## Suggestions

- Add a "Compatibility details" subsection that enumerates every target form retained: `LLP NNNN`, `LLP NNNN#anchor`, repo path with optional anchor, project shorthand with optional anchor, URL, and non-markdown path. This would prevent the simplification from accidentally changing the grammar.
- Replace the `llp-spec:` cut with a smaller design rather than no design. A minimal version could be: skills cite canonical upstream URLs for policy references and carry `source: owner/repo@tag`; `ref-check` validates only URL shape, not vendored equality. That keeps provenance without reintroducing a package manager for markdown.
- Make `ref-check` v1's scope exact in one place. Today the RFC mixes "one small checker" with several categories: metadata, refs, anchors, numbers, inferred markers, possibly provenance attribution, and CI wiring. A small normative bullet list is enough; everything else should be a future note.
- Move line-count measurements into a generated or easily rerunnable command in the implementation plan. The numbers are persuasive because they are concrete; make them cheap to refresh after revisions.
- Consider keeping a one-paragraph "why deleted" tombstone for 0006 if the file is removed. The number should not be reused either way, but a tombstone may be useful because 0006 records alternatives around wrapping external artifacts.

## Open questions

- Are project-defined shorthands still part of core LLP, or should they become an extension? LLP 0009 currently reads like they vanish accidentally.
- What is the minimum acceptable replacement for `llp-spec:` that still lets copied skills cite their governing policy?
- Should `[observed]` and `[confirmed]` be mechanically validated, or are they only human-readable honesty tags?
- Is `ref-check` intended to scan `skills/**/SKILL.md` after `llp-spec:` is removed? If yes, what target form should skill policy references use?
- Does deleting `ref-story` before deterministic annotated-source tooling exists reduce the ability to demonstrate LLP's most novel literate-programming payoff?

## Recommended next step

Revise and stay `Draft` for now. The core thesis is sound, but the reference-grammar compatibility issue and the distributed-skill provenance replacement should be fixed before this enters the formal LLP 0005 review loop. This GPT-family review can count as one review artifact, but it is not sufficient for acceptance; the loop still needs the author review and at least one distinct non-GPT model-family review.
