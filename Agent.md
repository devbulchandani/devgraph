# DevGraph — Agent Operating Instructions

## Mission

Build DevGraph into a working, demonstrable hackathon MVP. Follow the architecture and requirements specified in this file.

## How You Must Work

* **Build, don't just plan.** Inspect the repository, create a concise implementation plan, and begin implementing immediately.
* Work autonomously through milestones. Do not stop after producing a plan or scaffolding.
* Prioritize a complete, working end-to-end demo over unnecessary features or premature abstraction.
* Use FalkorDB as the actual graph database. Do not replace it with an in-memory graph, SQLite, or another database for the core graph functionality.
* Verify the installed FalkorDB version, connection protocol, client compatibility, and available query syntax before implementing database access.
* Run the application, tests, type checks, and linting where configured. Fix failures rather than merely reporting them.
* Keep `docs/IMPLEMENTATION_PLAN.md` and `docs/IMPLEMENTATION_LOG.md` updated as implementation progresses.
* Never claim a feature works unless you have tested it or clearly label it unverified.
* Do not leave core features as TODOs, mock implementations, or hardcoded dashboard data.
* Seeded data is acceptable for the demo scenario, but the underlying system must also support real repository indexing and real graph queries.
* If a dependency, API key, or external service is unavailable, implement and test the best viable alternative without blocking unrelated work.
* Prefer small, working milestones. Keep the application runnable after each major milestone.

## Required Milestones



1. FalkorDB connection, graph schema, and repository setup.
2. Real repository indexing and dependency extraction.
3. MCP server with working tools for context retrieval, work announcements, incremental change publishing, conflict checking, and impact analysis.
4. Live work-state updates and evidence-backed conflict detection.
5. Dashboard connected to actual backend and graph data.
6. A reproducible two-agent demo showing an in-progress change being detected before commit.
7. Tests, setup instructions, MCP configuration, and hackathon demo documentation.

## Definition of Done

The project is not complete until the end-to-end demo works: Agent A publishes an uncommitted API change, Agent B queries DevGraph through MCP and sees the proposed change and its dependency path, and the conflict engine identifies a genuine incompatibility with supporting evidence. A compatible change must not be incorrectly reported as a definite conflict.

At every stage, state what works, what was tested, what remains broken, and the next implementation step.


## GitHub Repository and Continuous Version Control

### Repository Setup

* Inspect the current workspace and Git status before making changes.
* Check whether Git is initialized, whether a remote already exists, and whether the GitHub CLI (`gh`) is installed and authenticated.
* If this project is not already connected to a GitHub repository, create a new public GitHub repository named `devgraph` using the `gh` CLI.
* Before creating a repository, check whether `devgraph` already exists under the authenticated GitHub account. If it exists, verify that it is the intended repository before connecting to it.
* Prefer a public repository for the hackathon unless the user specifies otherwise or credentials, secrets, or other sensitive information make public visibility inappropriate.
* If authentication is missing, ask the user to authenticate rather than attempting to bypass authentication.
* Initialize Git if necessary, configure the remote, and make the initial commit once the project has a coherent baseline.
* Do not overwrite, force-push, or discard existing user work. Preserve existing branches, remotes, and commits unless a change is necessary and safe.

### Commit and Push Frequently

* Treat Git version control as part of the implementation workflow, not as a final step.
* Make small, meaningful commits after each completed milestone or independently working feature.
* Aim to commit and push after each major milestone and approximately every 30–60 minutes of active implementation, whichever comes first, when there are meaningful changes to save.
* Push completed commits to GitHub regularly so progress is backed up and visible throughout the hackathon.
* Use descriptive commit messages, such as:
  * `chore: initialize DevGraph monorepo`
  * `feat: add FalkorDB graph repository`
  * `feat: index TypeScript dependencies`
  * `feat: add MCP work announcement tools`
  * `feat: detect conflicting proposed changes`
  * `feat: add live project dashboard`
  * `test: add two-agent integration scenario`
  * `docs: document setup and hackathon demo`
* Before every commit, inspect `git status` and review the staged diff.
* Never commit `.env` files, API keys, access tokens, private keys, credentials, local databases, large generated datasets, build artifacts, or other sensitive information.
* Create and maintain a suitable `.gitignore` and `.env.example` with placeholder values only.
* Never use `git add -A` blindly if the workspace may contain unrelated user files. Review what will be staged.
* Never use `git push --force` or rewrite shared history to resolve ordinary problems.
* If a push fails, investigate the cause, preserve local commits, and retry safely when possible. Do not silently abandon unpushed work.
* Keep the default branch buildable whenever practical. If a feature is incomplete, commit only coherent, working progress and clearly document any limitations.
* Do not create empty commits or commit merely to satisfy a timer. Prioritize meaningful, reviewable changes.

