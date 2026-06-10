# LLP 0004: Design Principles

**Type:** Principles
**Status:** Active
**Systems:** LLP
**Author:** Charlie Cheever / Claude
**Date:** 2026-04-01
**Revised:** 2026-06-10 (added "Contracts over recipes" and "The capability test", per LLP 0009)

## Summary

These are the core principles behind LLP's design — the "always" and "never" that guide decisions about how the system should evolve.

## Pointers, not prose

Code carries thin references to external prose, never embedded explanations. A `@ref` comment costs one line and near-zero tokens. The prose lives in LLP documents where it can be retrieved on demand, at the right level of detail.

This is the foundational design decision. Everything else follows from it.

## Living documents over immutable records

LLP documents evolve with the system. A stale design document that no longer matches the code is actively harmful — it misleads agents and humans alike. When the system changes, update the document. When a document is no longer current, mark it `Superseded` or `Tombstoned`. Don't leave stale guidance unmarked.

This is a deliberate departure from ADRs and similar append-only systems.

## Annotation as byproduct

Rationale capture must be a byproduct of normal development, not a separate burden. The best time to add a `@ref` is immediately after writing the code it describes, while the connection is fresh. The worst time is during a dedicated "documentation sprint."

This principle comes from Conklin's gIBIS research (1988): design rationale systems that require separate capture steps fail; those that integrate capture into the design process succeed.

## The simplify test

The decision heuristic for whether code needs a reference: **if an agent might "simplify" this code in a way that would break the design intent, it needs a `@ref`.** This is the crispest formulation of "when is a reference worth adding."

Code that is straightforward, obvious from context, or volatile enough that it will change soon does not need a reference.

## Contracts over recipes

Normative content states *what must be true* — document shapes, the reference grammar, lifecycle rules, behavioral protocols. How-to content — recipes, pipelines, scaffolds, worked prompts — is advisory, visibly marked (`> **Recipe (advisory)**`), homed in the corpus rather than in skills, and deletable. A skill or spec section must be classifiable at a glance as one or the other.

## The capability test

The companion to the simplify test, applied to LLP itself: **would this still earn its keep if the model were flawless?** If yes — it carries information the code doesn't, or coordinates humans and agents across time — it is core. If it exists to prevent model error, it is a recipe: keep it only while the error is real, and delete it when the failure it prevents stops being observed. (Defined in [LLP 0009](./0009-capability-invariant-core.rfc.md).)

## Composable pipelines over monolithic tools

Tooling follows Ramsey's noweb principle: small, composable filters with clear inputs and outputs. `ref-check` keeps its checks separable and its output greppable; new capabilities (an index, an annotated view) are new stages, not modifications to existing ones.

## Core stays small

The core contract (documents, references, attachment semantics, anchors) should remain minimal. Everything else — relation types, validation, annotated views, indexes — is an extension that projects can adopt independently or not at all. Resist the temptation to move extensions into the core.

## Accuracy over coverage

A few accurate, specific references are worth more than broad, mechanical annotation. A vague `@ref LLP 0074` on every file in a module is worse than no reference. Every `@ref` should tell you something you wouldn't know from reading only the code and filename.

## Heading slugs by default

For living documents, the default anchor strategy should survive restructuring. Heading slugs (`#focus-trapping`) let you reorder, insert, and merge sections without breaking references in the codebase. Numbered sections (`#3.1`) are fine for stable specs, but they create adoption-killing friction in documents that evolve.

## Co-evolve code and docs

LLP documents and the code they describe should change together, in the same commits. A commit that only updates documents with no code change is a signal of drift. The norm is co-evolution.
