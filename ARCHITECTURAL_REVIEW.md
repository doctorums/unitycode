# ARCHITECTURAL_REVIEW

## Purpose

This document provides architectural guidance for Claude while
developing UnityCode.

It supplements GENESIS.md, ARCHITECTURE.md and CORE_MODEL.md.

The objective is to evolve the existing system without unnecessary
rewrites.

------------------------------------------------------------------------

# Current Assessment

The repository already contains a coherent vision, a growing domain
model and a stable static architecture.

Development should prioritize evolution rather than replacement.

------------------------------------------------------------------------

# Architectural Priorities

Priority 1 - Preserve existing functionality. - Avoid breaking
changes. - Prefer incremental refactoring.

Priority 2 - Introduce a dedicated Core layer (`core/`). - Move domain
logic into the Core gradually.

Priority 3 - Keep presentation independent from business logic.

Priority 4 - Build a Semantic Engine before adding major new features.

------------------------------------------------------------------------

# Repository Strengths

-   Clear project philosophy.
-   Well-defined documentation.
-   Existing Node-centric data model.
-   Static deployment architecture.
-   Modular JavaScript structure.

These strengths should be preserved.

------------------------------------------------------------------------

# Main Architectural Risks

## Distributed Domain Logic

Business logic is currently spread across UI-oriented modules.

Future shared logic should live in `core/`.

------------------------------------------------------------------------

## Tree Instead of Graph

Current relationships appear to rely primarily on hierarchical
references.

Future architecture should support explicit graph relationships through
independent Connection entities.

------------------------------------------------------------------------

## Missing Semantic Layer

The repository lacks a dedicated semantic engine responsible for:

-   graph traversal
-   relationship management
-   context discovery
-   semantic navigation
-   reasoning support

------------------------------------------------------------------------

# Recommended Core Structure

``` text
core/
├── Graph.js
├── Node.js
├── Connection.js
├── Context.js
├── Memory.js
├── SemanticEngine.js
└── index.js
```

Each module should have a single responsibility.

------------------------------------------------------------------------

# Module Recommendations

## nav.js

No action required.

Keep simple.

------------------------------------------------------------------------

## book-loader.js

Maintain current behavior.

Add caching.

Long-term:

UI → ContentService → Storage

------------------------------------------------------------------------

## audio.js

Large module.

Refactor gradually into smaller components without changing public
behavior.

------------------------------------------------------------------------

## i18n.js

Move dictionaries into external JSON files.

Prepare for future AI-assisted localization.

------------------------------------------------------------------------

## schema.sql

Continue evolving around semantic entities.

Do not over-normalize prematurely.

Design future schema around:

-   Mind
-   Node
-   Connection
-   Context
-   Memory

------------------------------------------------------------------------

# Design Rules

Before implementing any feature:

1.  Does it belong in the Core?
2.  Does it strengthen the semantic model?
3.  Can it reuse existing abstractions?
4.  Does it increase maintainability?

If not, reconsider the implementation.

------------------------------------------------------------------------

# Long-Term Direction

UnityCode should evolve toward:

Presentation ↓ Services ↓ Core ↓ Semantic Engine ↓ Storage

The Semantic Engine should become the architectural center of the
project.

------------------------------------------------------------------------

# Working Principles

Prefer:

-   evolution over replacement;
-   modularity over duplication;
-   explicit architecture over implicit behavior;
-   semantic consistency over short-term convenience.

Do not redesign working systems without measurable benefit.

Focus on long-term maintainability and semantic integrity.
