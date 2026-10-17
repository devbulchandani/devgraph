import { FalkorDB } from "falkordb";
import {
  APIContract,
  Change,
  CodeEntity,
  Decision,
  WorkSession,
} from "@devgraph/shared";

export interface FalkorConfig {
  host?: string;
  port?: number;
  password?: string;
  graphId?: string;
}

export interface GraphHealth {
  status: "healthy" | "unhealthy" | "disconnected";
  latencyMs?: number;
  graphId: string;
  nodeCount?: number;
  relationshipCount?: number;
  error?: string;
}

export class DevGraphDatabase {
  private client: any = null;
  private graph: any = null;
  private readonly host: string;
  private readonly port: number;
  private readonly password?: string;
  private readonly graphId: string;

  constructor(config: FalkorConfig = {}) {
    this.host =
      config.host || process.env.FALKORDB_HOST || "127.0.0.1";
    this.port =
      config.port ||
      parseInt(process.env.FALKORDB_PORT || "6379", 10);
    this.password =
      config.password || process.env.FALKORDB_PASSWORD || undefined;
    this.graphId =
      config.graphId || process.env.FALKORDB_GRAPH_ID || "devgraph";
  }

  public async connect(): Promise<void> {
    if (this.client && this.graph) {
      return;
    }
    try {
      this.client = await FalkorDB.connect({
        socket: {
          host: this.host,
          port: this.port,
        },
        password: this.password,
      });
      this.graph = this.client.selectGraph(this.graphId);
    } catch (err: any) {
      this.client = null;
      this.graph = null;
      throw new Error(
        `Failed to connect to FalkorDB at ${this.host}:${this.port}: ${err.message}`
      );
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        // ignore close error
      }
      this.client = null;
      this.graph = null;
    }
  }

  public getGraph() {
    if (!this.graph) {
      throw new Error(
        "FalkorDB graph not connected. Call connect() first."
      );
    }
    return this.graph;
  }

  public async query(
    cypher: string,
    params?: Record<string, any>
  ): Promise<any> {
    await this.connect();
    try {
      if (params && Object.keys(params).length > 0) {
        return await this.graph.query(cypher, { params });
      }
      return await this.graph.query(cypher);
    } catch (err: any) {
      // If error is duplicate index or similar non-fatal Cypher message, throw informative error
      throw new Error(
        `FalkorDB query failed: [${cypher}] Error: ${err.message}`
      );
    }
  }

  public async healthCheck(): Promise<GraphHealth> {
    const start = Date.now();
    try {
      await this.connect();
      const res = await this.graph.query("RETURN 1 AS alive");
      const latencyMs = Date.now() - start;

      let nodeCount = 0;
      let relationshipCount = 0;
      try {
        const countRes = await this.graph.query(
          "MATCH (n) RETURN count(n) AS nodeCount"
        );
        if (countRes?.data?.[0]?.nodeCount !== undefined) {
          nodeCount = Number(countRes.data[0].nodeCount);
        } else if (countRes?.data?.[0]?.[0] !== undefined) {
          nodeCount = Number(countRes.data[0][0]);
        }
      } catch {
        // ignore count failure during initial empty state
      }

      try {
        const relRes = await this.graph.query(
          "MATCH ()-[r]->() RETURN count(r) AS relCount"
        );
        if (relRes?.data?.[0]?.relCount !== undefined) {
          relationshipCount = Number(relRes.data[0].relCount);
        } else if (relRes?.data?.[0]?.[0] !== undefined) {
          relationshipCount = Number(relRes.data[0][0]);
        }
      } catch {
        // ignore count failure during initial empty state
      }

      return {
        status: "healthy",
        latencyMs,
        graphId: this.graphId,
        nodeCount,
        relationshipCount,
      };
    } catch (err: any) {
      return {
        status: "unhealthy",
        graphId: this.graphId,
        error: err.message,
      };
    }
  }

  public async initSchema(): Promise<void> {
    await this.connect();
    const indexes = [
      "CREATE INDEX FOR (p:Project) ON (p.id)",
      "CREATE INDEX FOR (r:Repository) ON (r.id)",
      "CREATE INDEX FOR (f:File) ON (f.id)",
      "CREATE INDEX FOR (f:File) ON (f.path)",
      "CREATE INDEX FOR (fn:Function) ON (fn.id)",
      "CREATE INDEX FOR (fn:Function) ON (fn.name)",
      "CREATE INDEX FOR (c:Class) ON (c.id)",
      "CREATE INDEX FOR (i:Interface) ON (i.id)",
      "CREATE INDEX FOR (i:Interface) ON (i.name)",
      "CREATE INDEX FOR (ac:APIContract) ON (ac.id)",
      "CREATE INDEX FOR (ac:APIContract) ON (ac.name)",
      "CREATE INDEX FOR (s:WorkSession) ON (s.id)",
      "CREATE INDEX FOR (ch:Change) ON (ch.id)",
      "CREATE INDEX FOR (t:Task) ON (t.id)",
      "CREATE INDEX FOR (d:Decision) ON (d.id)",
    ];

    for (const idx of indexes) {
      try {
        await this.graph.query(idx);
      } catch (err: any) {
        // Index might already exist in FalkorDB, which is safe to ignore
      }
    }
  }

  public async clearGraph(projectId?: string): Promise<void> {
    await this.connect();
    if (projectId) {
      await this.graph.query(
        "MATCH (n {projectId: $projectId}) DETACH DELETE n",
        { params: { projectId } }
      );
    } else {
      try {
        await this.graph.delete();
        this.graph = this.client.selectGraph(this.graphId);
      } catch {
        await this.graph.query("MATCH (n) DETACH DELETE n");
      }
    }
  }

  // ==========================================================================
  // Project & Code Structure Operations
  // ==========================================================================

  public async upsertProject(
    projectId: string,
    name: string,
    rootPath: string
  ): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      ON CREATE SET p.name = $name, p.rootPath = $rootPath, p.createdAt = timestamp()
      ON MATCH SET p.name = $name, p.rootPath = $rootPath, p.updatedAt = timestamp()
      RETURN p
    `;
    await this.query(query, { projectId, name, rootPath });
  }

  public async upsertRepository(
    repositoryId: string,
    projectId: string,
    name: string,
    defaultBranch: string = "main"
  ): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      MERGE (r:Repository {id: $repositoryId})
      ON CREATE SET r.name = $name, r.defaultBranch = $defaultBranch, r.projectId = $projectId
      ON MATCH SET r.name = $name, r.defaultBranch = $defaultBranch
      MERGE (p)-[:CONTAINS]->(r)
      RETURN r
    `;
    await this.query(query, { repositoryId, projectId, name, defaultBranch });
  }

  public async upsertFile(
    entity: CodeEntity,
    indexedRevision: string = "HEAD"
  ): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      MERGE (f:File {id: $id})
      ON CREATE SET f.path = $filePath, f.projectId = $projectId, f.repositoryId = $repositoryId, f.lastIndexedRevision = $indexedRevision, f.createdAt = timestamp()
      ON MATCH SET f.path = $filePath, f.lastIndexedRevision = $indexedRevision, f.updatedAt = timestamp()
      MERGE (p)-[:CONTAINS]->(f)
      RETURN f
    `;
    await this.query(query, {
      id: entity.id,
      filePath: entity.filePath,
      projectId: entity.projectId,
      repositoryId: entity.repositoryId,
      indexedRevision,
    });
  }

  public async upsertSymbol(entity: CodeEntity): Promise<void> {
    let label = "Function";
    if (entity.entityType === "class") label = "Class";
    else if (entity.entityType === "interface" || entity.entityType === "type_alias")
      label = "Interface";

    const query = `
      MATCH (f:File {id: $fileId})
      MERGE (s:${label} {id: $id})
      ON CREATE SET s.name = $name, s.filePath = $filePath, s.projectId = $projectId, s.startLine = $startLine, s.endLine = $endLine, s.exported = $exported, s.entityType = $entityType
      ON MATCH SET s.name = $name, s.filePath = $filePath, s.startLine = $startLine, s.endLine = $endLine, s.exported = $exported
      MERGE (f)-[:CONTAINS]->(s)
      RETURN s
    `;
    await this.query(query, {
      fileId: `${entity.projectId}:${entity.filePath}`,
      id: entity.id,
      name: entity.symbolName || "anonymous",
      filePath: entity.filePath,
      projectId: entity.projectId,
      startLine: entity.startLine || 0,
      endLine: entity.endLine || 0,
      exported: entity.exported,
      entityType: entity.entityType,
    });
  }

  public async createImportEdge(
    projectId: string,
    fromFilePath: string,
    toFilePath: string
  ): Promise<void> {
    const query = `
      MATCH (from:File {id: $fromId})
      MATCH (to:File {id: $toId})
      MERGE (from)-[:IMPORTS]->(to)
    `;
    await this.query(query, {
      fromId: `${projectId}:${fromFilePath}`,
      toId: `${projectId}:${toFilePath}`,
    });
  }

  public async createCallsEdge(
    fromSymbolId: string,
    toSymbolId: string
  ): Promise<void> {
    const query = `
      MATCH (a {id: $fromSymbolId})
      MATCH (b {id: $toSymbolId})
      MERGE (a)-[:CALLS]->(b)
    `;
    await this.query(query, { fromSymbolId, toSymbolId });
  }

  public async createUsesEdge(
    symbolId: string,
    targetContractOrInterfaceId: string
  ): Promise<void> {
    const query = `
      MATCH (s {id: $symbolId})
      MATCH (t {id: $targetContractOrInterfaceId})
      MERGE (s)-[:USES]->(t)
    `;
    await this.query(query, { symbolId, targetContractOrInterfaceId });
  }

  public async upsertAPIContract(contract: APIContract): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      MERGE (ac:APIContract {id: $contractId})
      ON CREATE SET ac.name = $name, ac.filePath = $filePath, ac.symbol = $symbol, ac.schemaDefinition = $schemaDefinition, ac.version = $version, ac.lastUpdated = $lastUpdated, ac.projectId = $projectId
      ON MATCH SET ac.schemaDefinition = $schemaDefinition, ac.version = $version, ac.lastUpdated = $lastUpdated
      MERGE (p)-[:CONTAINS]->(ac)
      WITH ac
      OPTIONAL MATCH (f:File {id: $fileId})
      FOREACH (_ IN CASE WHEN f IS NOT NULL THEN [1] ELSE [] END |
        MERGE (f)-[:CONTAINS]->(ac)
      )
      RETURN ac
    `;
    await this.query(query, {
      projectId: contract.projectId,
      contractId: contract.contractId,
      name: contract.name,
      filePath: contract.filePath,
      symbol: contract.symbol,
      schemaDefinition: contract.schemaDefinition,
      version: contract.version,
      lastUpdated: contract.lastUpdated,
      fileId: `${contract.projectId}:${contract.filePath}`,
    });
  }

  public async upsertDecision(decision: Decision): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      MERGE (d:Decision {id: $decisionId})
      ON CREATE SET d.title = $title, d.rationale = $rationale, d.constraints = $constraints, d.affectedComponents = $affectedComponents, d.author = $author, d.timestamp = $timestamp, d.projectId = $projectId
      ON MATCH SET d.title = $title, d.rationale = $rationale, d.constraints = $constraints, d.affectedComponents = $affectedComponents, d.author = $author, d.timestamp = $timestamp
      MERGE (p)-[:CONTAINS]->(d)
      RETURN d
    `;
    await this.query(query, {
      projectId: decision.projectId,
      decisionId: decision.decisionId,
      title: decision.title,
      rationale: decision.rationale,
      constraints: decision.constraints,
      affectedComponents: decision.affectedComponents,
      author: decision.author,
      timestamp: decision.timestamp,
    });
  }

  // ==========================================================================
  // Work Sessions & Change Tracking
  // ==========================================================================

  public async upsertWorkSession(session: WorkSession): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      MERGE (a:CodingAgent {id: $agentId})
      MERGE (s:WorkSession {id: $sessionId})
      ON CREATE SET s.sessionId = $sessionId, s.agentId = $agentId, s.developerId = $developerId, s.taskDescription = $taskDescription, s.status = $status, s.startTime = $startTime, s.lastHeartbeat = $lastHeartbeat, s.baseCommit = $baseCommit, s.currentBranch = $currentBranch, s.version = $version, s.intendedFiles = $intendedFiles, s.intendedSymbols = $intendedSymbols, s.projectId = $projectId
      ON MATCH SET s.taskDescription = $taskDescription, s.status = $status, s.lastHeartbeat = $lastHeartbeat, s.version = $version, s.intendedFiles = $intendedFiles, s.intendedSymbols = $intendedSymbols
      MERGE (a)-[:EXECUTES]->(s)
      MERGE (p)-[:CONTAINS]->(s)
      RETURN s
    `;
    await this.query(query, {
      projectId: session.projectId,
      agentId: session.agentId,
      sessionId: session.sessionId,
      developerId: session.developerId || "",
      taskDescription: session.taskDescription,
      status: session.status,
      startTime: session.startTime,
      lastHeartbeat: session.lastHeartbeat,
      baseCommit: session.baseCommit || "",
      currentBranch: session.currentBranch || "main",
      version: session.version,
      intendedFiles: session.intendedFiles,
      intendedSymbols: session.intendedSymbols,
    });
  }

  public async updateSessionHeartbeat(
    sessionId: string,
    timestamp: string = new Date().toISOString()
  ): Promise<void> {
    const query = `
      MATCH (s:WorkSession {id: $sessionId})
      SET s.lastHeartbeat = $timestamp
      RETURN s
    `;
    await this.query(query, { sessionId, timestamp });
  }

  public async completeSession(
    sessionId: string,
    status: string = "completed"
  ): Promise<void> {
    const query = `
      MATCH (s:WorkSession {id: $sessionId})
      SET s.status = $status, s.completedAt = timestamp()
      RETURN s
    `;
    await this.query(query, { sessionId, status });
  }

  public async upsertChange(change: Change): Promise<void> {
    const query = `
      MATCH (s:WorkSession {id: $sessionId})
      MERGE (c:Change {id: $changeId})
      ON CREATE SET c.changeId = $changeId, c.sessionId = $sessionId, c.projectId = $projectId, c.changedPaths = $changedPaths, c.changedSymbols = $changedSymbols, c.changeType = $changeType, c.lifecycleStatus = $lifecycleStatus, c.baseCommit = $baseCommit, c.createdAt = $createdAt, c.updatedAt = $updatedAt, c.evidence = $evidence, c.confidence = $confidence, c.version = $version, c.diff = $diff, c.proposedContractChanges = $proposedContractChanges
      ON MATCH SET c.changedPaths = $changedPaths, c.changedSymbols = $changedSymbols, c.changeType = $changeType, c.lifecycleStatus = $lifecycleStatus, c.updatedAt = $updatedAt, c.evidence = $evidence, c.version = $version, c.diff = $diff, c.proposedContractChanges = $proposedContractChanges
      MERGE (s)-[:PROPOSES]->(c)
      RETURN c
    `;
    await this.query(query, {
      sessionId: change.sessionId,
      changeId: change.changeId,
      projectId: change.projectId,
      changedPaths: change.changedPaths,
      changedSymbols: change.changedSymbols,
      changeType: change.changeType,
      lifecycleStatus: change.lifecycleStatus,
      baseCommit: change.baseCommit || "",
      createdAt: change.createdAt,
      updatedAt: change.updatedAt,
      evidence: change.evidence || "",
      confidence: change.confidence ?? 1.0,
      version: change.version,
      diff: change.diff || "",
      proposedContractChanges: change.proposedContract
        ? JSON.stringify(change.proposedContract)
        : "",
    });

    // Link change to modified files
    for (const filePath of change.changedPaths) {
      const fileId = `${change.projectId}:${filePath}`;
      const linkFileQuery = `
        MATCH (c:Change {id: $changeId})
        MATCH (f:File {id: $fileId})
        MERGE (c)-[:MODIFIES]->(f)
      `;
      try {
        await this.query(linkFileQuery, { changeId: change.changeId, fileId });
      } catch {
        // file node may not exist yet if newly created file
      }
    }

    // Link change to affected symbols
    for (const symbol of change.changedSymbols) {
      const linkSymbolQuery = `
        MATCH (c:Change {id: $changeId})
        MATCH (s {name: $symbol, projectId: $projectId})
        MERGE (c)-[:AFFECTS]->(s)
      `;
      try {
        await this.query(linkSymbolQuery, {
          changeId: change.changeId,
          symbol,
          projectId: change.projectId,
        });
      } catch {
        // symbol node may not exist
      }
    }
  }

  // ==========================================================================
  // Traversal & Context Queries
  // ==========================================================================

  public async getActiveSessions(projectId: string): Promise<WorkSession[]> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(s:WorkSession)
      WHERE s.status = 'active'
      RETURN s
    `;
    const res = await this.query(query, { projectId });
    return (res?.data || []).map((row: any) => {
      const node = row.s || row[0];
      const props = node?.properties || node || {};
      return {
        sessionId: props.id || props.sessionId,
        projectId: props.projectId,
        agentId: props.agentId,
        developerId: props.developerId,
        taskDescription: props.taskDescription,
        status: props.status,
        startTime: props.startTime,
        lastHeartbeat: props.lastHeartbeat,
        baseCommit: props.baseCommit,
        currentBranch: props.currentBranch,
        version: Number(props.version || 1),
        intendedFiles: Array.isArray(props.intendedFiles)
          ? props.intendedFiles
          : [],
        intendedSymbols: Array.isArray(props.intendedSymbols)
          ? props.intendedSymbols
          : [],
      };
    });
  }

  public async getActiveChanges(projectId: string): Promise<Change[]> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(s:WorkSession)-[:PROPOSES]->(c:Change)
      WHERE s.status = 'active'
      RETURN c
    `;
    const res = await this.query(query, { projectId });
    return (res?.data || []).map((row: any) => {
      const node = row.c || row[0];
      const props = node?.properties || node || {};
      let proposedContract: any = undefined;
      if (props.proposedContractChanges) {
        try {
          proposedContract = JSON.parse(props.proposedContractChanges);
        } catch {}
      }
      return {
        changeId: props.id || props.changeId,
        sessionId: props.sessionId,
        projectId: props.projectId,
        changedPaths: Array.isArray(props.changedPaths) ? props.changedPaths : [],
        changedSymbols: Array.isArray(props.changedSymbols)
          ? props.changedSymbols
          : [],
        changeType: props.changeType || "intended",
        lifecycleStatus: props.lifecycleStatus || "proposed",
        baseCommit: props.baseCommit,
        createdAt: props.createdAt || new Date().toISOString(),
        updatedAt: props.updatedAt || new Date().toISOString(),
        evidence: props.evidence,
        confidence: Number(props.confidence || 1.0),
        version: Number(props.version || 1),
        diff: props.diff,
        proposedContract,
      };
    });
  }

  public async getDownstreamDependencies(
    projectId: string,
    filePath: string,
    maxDepth: number = 3
  ): Promise<Array<{ from: string; to: string; relation: string; depth: number }>> {
    // Cypher query to trace files that import this file or functions that call functions in this file
    const fileId = `${projectId}:${filePath}`;
    const query = `
      MATCH path = (dependent:File)-[:IMPORTS*1..${maxDepth}]->(target:File {id: $fileId})
      RETURN [node in nodes(path) | node.path] AS fileChain, length(path) AS depth
    `;
    const res = await this.query(query, { fileId });
    const results: Array<{ from: string; to: string; relation: string; depth: number }> = [];
    for (const row of res?.data || []) {
      const chain = row.fileChain || row[0];
      const depth = Number(row.depth || row[1] || 1);
      if (Array.isArray(chain) && chain.length >= 2) {
        results.push({
          from: chain[0],
          to: chain[chain.length - 1],
          relation: "IMPORTS_TRANSITIVELY",
          depth,
        });
      }
    }
    return results;
  }

  public async getFullGraphVisualization(projectId: string): Promise<{
    nodes: Array<{ id: string; label: string; type: string; properties: any }>;
    edges: Array<{ id: string; source: string; target: string; label: string }>;
  }> {
    const query = `
      MATCH (n {projectId: $projectId})
      OPTIONAL MATCH (n)-[r]->(m {projectId: $projectId})
      RETURN n, r, m
    `;
    const res = await this.query(query, { projectId });
    const nodeMap = new Map<string, any>();
    const edgeMap = new Map<string, any>();

    for (const row of res?.data || []) {
      const n = row.n || row[0];
      const r = row.r || row[1];
      const m = row.m || row[2];

      if (n) {
        const id = n.properties?.id || String(n.id);
        const label = n.properties?.name || n.properties?.path || n.properties?.sessionId || id;
        const type = (n.labels && n.labels[0]) || "Node";
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, label, type, properties: n.properties || {} });
        }
      }

      if (m) {
        const id = m.properties?.id || String(m.id);
        const label = m.properties?.name || m.properties?.path || m.properties?.sessionId || id;
        const type = (m.labels && m.labels[0]) || "Node";
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, label, type, properties: m.properties || {} });
        }
      }

      if (r && n && m) {
        const sourceId = n.properties?.id || String(n.id);
        const targetId = m.properties?.id || String(m.id);
        const edgeId = `${sourceId}->${targetId}:${r.type}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: r.type || "RELATED_TO",
          });
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  }
}
