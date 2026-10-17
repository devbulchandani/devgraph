import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { DevGraphDatabase } from "@devgraph/graph";
import { ConflictEngine } from "@devgraph/conflict-engine";
import {
  AnnounceWorkInputSchema,
  CheckConflictsInputSchema,
  CodingContextOutput,
  CompleteWorkInputSchema,
  GetCodingContextInputSchema,
  GetImpactAnalysisInputSchema,
  PublishChangeInputSchema,
  RecordDecisionInputSchema,
  ReserveResourceInputSchema,
  WorkSession,
} from "@devgraph/shared";

dotenv.config();

const db = new DevGraphDatabase();
const conflictEngine = new ConflictEngine(db);

const leases = new Map<string, { owner: string; expiresAt: number }>();

const server = new Server(
  {
    name: "devgraph-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_coding_context",
        description:
          "Retrieve graph-powered engineering memory, active concurrent changes, API contracts, and conflict warnings before coding.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Target project ID" },
            task_description: {
              type: "string",
              description: "What the agent intends to build or edit",
            },
            files_of_interest: {
              type: "array",
              items: { type: "string" },
              description: "Files the agent is about to touch or inspect",
            },
            symbols_of_interest: {
              type: "array",
              items: { type: "string" },
              description: "Functions, classes, or interfaces of interest",
            },
            include_active_changes: {
              type: "boolean",
              description: "Include uncommitted work from other agents",
              default: true,
            },
            include_related_dependencies: {
              type: "boolean",
              description: "Include downstream/upstream dependencies",
              default: true,
            },
            max_result_size: {
              type: "number",
              description: "Max number of items in subgraph",
            },
          },
          required: ["project_id", "task_description"],
        },
      },
      {
        name: "announce_work",
        description:
          "Announce a task, register an active work session, and check for immediate overlaps with concurrent agents.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            agent_id: { type: "string" },
            developer_id: { type: "string" },
            task_description: { type: "string" },
            intended_files: { type: "array", items: { type: "string" } },
            intended_symbols: { type: "array", items: { type: "string" } },
            expected_interfaces: { type: "array", items: { type: "string" } },
            base_commit: { type: "string" },
            branch: { type: "string" },
          },
          required: ["project_id", "agent_id", "task_description"],
        },
      },
      {
        name: "publish_change",
        description:
          "Publish an uncommitted intended or observed change so other agents can discover it before git commit.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            session_id: { type: "string" },
            event_id: { type: "string" },
            change_version: { type: "number", default: 1 },
            changed_files: { type: "array", items: { type: "string" } },
            changed_symbols: { type: "array", items: { type: "string" } },
            change_type: {
              type: "string",
              enum: ["intended", "observed", "committed", "merged"],
              default: "intended",
            },
            diff: { type: "string" },
            proposed_contract_changes: {
              type: "object",
              properties: {
                contract_name: { type: "string" },
                breaking: { type: "boolean" },
                changes: { type: "string" },
              },
              required: ["contract_name", "breaking", "changes"],
            },
            evidence: { type: "string" },
          },
          required: ["project_id", "session_id", "changed_files"],
        },
      },
      {
        name: "check_conflicts",
        description:
          "Analyze proposed changes against live work-state and graph dependencies for Categories A-E conflicts.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            session_id: { type: "string" },
            proposed_files: { type: "array", items: { type: "string" } },
            proposed_symbols: { type: "array", items: { type: "string" } },
            diff: { type: "string" },
            base_commit: { type: "string" },
          },
          required: ["project_id"],
        },
      },
      {
        name: "get_impact_analysis",
        description:
          "Trace downstream dependencies and affected components for a given file or symbol.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            target_file: { type: "string" },
            target_symbol: { type: "string" },
            target_contract: { type: "string" },
            depth: { type: "number", default: 3 },
          },
          required: ["project_id"],
        },
      },
      {
        name: "record_decision",
        description:
          "Record an architectural decision, rationale, and affected components in the shared graph memory.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            title: { type: "string" },
            rationale: { type: "string" },
            constraints: { type: "array", items: { type: "string" } },
            affected_components: { type: "array", items: { type: "string" } },
            author: { type: "string" },
          },
          required: ["project_id", "title", "rationale", "author"],
        },
      },
      {
        name: "complete_work",
        description:
          "Mark a work session as completed, abandoned, or blocked and reconcile with Git state.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            session_id: { type: "string" },
            status: {
              type: "string",
              enum: ["completed", "abandoned", "blocked"],
              default: "completed",
            },
            commit_hash: { type: "string" },
            summary: { type: "string" },
          },
          required: ["project_id", "session_id"],
        },
      },
      {
        name: "reserve_resource",
        description:
          "Acquire a time-bounded coordination lease on a critical file, contract, or symbol.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" },
            resource_id: { type: "string" },
            owner: { type: "string" },
            ttl_seconds: { type: "number", default: 300 },
          },
          required: ["project_id", "resource_id", "owner"],
        },
      },
    ],
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_coding_context": {
        const input = GetCodingContextInputSchema.parse(args);
        const activeSessions = await db.getActiveSessions(input.project_id);
        const activeChanges = await db.getActiveChanges(input.project_id);

        const dependencyPaths: Array<{ from: string; to: string; relation: string }> = [];
        for (const file of input.files_of_interest || []) {
          const downstreams = await db.getDownstreamDependencies(
            input.project_id,
            file,
            3
          );
          for (const d of downstreams) {
            dependencyPaths.push({
              from: d.from,
              to: d.to,
              relation: d.relation,
            });
          }
        }

        const potentialConflicts = await conflictEngine.evaluateConflicts({
          projectId: input.project_id,
          proposedFiles: input.files_of_interest || [],
          proposedSymbols: input.symbols_of_interest || [],
        });

        const context: CodingContextOutput = {
          projectId: input.project_id,
          query: {
            taskDescription: input.task_description,
            filesOfInterest: input.files_of_interest,
            symbolsOfInterest: input.symbols_of_interest,
          },
          relevantFiles: input.files_of_interest || [],
          relevantSymbols: (input.symbols_of_interest || []).map((s) => ({
            name: s,
            filePath: input.files_of_interest?.[0] || "",
            type: "symbol",
          })),
          dependencyPaths,
          activeWorkSessions: activeSessions.map((s) => ({
            sessionId: s.sessionId,
            agentId: s.agentId,
            taskDescription: s.taskDescription,
            status: s.status,
            lastHeartbeat: s.lastHeartbeat,
            intendedFiles: s.intendedFiles,
          })),
          activeChanges: activeChanges.map((c) => ({
            changeId: c.changeId,
            sessionId: c.sessionId,
            changeType: c.changeType,
            changedPaths: c.changedPaths,
            changedSymbols: c.changedSymbols,
            lifecycleStatus: c.lifecycleStatus,
            proposedContract: c.proposedContract,
          })),
          applicableDecisions: [],
          potentialConflicts,
          contextVersion: 1,
          freshnessTimestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(context, null, 2),
            },
          ],
        };
      }

      case "announce_work": {
        const input = AnnounceWorkInputSchema.parse(args);
        const sessionId = `session:${input.agent_id}:${Date.now()}`;
        const session: WorkSession = {
          sessionId,
          projectId: input.project_id,
          agentId: input.agent_id,
          developerId: input.developer_id,
          taskDescription: input.task_description,
          status: "active",
          startTime: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          baseCommit: input.base_commit,
          currentBranch: input.branch,
          version: 1,
          intendedFiles: input.intended_files,
          intendedSymbols: input.intended_symbols,
        };

        await db.upsertWorkSession(session);

        const immediateConflicts = await conflictEngine.evaluateConflicts({
          projectId: input.project_id,
          sessionId,
          proposedFiles: input.intended_files,
          proposedSymbols: input.intended_symbols,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId,
                  status: "registered",
                  immediateOverlapWarnings: immediateConflicts,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "publish_change": {
        const input = PublishChangeInputSchema.parse(args);
        const changeId = `change:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;
        const change = {
          changeId,
          sessionId: input.session_id,
          projectId: input.project_id,
          changedPaths: input.changed_files,
          changedSymbols: input.changed_symbols,
          changeType: input.change_type,
          lifecycleStatus: "proposed" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          evidence: input.evidence,
          version: input.change_version,
          diff: input.diff,
          proposedContract: input.proposed_contract_changes
            ? {
                contractName: input.proposed_contract_changes.contract_name,
                breaking: input.proposed_contract_changes.breaking,
                changes: input.proposed_contract_changes.changes,
              }
            : undefined,
        };

        await db.upsertChange(change);

        const conflicts = await conflictEngine.evaluateConflicts({
          projectId: input.project_id,
          sessionId: input.session_id,
          proposedFiles: input.changed_files,
          proposedSymbols: input.changed_symbols,
          diff: input.diff,
          proposedContractChanges: change.proposedContract,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  changeId,
                  status: "published",
                  conflictsDetected: conflicts,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "check_conflicts": {
        const input = CheckConflictsInputSchema.parse(args);
        const conflicts = await conflictEngine.evaluateConflicts({
          projectId: input.project_id,
          sessionId: input.session_id,
          proposedFiles: input.proposed_files,
          proposedSymbols: input.proposed_symbols,
          diff: input.diff,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ conflicts }, null, 2),
            },
          ],
        };
      }

      case "get_impact_analysis": {
        const input = GetImpactAnalysisInputSchema.parse(args);
        const filePath = input.target_file || "";
        const downstreams = await db.getDownstreamDependencies(
          input.project_id,
          filePath,
          input.depth
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  target: filePath || input.target_symbol || input.target_contract,
                  downstreamDependencies: downstreams,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "record_decision": {
        const input = RecordDecisionInputSchema.parse(args);
        const decisionId = `decision:${Date.now()}`;
        const decision = {
          decisionId,
          projectId: input.project_id,
          title: input.title,
          rationale: input.rationale,
          constraints: input.constraints,
          affectedComponents: input.affected_components,
          author: input.author,
          timestamp: new Date().toISOString(),
        };

        await db.upsertDecision(decision);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ decisionId, status: "recorded" }, null, 2),
            },
          ],
        };
      }

      case "complete_work": {
        const input = CompleteWorkInputSchema.parse(args);
        await db.completeSession(input.session_id, input.status);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: input.session_id,
                  status: input.status,
                  summary: input.summary,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "reserve_resource": {
        const input = ReserveResourceInputSchema.parse(args);
        const key = `${input.project_id}:${input.resource_id}`;
        const existing = leases.get(key);
        const now = Date.now();

        if (existing && existing.expiresAt > now && existing.owner !== input.owner) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  acquired: false,
                  reason: `Resource ${input.resource_id} is currently leased to ${existing.owner} until ${new Date(existing.expiresAt).toISOString()}`,
                }),
              },
            ],
          };
        }

        const expiresAt = now + input.ttl_seconds * 1000;
        leases.set(key, { owner: input.owner, expiresAt });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                acquired: true,
                resourceId: input.resource_id,
                owner: input.owner,
                expiresAt: new Date(expiresAt).toISOString(),
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${err.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[DevGraph MCP Server] Running on stdio transport");
}

main().catch((err) => {
  console.error("[DevGraph MCP Server] Fatal error:", err);
  process.exit(1);
});