### Final GitHub Verification

Before declaring the project complete:


1. Confirm all intended source files and documentation are committed.
2. Confirm the latest commits have been pushed successfully.
3. Verify that the GitHub remote points to the correct repository.
4. Include the GitHub repository URL, default branch, latest commit hash, and push status in the final report.
5. Report any uncommitted changes or commits that could not be pushed.

### Autonomy

Perform repository creation, Git initialization, commits, and pushes autonomously when the environment permits. Ask for user intervention only when an actual permission, authentication, visibility, or other blocking decision requires it.


# MASTER BUILD PROMPT: DEVGRAPH

You are the founding engineer, staff-level software architect, and autonomous implementation agent for **DevGraph**.

Your job is to design, implement, test, and document a working hackathon MVP. Do not stop at a plan, architecture diagram, prototype UI, or scaffold. Build the actual end-to-end application in the current workspace.

You have access to the terminal, filesystem, and available development tools. Inspect the environment, make sensible decisions, execute commands, run tests, debug failures, and maintain working software throughout the implementation.

Do not claim that a feature works unless you have verified it.


# 1. PRODUCT VISION

## Name

DevGraph

## Tagline

One shared brain for every developer and coding agent.

## Product description

DevGraph is a graph-powered engineering memory and coordination platform for software teams that use multiple developers and AI coding agents simultaneously.

It maintains a continuously updated understanding of:

* The repository's architecture and code dependencies.
* Developers and coding agents working on the project.
* Tasks, work sessions, branches, commits, and pull requests.
* Intended and observed in-progress changes, including uncommitted work.
* API contracts, shared interfaces, schemas, and architectural decisions.
* Relationships between concurrent changes and the components they affect.

Coding agents access this shared context through an MCP server.

Before coding, an agent retrieves relevant project context. While coding, it announces its work and publishes changes. Other agents can then discover these changes before they are committed, reducing duplicated work, incompatible assumptions, and integration problems.

DevGraph also analyzes proposed changes and warns about potential conflicts, providing evidence from the graph and source code.

## Core principle

Coding agents should behave like coordinated members of one engineering team, not isolated agents with separate and incomplete understandings of the same repository.


# 2. NON-NEGOTIABLE REQUIREMENTS



 1. FalkorDB must be the primary graph database powering project memory, relationship traversal, dependency analysis, and impact analysis.
 2. MCP must expose the shared project memory to compatible coding agents.
 3. Active work and uncommitted changes must be representable before a commit or pull request exists.
 4. Multiple agents must be able to read and update the same project context.
 5. Changes must have explicit ownership, timestamps, versions, and lifecycle states.
 6. The application must distinguish intended changes from observed changes, committed code, and merged code.
 7. Conflict warnings must be evidence-based and distinguish confirmed conflicts from possible semantic risks.
 8. The system must have a functional frontend, backend, MCP integration, and persistent graph storage.
 9. Provide a deterministic demonstration using two agent sessions and a repository with known dependencies.
10. Keep the implementation small enough to finish a working MVP within approximately 24 hours.
11. Do not build fake functionality that merely returns hardcoded AI responses or simulated success messages.
12. Do not silently ignore errors, invent test results, or claim integrations have been tested when they have not.
13. Do not expose API keys, credentials, or sensitive repository content in logs or frontend responses.
14. Never overwrite existing user files, credentials, or unrelated project configuration without inspecting them first.
15. Prioritize a working end-to-end workflow over optional integrations.


# 3. REQUIRED INITIAL ACTIONS

Before coding:



1. Inspect the current directory, existing project files, installed tools, available runtimes, and Git state.
2. Determine whether the workspace already contains a project. Preserve useful existing code and configuration.
3. Check whether Docker is available and whether FalkorDB is already running.
4. Check whether environment variables for a graph database or LLM provider are available without printing secret values.
5. Inspect the installed coding-agent capabilities and determine how to test MCP integration.
6. Choose the shortest reliable path to a working development environment.

Write a concise implementation plan to `docs/IMPLEMENTATION_PLAN.md`.

