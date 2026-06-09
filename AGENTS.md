# Agent Instructions

This project uses **Linked Literate Programming (LLP)** as defined in [LLP 0000](./llp/0000-linked-literate-programming.explainer.md). Read that document before making substantial changes.

## LLP documents

- LLP documents live in `llp/` and follow the numbering convention `NNNN-slug.type.md` (e.g. `0001-foo.guide.md`, `0003-bar.research.md`).
- When creating a new LLP, use the next available number and include the standard metadata header (`Type`, `Status`, `Systems`, `Author`, `Date`; optional `Role`, `Revised`, `Related`).
- Standard types: **RFC**, **Spec**, **Decision**, **Plan**, **Explainer**, **Principles**, **Guide**, **Issue**, **Research**. You may define others if none of these fit.
- RFCs (and optionally Specs/Plans) follow the multi-model review process defined in [LLP 0005](./llp/0005-rfc-process.guide.md). They use the expanded lifecycle: `Draft` -> `Review` -> `Accepted` -> `Active`.
- LLP documents are living documents. Update them when the system evolves. If an LLP is historical but still useful, move it under `llp/tombstones/` and mark it `Tombstoned`. Don't leave stale docs around unmarked.

## @ref annotations

- When writing or modifying code that implements a non-obvious design decision documented in an LLP, add an `@ref` annotation: `// @ref LLP NNNN#section — short gloss`
- When modifying code that already carries a `@ref`, check that the referenced section still applies. Update or remove it if not.
- Don't annotate mechanically. A reference should tell you something you wouldn't know from reading only the code and filename.

## Agent skills

This repo ships LLP workflow skills under `skills/` (see the README's Skills section). The orient-first rule below is the ambient guidance; the skills are what it routes to.

<!-- BEGIN LLP SKILLS MANAGED BLOCK -->
Before editing a subsystem with documented design, orient first: read its
governing LLP, and for non-trivial work invoke `llp-orient` to assemble a
context pack of the constraints the change must respect.

Skills: orient = context before coding · create = author one LLP · review = LLP 0005 multi-model loop · adopt = set up LLP in any repo (scaffold or retrofit) · maintain = drift / pre-PR / reconcile / retire checks
<!-- END LLP SKILLS MANAGED BLOCK -->

## Working on this project

- Read relevant LLP documents before implementing features or fixing bugs in the areas they cover.
- If you make a design decision worth documenting, write or update an LLP for it.
- Prefer updating an existing LLP over creating a new one when the topic is already covered.
