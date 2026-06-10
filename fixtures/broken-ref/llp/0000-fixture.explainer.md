# LLP 0000: Fixture Project

**Type:** Explainer
**Status:** Active
**Systems:** Fixture
**Role:** Root
**Author:** ref-check fixture
**Date:** 2026-06-10

## Overview

A deliberately broken tree: `src/main.py` carries one resolving reference
and two broken ones. `ref-check --root fixtures/broken-ref` must exit
non-zero, reporting exactly the two broken refs.

## Real section

The one anchor in this corpus that a reference can legitimately target.
