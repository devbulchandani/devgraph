import { describe, it, expect, vi, beforeEach } from "vitest";
import { DevGraphDatabase } from "../packages/graph/src/index.js";

describe("DevGraphDatabase FalkorDB Layer", () => {
  let db: DevGraphDatabase;

  beforeEach(() => {
    db = new DevGraphDatabase({
      host: "127.0.0.1",
      port: 6379,
      graphId: "test-devgraph",
    });
  });

  it("initializes with default or custom configuration", () => {
    expect(db).toBeDefined();
    expect(typeof db.connect).toBe("function");
    expect(typeof db.healthCheck).toBe("function");
    expect(typeof db.query).toBe("function");
  });

  it("healthCheck returns unhealthy status gracefully when database is unreachable", async () => {
    // Port 63999 is guaranteed to not have a server listening
    const offlineDb = new DevGraphDatabase({
      host: "127.0.0.1",
      port: 63999,
      graphId: "test-offline",
    });

    const health = await offlineDb.healthCheck();
    expect(health.status).toBe("unhealthy");
    expect(health.error).toBeDefined();
    expect(health.graphId).toBe("test-offline");
  });

  it("handles queries safely with parameterized input", async () => {
    const mockGraph = {
      query: vi.fn().mockResolvedValue({ data: [[1]] }),
    };
    (db as any).graph = mockGraph;
    (db as any).client = {};

    const res = await db.query("MATCH (p:Project {id: $id}) RETURN p", {
      id: "proj-safe",
    });

    expect(mockGraph.query).toHaveBeenCalledWith(
      "MATCH (p:Project {id: $id}) RETURN p",
      { params: { id: "proj-safe" } }
    );
    expect(res.data[0][0]).toBe(1);
  });
});