Then begin implementing immediately.

Do not stop after writing the plan and asking me for permission to continue.

If an external dependency requires credentials or unavailable infrastructure, build the integration, document the exact missing requirement, and continue with everything that can be tested locally.


# 4. TECHNICAL STACK

Use a TypeScript-first monorepo.

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* A lightweight graph visualization library, preferably React Flow or Cytoscape.js
* A clean, responsive, professional developer-tool interface

## Backend

* Node.js
* TypeScript
* Express
* Zod for input validation
* Structured logging
* Clear service boundaries

## Graph database

* FalkorDB
* A maintained, compatible client or supported graph protocol
* Cypher queries for graph creation, retrieval, dependency traversal, and impact analysis

Use the current official FalkorDB documentation to verify connection setup, query syntax, client compatibility, and deployment requirements.

Do not assume Neo4j-specific features work identically in FalkorDB.

## Agent integration

* MCP using the official TypeScript SDK and its current supported APIs
* Stdio transport for local coding-agent integrations
* Streamable HTTP transport only if needed for remote multi-agent access
* Explicit authentication for remotely exposed MCP endpoints

Prefer one shared application service used by both MCP tools and REST endpoints. Avoid duplicating business logic.

## Code analysis

Initially support TypeScript and JavaScript repositories.

Use the TypeScript compiler API to extract, where possible:

* Files and modules.
* Functions, classes, interfaces, and exported symbols.
* Import and export relationships.
* Function calls and symbol references.
* Type definitions and likely API contracts.
* Test files and references to tested code.

Implement incremental indexing where feasible, and provide a reliable full reindex fallback.

## Repository integration

* Local Git repository inspection.
* Branch and commit metadata.
* Git diff parsing.
* GitHub API and webhooks as an optional integration.

The local demonstration must work without requiring a GitHub token.

## AI provider

Use an LLM provider through a small provider interface.

Support whichever provider is configured through environment variables, such as OpenRouter, Amazon Bedrock, or Gemini, if its available SDK and credentials permit.

Do not hardcode model names, credentials, or provider assumptions.

If no LLM credentials are configured, the application must still support graph queries, deterministic dependency analysis, and evidence-backed conflict findings. Display a clear indication when AI explanations are unavailable.

The AI must not be the source of truth for repository state.


# 5. REPOSITORY STRUCTURE

Use a structure similar to:

