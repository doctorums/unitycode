# UnityCode — Architecture Definition

## 1. System overview

UnityCode is a living social semantic graph system.

It is not a traditional CRUD application.

Core concepts:
- nodes = semantic entities (thoughts, ideas, concepts)
- edges = relationships between nodes
- events = source of truth
- state = derived from events

---

## 2. Source of truth

Events are the ONLY source of truth.

Nodes and edges are derived data structures.

They can be rebuilt at any time from event history.

Never treat UI state, cache, or database rows as authoritative.

---

## 3. Event system

All system changes must be represented as immutable events.

Event types:
- create_node
- update_node
- delete_node
- create_edge
- delete_edge
- ai_annotation

Events are append-only and never modified.

---

## 4. AI role

AI is not a state manager.

AI responsibilities:
- propose events
- generate interpretations
- suggest relationships between nodes

AI must NOT directly mutate system state.

All changes must go through event validation.

---

## 5. System layers

Layer 1: Event Log
- immutable history of all changes

Layer 2: Derived Graph
- nodes and edges built from events

Layer 3: Cache Layer
- optimized representation for UI performance

Layer 4: UI Layer
- purely visual representation
- must not contain business logic

---

## 6. UI safety rule

UI must never be modified unless explicitly required for bug fixing.

UI is a projection of system state, not a controller of state.

---

## 7. Performance model

Graph should not be reconstructed from scratch on every interaction.

Use:
- snapshots
- incremental updates
- cached adjacency structures

---

## 8. Safe modification rules

Allowed changes:
- event system improvements
- performance optimizations
- backend logic enhancements
- caching improvements

Forbidden changes:
- UI redesign or refactoring
- removal of existing flows
- breaking API contracts
- changing user interaction logic

---

## 9. Future direction

The system is designed to evolve into a distributed event-based network.

Future capabilities may include:
- offline-first operation
- peer-to-peer event synchronization
- multi-client graph consistency
