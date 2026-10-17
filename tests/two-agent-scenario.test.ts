import { describe, it, expect, vi, beforeEach } from "vitest";
import { DevGraphDatabase } from "@devgraph/graph";
import { CodeIndexer } from "@devgraph/code-indexer";
import { ConflictEngine } from "@devgraph/conflict-engine";
import path from "path";

describe("Two-Agent End-to-End Scenario Integration Test", () => {
  let mockDb: any;
  let indexer: CodeIndexer;
  let conflictEngine: ConflictEngine;
  const activeSessions: any[] = [];
  const activeChanges: any[] = [];

  beforeEach(() => {
    activeSessions.length = 0;
    activeChanges.length = 0;

    mockDb = {
      upsertProject: vi.fn().mockResolvedValue(undefined),
      upsertRepository: vi.fn().mockResolvedValue(undefined),
      upsertFile: vi.fn().mockResolvedValue(undefined),
      upsertSymbol: vi.fn().mockResolvedValue(undefined),
      upsertAPIContract: vi.fn().mockResolvedValue(undefined),
      createImportEdge: vi.fn().mockResolvedValue(undefined),
      upsertWorkSession: vi.fn().mockImplementation((s) => {
        activeSessions.push(s);
        return Promise.resolve();
      }),
      upsertChange: vi.fn().mockImplementation((c) => {
        activeChanges.push(c);
        return Promise.resolve();
      }),
      getActiveSessions: vi.fn().mockImplementation(() => Promise.resolve([...activeSessions])),
      getActiveChanges: vi.fn().mockImplementation(() => Promise.resolve([...activeChanges])),
      getDownstreamDependencies: vi.fn().mockImplementation((_proj, file) => {
        if (file.includes("LoginPage") || file.includes("authClient")) {
          return Promise.resolve([
            { from: "src/components/LoginPage.tsx", to: "src/client/authClient.ts", relation: "IMPORTS", depth: 1 },
            { from: "src/client/authClient.ts", to: "src/types/auth.dto.ts", relation: "IMPORTS", depth: 1 },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    indexer = new CodeIndexer(mockDb as unknown as DevGraphDatabase);
    conflictEngine = new ConflictEngine(mockDb as unknown as DevGraphDatabase);
  });

  it("completes full 2-agent lifecycle: uncommitted change detection before git commit", async () => {
    const projectId = "sample-auth-service";
    const repoRoot = path.resolve(process.cwd(), "demo/sample-repo");

    // 1. Index sample repo
    const indexResult = await indexer.indexRepository({
      projectId,
      repositoryId: "sample-auth-repo",
      repoRoot,
    });
    expect(indexResult.indexedFiles).toBeGreaterThanOrEqual(4);

    // 2. Agent A announces work on auth backend
    const sessionA = {
      sessionId: "session:agent-a:backend-auth",
      projectId,
      agentId: "agent-a",
      taskDescription: "Refactor UserAuthResponse contract",
      status: "active" as const,
      startTime: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      version: 1,
      intendedFiles: ["src/types/auth.dto.ts", "src/services/auth.service.ts"],
      intendedSymbols: ["UserAuthResponse", "authenticate"],
    };
    await mockDb.upsertWorkSession(sessionA);

    // 3. Agent A publishes an UNCOMMITTED breaking contract change before any git commit exists
    const breakingChange = {
      changeId: "change:agent-a:uncommitted-contract-break",
      sessionId: sessionA.sessionId,
      projectId,
      changedPaths: ["src/types/auth.dto.ts"],
      changedSymbols: ["UserAuthResponse"],
      changeType: "intended" as const,
      lifecycleStatus: "proposed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      diff: "- token: string;\n+ tokens: { access: string; refresh: string };",
      proposedContract: {
        contractName: "UserAuthResponse",
        breaking: true,
        changes: "Replaced property token: string with nested object tokens",
      },
      evidence: "UserAuthResponse in src/types/auth.dto.ts modified before commit",
    };
    await mockDb.upsertChange(breakingChange);

    // 4. Agent B comes along and queries context before writing frontend code
    const agentBFindings = await conflictEngine.evaluateConflicts({
      projectId,
      sessionId: "session:agent-b:frontend-login",
      proposedFiles: ["src/components/LoginPage.tsx", "src/client/authClient.ts"],
      proposedSymbols: ["handleLoginSubmit", "authClient"],
    });

    // 5. Verify DevGraph returns evidence-backed contract incompatibility warning
    const contractConflict = agentBFindings.find(
      (f) => f.riskCategory === "contract_incompatibility"
    );
    expect(contractConflict).toBeDefined();
    expect(contractConflict?.severity).toBe("high");
    expect(contractConflict?.explanation).toContain("UserAuthResponse");
    expect(contractConflict?.evidence).toContain("Replaced property token");
    expect(contractConflict?.affectedSessions).toContain(sessionA.sessionId);
    expect(contractConflict?.dependencyPath).toBeDefined();

    // 6. Contrast with Scenario 2: Agent C introduces a compatible change
    const agentCFindings = await conflictEngine.evaluateConflicts({
      projectId,
      sessionId: "session:agent-c:telemetry",
      proposedFiles: ["src/services/telemetry.ts"],
      proposedSymbols: ["logMetric"],
      proposedContractChanges: {
        contractName: "TelemetryEvent",
        breaking: false,
        changes: "Added optional field metadata?: Record<string, any>",
      },
    });

    const falseAlarms = agentCFindings.filter(
      (f) => f.riskCategory === "contract_incompatibility" && f.severity === "critical"
    );
    expect(falseAlarms.length).toBe(0);
  });
});