devgraph/
apps/
web/
server/
mcp/
packages/
shared/
graph/
code-indexer/
conflict-engine/
demo/
sample-repo/
scenarios/
scripts/
docs/
tests/
.env.example
docker-compose.yml
package.json
[README.md](http://README.md)

Adapt this layout if a simpler arrangement materially accelerates implementation, but maintain clear boundaries between frontend, backend, graph access, code analysis, and MCP tools.

Use a consistent package manager based on the environment. Provide reproducible setup commands and a lockfile.


# 6. FALKORDB GRAPH DATA MODEL

Design and implement a versioned graph schema.

Use appropriate node labels and stable identifiers.

Required entities:

* Project
* Repository
* Developer
* CodingAgent
* WorkSession
* Task
* File
* Function
* Class
* APIContract
* DatabaseSchema
* Change
* Decision
* Test
* Commit
* PullRequest
* Branch

Required relationships include:

(Project)-\[:CONTAINS\]->(Repository)

(Repository)-\[:CONTAINS\]->(File)

(File)-\[:CONTAINS\]->(Function)

(File)-\[:IMPORTS\]->(File)

(Function)-\[:CALLS\]->(Function)

(Function)-\[:USES\]->(APIContract)

(Developer)-\[:OWNS\]->(Task)

(CodingAgent)-\[:EXECUTES\]->(WorkSession)

(WorkSession)-\[:WORKS_ON\]->(Task)

(WorkSession)-\[:PROPOSES\]->(Change)

(Change)-\[:MODIFIES\]->(File)

(Change)-\[:AFFECTS\]->(Function)

(Change)-\[:AFFECTS\]->(APIContract)

(Task)-\[:DEPENDS_ON\]->(Task)

(Decision)-\[:GOVERNS\]->(APIContract)

(Change)-\[:VALIDATED_BY\]->(Test)

(PullRequest)-\[:INCLUDES\]->(Commit)

Adapt the relationships as needed to accurately model ownership and lifecycle.

## Required properties

For work sessions:

* Session ID.
* Project ID.
* Agent ID.
* Developer ID, if known.
* Task description.
* Status.
* Start time.
* Last heartbeat.
* Base commit.
* Current branch.
* Version.

For changes:

* Change ID.
* Session ID.
* Project ID.
* Changed paths and symbols.
* Change type.
* Intended versus observed state.
* Lifecycle status.
* Base commit.
* Creation and update timestamps.
* Evidence references.
* Confidence where applicable.
* Version.

For code entities:

* Stable ID.
* Repository ID.
* Relative file path.
* Symbol name and type, where applicable.
* Last indexed revision.
* Relevant source location.

Do not store raw source code in graph nodes unless necessary. Prefer metadata and references to source files. If source snippets are stored, apply size limits and repository access controls.

## Graph correctness

* Scope all entities and queries to the correct project and repository.
* Use stable IDs to avoid duplicate nodes during reindexing.
* Parameterize graph queries where supported.
* Validate inputs and prevent query injection.
* Make indexing and event processing idempotent.
* Provide graph schema versioning and a migration strategy.
* Avoid deleting unrelated graph data during a project refresh.

Implement a health check that verifies connectivity and executes a small real graph query.


# 7. SHARED MEMORY SERVICE

Create a central service responsible for recording and retrieving project context.

It must support:



 1. Creating and updating work sessions.
 2. Announcing tasks and intended changes.
 3. Publishing observed file changes.
 4. Recording architectural decisions.
 5. Retrieving relevant context for a task.
 6. Finding active work related to a file, symbol, API, or task.
 7. Reconciling working changes with Git commits and merges.
 8. Detecting stale sessions.
 9. Returning graph-derived evidence.
10. Recording event history and context versions.

Every mutation must include project identity, actor identity, timestamp, and appropriate validation.

Implement optimistic concurrency or another safe mechanism for concurrent updates.

Do not allow one agent's update to silently overwrite another agent's unrelated work.

Treat a work session as active only according to explicit lifecycle and heartbeat rules. Stale sessions must be marked as potentially stale rather than silently treated as current.


# 8. MCP TOOLS

Implement these tools using the current official MCP TypeScript SDK.

## Tool 1: get_coding_context

Input:

* project_id
* task description
* optional files of interest
* optional symbols of interest
* include_active_changes
* include_related_dependencies
* optional maximum result size

Output:

* Relevant files and symbols.
* Relevant dependency paths.
* Active tasks and work sessions.
* Intended and observed changes.
* Applicable architectural decisions.
* API contracts and constraints.
* Potential conflicts.
* Evidence references.
* Context version and freshness metadata.

Retrieve a focused subgraph instead of dumping the whole repository.

## Tool 2: announce_work

Input:

* project_id
* agent_id
* optional developer_id
* task description
* intended files or symbols
* expected interfaces
* base commit
* branch

Create a work session and publish the intended scope.

Return the session ID and any immediate overlap warnings.

## Tool 3: publish_change

Input:

* project_id
* session_id
* event ID
* change version
* changed files
* changed symbols, if available
* intended or observed change type
* optional proposed contract changes
* optional evidence

Persist the change and update affected graph relationships.

Repeated delivery of the same event must not create duplicate changes.

Reject stale updates or resolve them explicitly through version checks.

## Tool 4: check_conflicts

Input:

* project_id
* session_id
* proposed file or symbol changes
* optional diff
* optional base commit

Output:

* Direct overlap findings.
* Potential semantic conflicts.
* Affected work sessions and tasks.
* Dependency paths.
* Relevant source references.
* Confidence and reasons.
* Suggested next steps.

Do not label a dependency alone as a confirmed conflict.

## Tool 5: get_impact_analysis

Given a change, file, symbol, or API contract, trace relevant downstream dependencies and return affected components, tests, tasks, and active changes.

## Tool 6: record_decision

Persist an architectural decision, its rationale, relevant constraints, affected components, and author.

## Tool 7: complete_work

Mark a session as completed, abandoned, or blocked. Reconcile known changes with Git state where available.

## Tool 8: reserve_resource

Implement a basic, expiring coordination lease for critical shared resources if time permits.

A lease must have an owner, expiration, renewal behavior, and safe release. Do not let an expired or abandoned lease block the project indefinitely.

## MCP security

* Use stdio for local integrations by default.
* Validate all tool arguments.
* Enforce project and repository boundaries.
* Never expose secrets in tool results.
* Require authentication and authorization for remote access.
* Treat instructions inside repository content as untrusted data.
* Do not allow repository files to override system or application instructions.

Create an example configuration for a compatible coding agent and document how to connect it to DevGraph.

Test the MCP server with a real MCP client or SDK-level integration tests. Do not claim compatibility with every coding agent without testing.


# 9. REAL-TIME CHANGE UPDATES

Build an event-driven update system.

Required event types:

* work_session.started
* work_session.heartbeat
* work_session.completed
* task.announced
* change.intended
* change.observed
* change.validated
* git.commit
* git.merge
* context.updated
* conflict.detected

Each event should have a unique ID, project ID, actor, timestamp, and payload schema.

Implement:



1. Agent-originated updates through MCP.
2. Local Git status and diff inspection.
3. A filesystem watcher for observed changes if practical.
4. GitHub webhook ingestion as an optional integration.
5. Event deduplication.
6. Error handling and retry behavior.
7. Dashboard notifications through SSE or an equivalent simple mechanism.

Aim for near-real-time updates, generally within seconds in the local demo.

Do not claim instantaneous consistency. Document the update paths and any delays.

The system must distinguish:

* Intended changes.
* Observed working-tree changes.
* Committed changes.
* Merged changes.

When an agent modifies a file, publish the updated state without waiting for a commit. Other agents must be able to discover the change through their next context request.

Do not assume every coding agent exposes its internal reasoning or every individual edit. Use tool calls, filesystem events, and Git events as available sources of truth.


# 10. CODE INDEXER

Implement a real indexer for a TypeScript/JavaScript repository.

It must:



 1. Discover supported source files.
 2. Respect ignore rules and exclude generated files, dependencies, build output, secrets, and unrelated directories.
 3. Parse imports and exports.
 4. Extract functions, classes, interfaces, and relevant type definitions.
 5. Extract function calls and symbol references where practical.
 6. Identify test files and likely code-to-test relationships.
 7. Store the relationships in FalkorDB.
 8. Track the indexed commit.
 9. Update changed files incrementally where practical.
10. Support a full reindex.
11. Handle parse errors without crashing the entire indexing process.
12. Report index coverage and failures.

Do not pretend static analysis can discover every dynamic dependency.

Where relationships cannot be resolved reliably, label them as inferred or unresolved.

The initial supported scope should be explicit in the README.


# 11. CONFLICT ENGINE

Implement a deterministic conflict engine before adding LLM-based reasoning.

## Risk category A: direct overlap

Two active changes modify the same file or overlapping source ranges.

Report a confirmed overlap only when the evidence supports it. A same-file change is not necessarily a Git merge conflict.

## Risk category B: shared symbol

One change modifies a function, class, or interface referenced by another active change.

Report a potential integration risk with the dependency path.

## Risk category C: contract incompatibility

A proposed API or shared type change conflicts with another task's recorded expectations.

Use explicit contract metadata or validated diff evidence when possible. If the incompatibility is inferred, say so.

## Risk category D: architectural constraint

A change appears inconsistent with a recorded architectural decision.

Show the decision and the relevant evidence.

## Risk category E: dependency impact

A proposed change affects downstream components or tests.

This may be useful impact information without necessarily constituting a conflict.

## Output requirements

Every finding must contain:

* Finding ID.
* Project and change IDs.
* Risk category.
* Severity.
* Status: confirmed, likely, possible, or informational.
* Explanation.
* Evidence and source references.
* Affected components and active sessions.
* Recommended next action.
* Detection timestamp.

Do not invent line numbers or source references.

Implement a graph-powered dependency traversal and prove that its output comes from actual FalkorDB relationships.


# 12. AI INVESTIGATION LAYER

Once deterministic functionality works, add the LLM layer.

The AI should:



1. Receive structured findings and relevant graph evidence.
2. Summarize the engineering risk.
3. Explain which developers, tasks, and components may be affected.
4. Suggest a compatible implementation strategy.
5. Recommend tests that could validate the change.
6. Ask for more evidence when the graph is insufficient.
7. Clearly label uncertainty.

If useful, let the model request additional read-only graph queries through a controlled tool interface.

Do not let the model execute arbitrary Cypher, shell commands, or unrestricted file operations.

Use an allowlisted set of query operations and validated arguments.

Do not ask the model to infer actual repository state from memory when the graph or source files can be queried directly.

Do not allow the AI to autonomously rewrite shared files or merge branches in the MVP.

AI explanations must cite evidence returned by the graph, indexer, Git, or tests. Never fabricate evidence.


# 13. FRONTEND AND USER EXPERIENCE

Build a polished developer-tool dashboard.

Avoid a generic chatbot layout. The interface should immediately communicate that this is an engineering coordination product.

## View A: Project overview

Show:

* Project name and repository.
* Index status.
* Active developers and agents.
* Active work sessions.
* Recent changes.
* Open risk findings.
* Latest context update.

## View B: Dependency graph

Visualize:

* Files.
* Functions and interfaces.
* Agents and work sessions.
* Proposed changes.
* Dependency relationships.
* Affected components.

Use meaningful visual differentiation for entity types and status. Include loading, empty, and error states.

The graph must be populated from actual backend data.

## View C: Conflict center

List risk findings with:

* Severity and confidence.
* Risk category.
* Affected agents and tasks.
* Relevant source files.
* Evidence-backed explanation.
* Recommended next action.

Clicking a finding should reveal its dependency path and supporting evidence.

## View D: Agent activity

Show a chronological event feed of:

* Work announcements.
* Active changes.
* Context requests.
* Conflict warnings.
* Commits and merges.
* Session completion.

## UX requirements

* Responsive layout.
* Clear typography and spacing.
* Useful empty states.
* No dead buttons.
* No fake live indicators.
* No hardcoded production findings.
* Meaningful error messages.
* Clear distinction between live data and seeded demo data.

Use seeded data only in an explicit demo project or demo mode.


# 14. DEMONSTRATION SCENARIO

Create a reproducible sample TypeScript repository.

It should contain:

* A backend authentication API.
* A shared response type.
* A frontend consumer.
* A service or middleware dependency.
* Relevant tests.
* Two incompatible proposed changes.
* At least one related but compatible change.

## Demo flow

Agent A is assigned a task to change the authentication response.

Agent A announces its task and publishes an intended contract change through MCP.

Agent B is assigned a task to build a frontend login flow.

Agent B calls get_coding_context before implementing its feature.

DevGraph returns Agent A's active change, the relevant API contract, and the dependency path to the frontend.

Agent B's context response includes an evidence-backed warning and the recommended compatible implementation.

Then demonstrate a second scenario where two related changes are compatible, ensuring the system does not report every dependency as a definite conflict.

The demo must use actual graph queries and the shared memory service. Use deterministic scripted agent sessions if live LLM calls would make the demo unreliable.

Provide scripts to initialize the demo repository and reproduce the scenario.


# 15. TESTING REQUIREMENTS

Write automated tests for:

* Graph database connection and health checks.
* Graph node and relationship creation.
* Project scoping.
* Idempotent indexing.
* Dependency traversal.
* MCP input validation.
* Work-session creation and updates.
* Event deduplication.
* Concurrent update handling.
* Context retrieval.
* Conflict categorization.
* Stale session handling.
* Git reconciliation.
* API error responses.
* Dashboard integration with backend data.

Create at least one end-to-end test for the two-agent scenario.

Include a test proving that an in-progress change becomes available to another agent before a Git commit exists.

Include a test proving that a compatible related change does not automatically become a confirmed conflict.

Run the tests and report the actual results.

If a test requires unavailable infrastructure, explicitly report that limitation rather than marking it as passed.


# 16. SECURITY AND RELIABILITY

Implement sensible MVP-level security.

* Validate all external inputs.
* Use parameterized graph queries.
* Keep credentials in environment variables.
* Provide a safe .env.example containing placeholders only.
* Add reasonable request size limits.
* Avoid logging full source files or secrets.
* Restrict repository paths to prevent directory traversal.
* Ignore secret files during indexing.
* Scope every query to its project.
* Protect remote MCP and administrative endpoints.
* Prevent event replay from creating duplicate changes.
* Use safe defaults when AI or graph services are unavailable.

Document which security features are implemented and which remain production requirements.


# 17. DEVELOPER EXPERIENCE

Provide:

* [README.md](http://README.md).
* .env.example.
* docker-compose.yml if Docker-based local services are appropriate.
* Reproducible installation instructions.
* Development and production build scripts.
* Graph initialization and schema migration scripts.
* Repository indexing command.
* Demo seed command.
* Test commands.
* MCP client configuration example.
* API documentation.
* Architecture diagram.
* Known limitations.
* Troubleshooting instructions.

Provide one simple path to start the complete local demo.

If a cloud graph database is available and configured, support it without requiring local Docker for the graph service.

Do not make the application dependent on a paid external service for its deterministic core workflow.


# 18. IMPLEMENTATION STRATEGY

Work in the following milestones.

## Milestone 1: Foundation

* Inspect environment.
* Create project structure.
* Set up TypeScript and package management.
* Start FalkorDB or connect to an existing instance.
* Create the graph schema.
* Implement health checks and basic graph queries.

## Milestone 2: Repository intelligence

* Build the TypeScript/JavaScript indexer.
* Extract file and symbol dependencies.
* Persist the graph.
* Verify dependency traversal against a real sample repository.

## Milestone 3: Shared memory and MCP

* Implement work sessions and change records.
* Build get_coding_context.
* Build announce_work.
* Build publish_change.
* Build check_conflicts.
* Test two independent MCP client sessions.

## Milestone 4: Live updates and conflict engine

* Implement event processing.
* Track in-progress changes.
* Reconcile Git state.
* Build dependency-aware risk detection.
* Test seeded conflict scenarios.

## Milestone 5: Frontend

* Build the project overview.
* Build the graph visualization.
* Build the conflict center.
* Build the activity feed.
* Connect all views to real backend endpoints.

## Milestone 6: AI investigation

* Integrate the configured LLM.
* Generate evidence-backed explanations.
* Provide safe, controlled graph investigation tools.
* Preserve deterministic behavior when the model is unavailable.

## Milestone 7: Verification and submission

* Run automated tests.
* Run the full two-agent demo.
* Fix critical failures.
* Test setup from a clean environment if feasible.
* Write complete documentation.
* Prepare a demo script.
* Report the actual project status and remaining limitations.

After each milestone, run the relevant tests before proceeding.

If a milestone becomes unexpectedly expensive, reduce scope intelligently without breaking the core workflow.

Do not wait for my approval between ordinary implementation steps. Ask only when a genuine external decision or irreversible action is necessary.


# 19. DEFINITION OF DONE

The MVP is complete only when the following workflow succeeds:



 1. FalkorDB starts or a configured graph instance is reachable.
 2. DevGraph indexes the sample repository.
 3. The graph contains real code dependencies.
 4. A first agent creates a work session.
 5. The first agent publishes an in-progress API change.
 6. The change is stored before a commit exists.
 7. A second agent requests coding context.
 8. The second agent receives the active change and relevant dependency path.
 9. The conflict engine identifies the seeded incompatibility and provides evidence.
10. The frontend displays the actual work sessions, graph relationships, and finding.
11. The system can distinguish a related but compatible change.
12. The test suite verifies the essential workflow.
13. Setup and demo instructions work as documented.

A project with an attractive dashboard but no real graph-powered context retrieval does not satisfy the definition of done.

A working MCP server that cannot update shared context does not satisfy the definition of done.

A conflict detector that only compares filenames does not satisfy the intended semantic-analysis capability, although filename overlap may be used as one deterministic signal.


# 20. FINAL OPERATING INSTRUCTIONS

Be autonomous, pragmatic, and evidence-driven.

* Start by inspecting the actual environment.
* Implement real code rather than producing only recommendations.
* Prefer maintained libraries and official documentation.
* Verify FalkorDB and MCP APIs against current documentation.
* Keep the implementation understandable and maintainable.
* Use typed interfaces and shared validation schemas.
* Run tests and inspect failures.
* Never silently replace working user code.
* Avoid unnecessary abstractions.
* Do not expand scope before the core workflow works.
* Maintain a concise progress log in docs/IMPLEMENTATION_LOG.md.
* Update the README to reflect the actual state of the implementation.
* If a blocker occurs, document it, implement a reasonable fallback, and continue.
* Do not claim that a cloud deployment, live integration, or external API works unless it has actually been verified.

At the end of each milestone, report:



1. What was implemented.
2. Which files were created or changed.
3. Which commands and tests were run.
4. The actual test results.
5. Remaining blockers.
6. The next milestone.

At the end of the task, provide:

* The implemented architecture.
* The exact commands to start the application.
* The exact commands to run tests and reproduce the demo.
* The MCP configuration required to connect a coding agent.
* The completed and incomplete requirements.
* Any external credentials or setup still required.

**Begin now. Inspect the workspace, establish FalkorDB connectivity, implement Milestone 1, and continue through the milestones until the working MVP is complete or a genuine external blocker prevents further progress.**



