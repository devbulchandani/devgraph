import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  AnnounceWorkInputSchema,
  CheckConflictsInputSchema,
  CompleteWorkInputSchema,
  GetCodingContextInputSchema,
  GetImpactAnalysisInputSchema,
  PublishChangeInputSchema,
  RecordDecisionInputSchema,
  ReserveResourceInputSchema,
} from "@devgraph/shared";

describe("MCP Server Protocol & Tools", () => {
  let server: Server;
  let client: Client;
  let clientTransport: any;
  let serverTransport: any;
  let mockDb: any;
  let mockConflictEngine: any;
  const leases = new Map<string, { owner: string; expiresAt: number }>();

  beforeEach(async () => {
    mockDb = {
      getActiveSessions: vi.fn().mockResolvedValue([]),
      getActiveChanges: vi.fn().mockResolvedValue([]),
      getDownstreamDependencies: vi.fn().mockResolvedValue([]),
      upsertWorkSession: vi.fn().mockResolvedValue(undefined),
      upsertChange: vi.fn().mockResolvedValue(undefined),
      completeSession: vi.fn().mockResolvedValue(undefined),
      upsertDecision: vi.fn().mockResolvedValue(undefined),
    };

    mockConflictEngine = {
      evaluateConflicts: vi.fn().mockResolvedValue([]),
    };

    server = new Server(
      { name: "test-devgraph-mcp", version: "0.1.0" },
      { capabilities: { tools: {} } }
    );

    // Register Tool List
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_coding_context",
          description: "Get coding context",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, task_description: { type: "string" } }, required: ["project_id", "task_description"] },
        },
        {
          name: "announce_work",
          description: "Announce work",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, agent_id: { type: "string" }, task_description: { type: "string" } }, required: ["project_id", "agent_id", "task_description"] },
        },
        {
          name: "publish_change",
          description: "Publish change",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, session_id: { type: "string" }, changed_files: { type: "array", items: { type: "string" } } }, required: ["project_id", "session_id", "changed_files"] },
        },
        {
          name: "check_conflicts",
          description: "Check conflicts",
          inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
        },
        {
          name: "get_impact_analysis",
          description: "Impact analysis",
          inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
        },
        {
          name: "record_decision",
          description: "Record decision",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, title: { type: "string" }, rationale: { type: "string" }, author: { type: "string" } }, required: ["project_id", "title", "rationale", "author"] },
        },
        {
          name: "complete_work",
          description: "Complete work",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, session_id: { type: "string" } }, required: ["project_id", "session_id"] },
        },
        {
          name: "reserve_resource",
          description: "Reserve resource",
          inputSchema: { type: "object", properties: { project_id: { type: "string" }, resource_id: { type: "string" }, owner: { type: "string" } }, required: ["project_id", "resource_id", "owner"] },
        },
      ],
    }));

    // Register Call Tool Handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (name === "announce_work") {
        const input = AnnounceWorkInputSchema.parse(args);
        await mockDb.upsertWorkSession({ ...input, sessionId: "session:123" });
        return { content: [{ type: "text", text: JSON.stringify({ sessionId: "session:123", status: "registered" }) }] };
      }
      if (name === "publish_change") {
        const input = PublishChangeInputSchema.parse(args);
        await mockDb.upsertChange({ ...input, changeId: "change:123" });
        return { content: [{ type: "text", text: JSON.stringify({ changeId: "change:123", status: "published" }) }] };
      }
      if (name === "get_coding_context") {
        const input = GetCodingContextInputSchema.parse(args);
        return { content: [{ type: "text", text: JSON.stringify({ projectId: input.project_id, relevantFiles: [] }) }] };
      }
      if (name === "check_conflicts") {
        const input = CheckConflictsInputSchema.parse(args);
        const conflicts = await mockConflictEngine.evaluateConflicts({ projectId: input.project_id });
        return { content: [{ type: "text", text: JSON.stringify({ conflicts }) }] };
      }
      if (name === "record_decision") {
        const input = RecordDecisionInputSchema.parse(args);
        return { content: [{ type: "text", text: JSON.stringify({ decisionId: "decision:1", status: "recorded" }) }] };
      }
      if (name === "complete_work") {
        const input = CompleteWorkInputSchema.parse(args);
        await mockDb.completeSession(input.session_id, input.status);
        return { content: [{ type: "text", text: JSON.stringify({ sessionId: input.session_id, status: input.status }) }] };
      }
      if (name === "reserve_resource") {
        const input = ReserveResourceInputSchema.parse(args);
        const expiresAt = Date.now() + (input.ttl_seconds || 300) * 1000;
        leases.set(`${input.project_id}:${input.resource_id}`, { owner: input.owner, expiresAt });
        return { content: [{ type: "text", text: JSON.stringify({ acquired: true, resourceId: input.resource_id, owner: input.owner }) }] };
      }
      throw new Error(`Unknown tool ${name}`);
    });

    const [cTransport, sTransport] = InMemoryTransport.createLinkedPair();
    clientTransport = cTransport;
    serverTransport = sTransport;

    client = new Client({ name: "test-mcp-client", version: "0.1.0" }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("lists all 8 DevGraph coordination tools", async () => {
    const response = await client.listTools();
    const toolNames = response.tools.map((t) => t.name);
    expect(toolNames).toContain("get_coding_context");
    expect(toolNames).toContain("announce_work");
    expect(toolNames).toContain("publish_change");
    expect(toolNames).toContain("check_conflicts");
    expect(toolNames).toContain("get_impact_analysis");
    expect(toolNames).toContain("record_decision");
    expect(toolNames).toContain("complete_work");
    expect(toolNames).toContain("reserve_resource");
  });

  it("announces work and registers work session via announce_work tool", async () => {
    const res = await client.callTool({
      name: "announce_work",
      arguments: {
        project_id: "test-mcp-project",
        agent_id: "agent-alpha",
        task_description: "Build user login form",
        intended_files: ["src/Login.tsx"],
      },
    });

    const parsed = JSON.parse((res.content[0] as any).text);
    expect(parsed.status).toBe("registered");
    expect(parsed.sessionId).toBe("session:123");
    expect(mockDb.upsertWorkSession).toHaveBeenCalled();
  });

  it("publishes uncommitted changes via publish_change tool", async () => {
    const res = await client.callTool({
      name: "publish_change",
      arguments: {
        project_id: "test-mcp-project",
        session_id: "session:123",
        changed_files: ["src/Login.tsx"],
        change_type: "intended",
      },
    });

    const parsed = JSON.parse((res.content[0] as any).text);
    expect(parsed.status).toBe("published");
    expect(parsed.changeId).toBe("change:123");
    expect(mockDb.upsertChange).toHaveBeenCalled();
  });

  it("reserves expiring coordination resource via reserve_resource tool", async () => {
    const res = await client.callTool({
      name: "reserve_resource",
      arguments: {
        project_id: "test-mcp-project",
        resource_id: "src/types/auth.dto.ts",
        owner: "agent-alpha",
        ttl_seconds: 60,
      },
    });

    const parsed = JSON.parse((res.content[0] as any).text);
    expect(parsed.acquired).toBe(true);
    expect(parsed.resourceId).toBe("src/types/auth.dto.ts");
    expect(parsed.owner).toBe("agent-alpha");
  });
});
