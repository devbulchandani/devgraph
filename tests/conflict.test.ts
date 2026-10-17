import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictEngine } from "../packages/conflict-engine/src/index.js";
import { DevGraphDatabase } from "../packages/graph/src/index.js";
import { Change, WorkSession } from "@devgraph/shared";

describe("ConflictEngine Semantic Risk Detection", () => {
  let mockDb: any;
  let engine: ConflictEngine;

  beforeEach(() => {
    mockDb = {
      getActiveSessions: vi.fn(),
      getActiveChanges: vi.fn(),
      getDownstreamDependencies: vi.fn().mockResolvedValue([]),
    };
    engine = new ConflictEngine(mockDb as unknown as DevGraphDatabase);
  });

  it("detects Category A (Direct Overlap) on concurrently modified files", async () => {
    const existingSession: WorkSession = {
      sessionId: "session:agent-1:100",
      projectId: "proj-1",
      agentId: "agent-1",
      taskDescription: "Fixing auth bugs",
      status: "active",
      startTime: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      version: 1,
      intendedFiles: ["src/services/auth.service.ts"],
      intendedSymbols: [],
    };

    const existingChange: Change = {
      changeId: "change:1",
      sessionId: "session:agent-1:100",
      projectId: "proj-1",
      changedPaths: ["src/services/auth.service.ts"],
      changedSymbols: [],
      changeType: "intended",
      lifecycleStatus: "proposed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    mockDb.getActiveSessions.mockResolvedValue([existingSession]);
    mockDb.getActiveChanges.mockResolvedValue([existingChange]);

    const findings = await engine.evaluateConflicts({
      projectId: "proj-1",
      sessionId: "session:agent-2:200",
      proposedFiles: ["src/services/auth.service.ts"],
    });

    const overlapFinding = findings.find(
      (f) => f.riskCategory === "direct_overlap"
    );
    expect(overlapFinding).toBeDefined();
    expect(overlapFinding?.severity).toBe("high");
    expect(overlapFinding?.status).toBe("confirmed");
    expect(overlapFinding?.affectedSessions).toContain("session:agent-1:100");
  });

  it("detects Category C (Contract Incompatibility) with evidence citations", async () => {
    const breakingChange: Change = {
      changeId: "change:breaking:1",
      sessionId: "session:agent-a:101",
      projectId: "proj-1",
      changedPaths: ["src/types/auth.dto.ts"],
      changedSymbols: ["UserAuthResponse"],
      changeType: "intended",
      lifecycleStatus: "proposed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      proposedContract: {
        contractName: "UserAuthResponse",
        breaking: true,
        changes: "Removed token string, added tokens object",
      },
    };

    mockDb.getActiveSessions.mockResolvedValue([]);
    mockDb.getActiveChanges.mockResolvedValue([breakingChange]);
    mockDb.getDownstreamDependencies.mockResolvedValue([
      { from: "src/client/authClient.ts", to: "src/types/auth.dto.ts", relation: "IMPORTS", depth: 1 },
    ]);

    const findings = await engine.evaluateConflicts({
      projectId: "proj-1",
      sessionId: "session:agent-b:202",
      proposedFiles: ["src/client/authClient.ts"],
    });

    const contractFinding = findings.find(
      (f) => f.riskCategory === "contract_incompatibility"
    );
    expect(contractFinding).toBeDefined();
    expect(contractFinding?.severity).toBe("high");
    expect(contractFinding?.explanation).toContain("UserAuthResponse");
    expect(contractFinding?.evidence).toContain("Removed token string");
    expect(contractFinding?.dependencyPath).toBeDefined();
  });

  it("proves compatible changes are NOT reported as false conflicts", async () => {
    mockDb.getActiveSessions.mockResolvedValue([]);
    mockDb.getActiveChanges.mockResolvedValue([]);

    // Agent proposes a backward-compatible change
    const findings = await engine.evaluateConflicts({
      projectId: "proj-1",
      sessionId: "session:agent-c:303",
      proposedFiles: ["src/utils/logger.ts"],
      proposedContractChanges: {
        contractName: "LoggerConfig",
        breaking: false,
        changes: "Added optional field debugLevel?: string",
      },
    });

    const breakingConflicts = findings.filter(
      (f) => f.riskCategory === "contract_incompatibility"
    );
    expect(breakingConflicts.length).toBe(0);
  });
});
