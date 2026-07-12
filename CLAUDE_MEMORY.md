# CLAUDE_MEMORY

## Purpose

This file records stable architectural decisions and long-term context
for UnityCode.

Update this document after important design decisions. Do not store
temporary implementation notes here.

------------------------------------------------------------------------

## Current Project State

-   Documentation foundation exists (README, GENESIS, CLAUDE,
    ARCHITECTURE, CORE_MODEL).
-   The project follows an incremental evolution strategy.
-   Avoid unnecessary rewrites.

------------------------------------------------------------------------

## Permanent Architectural Decisions

### Core First

The architectural center of UnityCode is the Core, not the UI.

New business logic should be implemented inside `core/` whenever
practical.

------------------------------------------------------------------------

### Semantic Model

The long-term model consists of:

-   Mind
-   Node
-   Connection
-   Context
-   Memory

Connections should evolve into first-class entities.

------------------------------------------------------------------------

### Development Rules

-   Preserve backward compatibility.
-   Prefer incremental refactoring.
-   Keep modules small and focused.
-   Separate presentation from domain logic.

------------------------------------------------------------------------

### Repository Conventions

-   Markdown for documentation.
-   Documentation reflects implementation.
-   Architecture decisions are recorded before major refactoring.

------------------------------------------------------------------------

## Open Architectural Goals

-   Build Semantic Engine.
-   Introduce Core services.
-   Reduce coupling between UI and storage.
-   Expand graph capabilities without breaking existing functionality.

------------------------------------------------------------------------

## Updating This File

When a significant architectural decision is accepted:

1.  Add a short entry.
2.  Record the rationale.
3.  Remove obsolete guidance only when replaced by a newer decision.

This document should remain concise and authoritative.
