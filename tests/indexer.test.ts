import { describe, it, expect, vi, beforeEach } from "vitest";
import { CodeIndexer } from "../packages/code-indexer/src/index.js";
import { DevGraphDatabase } from "../packages/graph/src/index.js";
import path from "path";

describe("CodeIndexer AST Analysis", () => {
  let mockDb: any;
  let indexer: CodeIndexer;

  beforeEach(() => {
    mockDb = {
      upsertProject: vi.fn().mockResolvedValue(undefined),
      upsertRepository: vi.fn().mockResolvedValue(undefined),
      upsertFile: vi.fn().mockResolvedValue(undefined),
      upsertSymbol: vi.fn().mockResolvedValue(undefined),
      upsertAPIContract: vi.fn().mockResolvedValue(undefined),
      createImportEdge: vi.fn().mockResolvedValue(undefined),
    };
    indexer = new CodeIndexer(mockDb as unknown as DevGraphDatabase);
  });

  it("discovers files and extracts functions, interfaces, and contracts from sample-repo", async () => {
    const repoRoot = path.resolve(process.cwd(), "demo/sample-repo");
    const result = await indexer.indexRepository({
      projectId: "test-auth-project",
      repositoryId: "test-auth-repo",
      repoRoot,
    });

    expect(result.errors).toEqual([]);
    expect(result.indexedFiles).toBeGreaterThanOrEqual(5);
    expect(result.functionsCount).toBeGreaterThanOrEqual(2);
    expect(result.interfacesCount).toBeGreaterThanOrEqual(2);
    expect(result.contractsCount).toBeGreaterThanOrEqual(1);
    expect(result.importsCount).toBeGreaterThanOrEqual(2);

    // Verify FalkorDB persistence calls
    expect(mockDb.upsertProject).toHaveBeenCalledWith(
      "test-auth-project",
      "sample-repo",
      repoRoot
    );
    expect(mockDb.upsertRepository).toHaveBeenCalledWith(
      "test-auth-repo",
      "test-auth-project",
      "test-auth-repo"
    );
    expect(mockDb.upsertFile).toHaveBeenCalled();
    expect(mockDb.upsertSymbol).toHaveBeenCalled();
    expect(mockDb.upsertAPIContract).toHaveBeenCalled();
    expect(mockDb.createImportEdge).toHaveBeenCalled();
  });

  it("handles parse errors gracefully without crashing the whole indexer", async () => {
    const result = await indexer.indexRepository({
      projectId: "test-project",
      repositoryId: "test-repo",
      repoRoot: path.resolve(process.cwd(), "demo/sample-repo"),
    });

    expect(result.durationMs).toBeGreaterThan(0);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
