import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app, db, conflictEngine } from "../apps/server/src/index.js";

describe("DevGraph Server REST API & Shared Memory", () => {
  beforeEach(() => {
    vi.spyOn(db, "healthCheck").mockResolvedValue({
      status: "healthy",
      latencyMs: 3,
      graphId: "devgraph",
      nodeCount: 15,
      relationshipCount: 22,
    });
    vi.spyOn(db, "upsertWorkSession").mockResolvedValue(undefined);
    vi.spyOn(db, "updateSessionHeartbeat").mockResolvedValue(undefined);
    vi.spyOn(db, "completeSession").mockResolvedValue(undefined);
    vi.spyOn(db, "upsertChange").mockResolvedValue(undefined);
    vi.spyOn(db, "getActiveSessions").mockResolvedValue([]);
    vi.spyOn(db, "getActiveChanges").mockResolvedValue([]);
    vi.spyOn(db, "getDownstreamDependencies").mockResolvedValue([]);
    vi.spyOn(conflictEngine, "evaluateConflicts").mockResolvedValue([]);
  });

  it("GET /api/health returns system health and FalkorDB status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.falkordb.status).toBe("healthy");
    expect(res.body.aiProvider).toBeDefined();
  });

  it("POST /api/projects/:projectId/sessions announces work and registers session", async () => {
    const res = await request(app)
      .post("/api/projects/test-proj/sessions")
      .send({
        agent_id: "agent-007",
        task_description: "Refactoring authentication handler",
        intended_files: ["src/auth.ts"],
        intended_symbols: ["login"],
      });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.session.agentId).toBe("agent-007");
    expect(res.body.immediateConflicts).toEqual([]);
    expect(db.upsertWorkSession).toHaveBeenCalled();
  });

  it("POST /api/projects/:projectId/changes publishes uncommitted change and checks conflicts", async () => {
    const res = await request(app)
      .post("/api/projects/test-proj/changes")
      .send({
        session_id: "session:agent-007:123",
        change_version: 1,
        changed_files: ["src/auth.ts"],
        changed_symbols: ["login"],
        change_type: "intended",
        diff: "+ console.log('auth');",
      });

    expect(res.status).toBe(201);
    expect(res.body.changeId).toBeDefined();
    expect(res.body.change.changedPaths).toContain("src/auth.ts");
    expect(db.upsertChange).toHaveBeenCalled();
  });

  it("GET /api/projects/:projectId/context returns subgraph context for agent", async () => {
    const res = await request(app)
      .get("/api/projects/test-proj/context")
      .query({
        task_description: "Implement user profile",
        files: "src/profile.ts",
      });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe("test-proj");
    expect(res.body.query.taskDescription).toBe("Implement user profile");
    expect(res.body.relevantFiles).toContain("src/profile.ts");
  });

  it("POST /api/investigate returns structured evidence-backed analysis", async () => {
    const res = await request(app)
      .post("/api/investigate")
      .send({
        finding: {
          findingId: "f-1",
          explanation: "Breaking contract change on UserAuthResponse",
          evidence: "token string removed",
        },
        context: { projectId: "test-proj" },
      });

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.compatibleStrategy).toBeDefined();
    expect(res.body.confidence).toBeGreaterThan(0);
  }, 15000);

  it("validates inputs and returns 400 for malformed requests", async () => {
    const res = await request(app)
      .post("/api/projects/test-proj/sessions")
      .send({
        // missing required agent_id and task_description
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
