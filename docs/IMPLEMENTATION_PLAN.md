# DevGraph Implementation Plan

## Executive Overview
**DevGraph** is a graph-powered engineering memory and coordination platform for software teams and AI coding agents. It provides a real-time, shared repository brain backed by **FalkorDB** and exposed to AI agents via **Model Context Protocol (MCP)** and to developers through a live React dashboard.

---

## Architectural Blueprint

### Monorepo Structure (pnpm workspaces / TypeScript)
```
devgraph/
├── apps/
│   ├── web/                     # React + Vite + Tailwind + Graph Visualizer (Cytoscape / React Flow)
│   ├── server/                  # Node.js + Express + Shared Memory REST API + SSE
│   └── mcp/                     # MCP Server (stdio transport, official @modelcontextprotocol/sdk)
├── packages/
│   ├── shared/                  # Common domain types, Zod schemas, event definitions
│   ├── graph/                   # FalkorDB client, Cypher queries, graph schema, migrations
│   ├── code-indexer/            # TypeScript Compiler API AST analyzer, symbol & import graph
│   └── conflict-engine/         # Semantic risk analyzer, categories A-E, evidence builder
├── demo/
│   ├── sample-repo/             # Reproducible TS repo (auth service, shared types, frontend consumer)
│   └── scenarios/               # Deterministic 2-agent scripts (Agent A uncommitted API change, Agent B context query)
├── docs/                        # Architecture specs, IMPLEMENTATION_PLAN.md, IMPLEMENTATION_LOG.md
├── docker-compose.yml           # FalkorDB local container configuration
├── package.json
└── README.md
```

---

## Milestone Breakdown & Execution Strategy

### Milestone 1: Foundation & FalkorDB Graph Core
- [x] Environment inspection (Node v26, npm, pnpm, Docker Desktop verified, `devbulchandani/devgraph` GitHub repo created).
- [ ] Initialize pnpm monorepo workspace (`pnpm-workspace.yaml`, root `tsconfig.json`, root `package.json`).
- [ ] Configure Docker / FalkorDB (`docker-compose.yml` exposing port 6379).
- [ ] Build `@devgraph/graph` package:
  - Connect to FalkorDB via `falkordb` official client.
  - Implement Graph Schema initialization and constraints/indexes.
  - Health check executing real Cypher graph query.
  - Comprehensive unit/integration tests for FalkorDB graph layer.

### Milestone 2: Repository Intelligence (Code Indexer)
- [ ] Build `@devgraph/code-indexer` package using TypeScript Compiler API (`ts-morph` or `typescript`):
  - Discover TypeScript/JavaScript files respecting ignore patterns.
  - Extract AST nodes: Files, Functions, Classes, Interfaces, TypeAliases, API contracts.
  - Extract Import/Export relationships and Call/Reference edges.
  - Extract test files and tested code relationships.
  - Persist entities and relationships into FalkorDB with stable identifiers.
  - Verify dependency path traversal in FalkorDB (e.g. `(File)-[:IMPORTS]->(File)-[:CONTAINS]->(Interface)`).

### Milestone 3: Shared Memory Service & MCP Protocol
- [ ] Build `@devgraph/shared` domain types (WorkSession, Change, Task, APIContract, ConflictFinding).
- [ ] Build central Shared Memory Service (`apps/server` & shared libraries):
  - Session lifecycle management (start, heartbeat, complete, stale session handling).
  - Uncommitted change tracking (`intended` vs `observed` vs `committed`).
  - Context retrieval subgraph queries.
- [ ] Build `@devgraph/mcp` server using `@modelcontextprotocol/sdk`:
  - `get_coding_context`: Subgraph context around files/symbols/tasks.
  - `announce_work`: Announce session, intended files, interfaces, check immediate overlap.
  - `publish_change`: Record uncommitted file/symbol/contract changes before git commit.
  - `check_conflicts`: Evaluate risks against current graph state.
  - `get_impact_analysis`: Downstream dependency traversal.
  - `record_decision`: Architectural decision records linked to contracts.
  - `complete_work`: Complete/abandon sessions and reconcile state.

### Milestone 4: Live Updates & Evidence-Backed Conflict Engine
- [ ] Build `@devgraph/conflict-engine`:
  - Category A (Direct Overlap): Overlapping file/range changes across active sessions.
  - Category B (Shared Symbol): Modifications to symbols depended on by concurrent tasks.
  - Category C (Contract Incompatibility): Breaking changes to shared API contracts/interfaces.
  - Category D (Architectural Constraint): Inconsistencies with recorded architectural decisions.
  - Category E (Downstream Impact): Informational blast radius analysis.
  - Ensure zero false certainty: provide graph-backed evidence citations, line references, and confidence levels.
- [ ] Event bus & real-time updates:
  - Event deduplication and optimistic concurrency.
  - Server-Sent Events (SSE) endpoint `/api/events` in backend.
  - Git working tree inspection (uncommitted diffs).

### Milestone 5: Frontend Dashboard
- [ ] Build React 19 + Vite + Tailwind CSS dashboard in `apps/web`:
  - View A: Project Overview (Index status, active sessions, recent changes, open findings).
  - View B: Interactive Dependency & Work Graph (visualizing Files, Symbols, Sessions, Changes, and Conflict edges).
  - View C: Conflict Center (Structured finding cards, evidence breakdown, affected tasks, recommended resolution).
  - View D: Agent Activity Feed (Live chronological SSE stream of tool calls, announcements, and state updates).
- [ ] Connect all views to actual backend REST + SSE endpoints.

### Milestone 6: AI Investigation Layer
- [ ] Provider interface supporting Gemini (`@google/genai` or `@google/generative-ai`) and OpenRouter.
- [ ] Deterministic fallback when no LLM credentials are provided or model call is skipped.
- [ ] Evidence-backed AI summaries and recommended resolution strategies.
- [ ] Guardrails: Read-only graph query allowlist; AI cannot overwrite files or invent repo facts.

### Milestone 7: Two-Agent End-to-End Demo & Verification
- [ ] Set up `demo/sample-repo` (Authentication API, UserAuthResponse contract, Frontend Login Consumer).
- [ ] Script two autonomous agent workflows:
  - Agent A: announces work on `auth.service.ts`, publishes breaking change to `UserAuthResponse` contract.
  - Agent B: calls `get_coding_context` for frontend login task, receives immediate warning with graph evidence path `(LoginPage.tsx) -> (authClient.ts) -> (UserAuthResponse)`.
  - Contrast with Scenario 2: Agent C publishes backward-compatible additive change; conflict engine confirms compatibility without false positives.
- [ ] Write integration test suite verifying the end-to-end flow with real FalkorDB queries.
- [ ] Document setup, MCP agent configuration, and hackathon demo reproduction.
