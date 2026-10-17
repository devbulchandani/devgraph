import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { EventEmitter } from "events";
import { DevGraphDatabase } from "@devgraph/graph";
import { CodeIndexer } from "@devgraph/code-indexer";
import { ConflictEngine } from "@devgraph/conflict-engine";
import {
  AnnounceWorkInputSchema,
  ChangeSchema,
  CodingContextOutput,
  CompleteWorkInputSchema,
  DevGraphEvent,
  PublishChangeInputSchema,
  RecordDecisionInputSchema,
  WorkSession,
} from "@devgraph/shared";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app: express.Express = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const eventBus = new EventEmitter();
const seenEventIds = new Set<string>();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Initialize Graph Database, Indexer, and Conflict Engine
const db = new DevGraphDatabase();
const indexer = new CodeIndexer(db);
const conflictEngine = new ConflictEngine(db);

// Initialize AI Client if configured
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch {
    aiClient = null;
  }
}

// In-memory active event history for activity feed
const eventHistory: DevGraphEvent[] = [];

function emitDevGraphEvent(event: DevGraphEvent) {
  if (seenEventIds.has(event.eventId)) {
    return; // deduplication
  }
  seenEventIds.add(event.eventId);
  eventHistory.unshift(event);
  if (eventHistory.length > 200) {
    eventHistory.pop();
  }
  eventBus.emit("devgraph_event", event);
}

// ============================================================================
// Health Check Endpoint
// ============================================================================
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const health = await db.healthCheck();
    res.json({
      status: health.status === "healthy" ? "ok" : "degraded",
      falkordb: health,
      aiProvider: aiClient ? "configured (Gemini)" : "deterministic fallback",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// ============================================================================
// Server-Sent Events (SSE) Stream for Dashboard
// ============================================================================
app.get("/api/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial connected event and recent history
  res.write(
    `data: ${JSON.stringify({ type: "init", history: eventHistory.slice(0, 50) })}\n\n`
  );

  const listener = (event: DevGraphEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  eventBus.on("devgraph_event", listener);

  req.on("close", () => {
    eventBus.off("devgraph_event", listener);
  });
});

// ============================================================================
// Work Sessions & Context Endpoints
// ============================================================================

// Announce Work (Create Session)
app.post("/api/projects/:projectId/sessions", async (req: Request, res: Response) => {
  try {
    const input = AnnounceWorkInputSchema.parse({
      ...req.body,
      project_id: String(req.params.projectId),
    });

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

    // Immediate overlap check
    const conflicts = await conflictEngine.evaluateConflicts({
      projectId: input.project_id,
      sessionId,
      proposedFiles: input.intended_files,
      proposedSymbols: input.intended_symbols,
    });

    emitDevGraphEvent({
      eventId: `event:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
      projectId: input.project_id,
      eventType: "work_session.started",
      actor: input.agent_id,
      timestamp: new Date().toISOString(),
      payload: { sessionId, taskDescription: input.task_description, conflictsCount: conflicts.length },
    });

    res.status(201).json({
      sessionId,
      session,
      immediateConflicts: conflicts,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Heartbeat
app.put("/api/projects/:projectId/sessions/:sessionId/heartbeat", async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);
    await db.updateSessionHeartbeat(sessionId);
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Complete Session
app.post("/api/projects/:projectId/sessions/:sessionId/complete", async (req: Request, res: Response) => {
  try {
    const input = CompleteWorkInputSchema.parse({
      ...req.body,
      project_id: String(req.params.projectId),
      session_id: String(req.params.sessionId),
    });

    await db.completeSession(input.session_id, input.status);

    emitDevGraphEvent({
      eventId: `event:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
      projectId: input.project_id,
      eventType: "work_session.completed",
      actor: input.session_id,
      timestamp: new Date().toISOString(),
      payload: { sessionId: input.session_id, status: input.status, commitHash: input.commit_hash },
    });

    res.json({ ok: true, status: input.status });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Publish Change
app.post("/api/projects/:projectId/changes", async (req: Request, res: Response) => {
  try {
    const input = PublishChangeInputSchema.parse({
      ...req.body,
      project_id: String(req.params.projectId),
    });

    const eventId = input.event_id || `event:change:${Date.now()}`;
    if (seenEventIds.has(eventId)) {
      return res.status(200).json({ ok: true, message: "Duplicate event deduplicated" });
    }

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

    // Evaluate conflicts triggered by this change
    const conflicts = await conflictEngine.evaluateConflicts({
      projectId: input.project_id,
      sessionId: input.session_id,
      proposedFiles: input.changed_files,
      proposedSymbols: input.changed_symbols,
      diff: input.diff,
      proposedContractChanges: change.proposedContract,
    });

    emitDevGraphEvent({
      eventId,
      projectId: input.project_id,
      eventType: input.change_type === "intended" ? "change.intended" : "change.observed",
      actor: input.session_id,
      timestamp: new Date().toISOString(),
      payload: { changeId, changedPaths: input.changed_files, conflictsFound: conflicts.length },
    });

    res.status(201).json({
      changeId,
      change,
      conflicts,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Check Conflicts
app.post("/api/projects/:projectId/conflicts/check", async (req: Request, res: Response) => {
  try {
    const { proposed_files, proposed_symbols, diff, session_id } = req.body;
    const conflicts = await conflictEngine.evaluateConflicts({
      projectId: String(req.params.projectId),
      sessionId: session_id,
      proposedFiles: proposed_files || [],
      proposedSymbols: proposed_symbols || [],
      diff,
    });
    res.json({ conflicts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Coding Context (Core MCP & Agent endpoint)
app.get("/api/projects/:projectId/context", async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const taskDescription = (req.query.task_description as string) || "";
    const filesOfInterest = req.query.files
      ? String(req.query.files).split(",")
      : [];
    const symbolsOfInterest = req.query.symbols
      ? String(req.query.symbols).split(",")
      : [];

    const activeSessions = await db.getActiveSessions(projectId);
    const activeChanges = await db.getActiveChanges(projectId);

    // Trace dependency paths for files of interest
    const dependencyPaths: Array<{ from: string; to: string; relation: string }> = [];
    for (const f of filesOfInterest) {
      const deps = await db.getDownstreamDependencies(projectId, f, 3);
      for (const d of deps) {
        dependencyPaths.push({ from: d.from, to: d.to, relation: d.relation });
      }
    }

    // Evaluate conflicts for requested files & symbols
    const potentialConflicts = await conflictEngine.evaluateConflicts({
      projectId,
      proposedFiles: filesOfInterest,
      proposedSymbols: symbolsOfInterest,
    });

    const contextOutput: CodingContextOutput = {
      projectId,
      query: {
        taskDescription,
        filesOfInterest,
        symbolsOfInterest,
      },
      relevantFiles: filesOfInterest,
      relevantSymbols: symbolsOfInterest.map((s) => ({
        name: s,
        filePath: filesOfInterest[0] || "",
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

    res.json(contextOutput);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record Decision
app.post("/api/projects/:projectId/decisions", async (req: Request, res: Response) => {
  try {
    const input = RecordDecisionInputSchema.parse({
      ...req.body,
      project_id: String(req.params.projectId),
    });

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

    res.status(201).json({ decisionId, decision });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Trigger Repository Indexing
app.post("/api/projects/:projectId/index", async (req: Request, res: Response) => {
  try {
    const { repoPath, repositoryId = "default-repo" } = req.body;
    if (!repoPath) {
      return res.status(400).json({ error: "repoPath is required" });
    }

    const projectId = String(req.params.projectId);
    const result = await indexer.indexRepository({
      projectId,
      repositoryId,
      repoRoot: repoPath,
    });

    emitDevGraphEvent({
      eventId: `event:${Date.now()}`,
      projectId,
      eventType: "context.updated",
      actor: "code-indexer",
      timestamp: new Date().toISOString(),
      payload: { indexedFiles: result.indexedFiles, durationMs: result.durationMs },
    });

    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Graph Visualizer Data
app.get("/api/projects/:projectId/graph", async (req: Request, res: Response) => {
  try {
    const graphData = await db.getFullGraphVisualization(String(req.params.projectId));
    res.json(graphData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Overview Data
app.get("/api/projects/:projectId/overview", async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const activeSessions = await db.getActiveSessions(projectId);
    const activeChanges = await db.getActiveChanges(projectId);
    const conflicts = await conflictEngine.evaluateConflicts({
      projectId,
      proposedFiles: [],
      proposedSymbols: [],
    });

    res.json({
      projectId,
      activeSessionsCount: activeSessions.length,
      activeChangesCount: activeChanges.length,
      conflictsCount: conflicts.length,
      activeSessions,
      activeChanges,
      conflicts,
      recentEvents: eventHistory.slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Investigation Endpoint
app.post("/api/investigate", async (req: Request, res: Response) => {
  try {
    const { finding, context } = req.body;

    if (!aiClient) {
      return res.json({
        summary: `[Deterministic Analysis] ${finding.explanation}`,
        compatibleStrategy:
          "Keep existing interface contract intact or version the endpoint to prevent breaking active consumers.",
        recommendedTests: [
          "Run integration test suite for downstream consumers",
          "Verify type checking on API contracts",
        ],
        confidence: 0.95,
        source: "deterministic_rules",
      });
    }

    // Call Gemini with graph context
    const prompt = `
You are an expert software architect analyzing an active development conflict in DevGraph.
Conflict finding:
${JSON.stringify(finding, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Analyze this conflict and respond in JSON with:
{
  "summary": "Brief 1-2 sentence risk explanation",
  "compatibleStrategy": "Specific recommendation for how the agents can implement this change compatibly",
  "recommendedTests": ["test1", "test2"],
  "confidence": 0.95
}
`;

    const response = await aiClient.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    let resultJson: any;
    try {
      const text = response.text || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      resultJson = JSON.parse(cleaned);
    } catch {
      resultJson = {
        summary: response.text || finding.explanation,
        compatibleStrategy: "Coordinate contract versioning across active sessions.",
        recommendedTests: ["Run consumer contract tests"],
        confidence: 0.9,
      };
    }

    res.json(resultJson);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export app and server starter
export { app, db, indexer, conflictEngine, eventBus };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, async () => {
    console.log(`[DevGraph Server] Listening on http://localhost:${PORT}`);
    try {
      await db.initSchema();
      console.log(`[DevGraph Server] FalkorDB schema initialized successfully.`);
    } catch (err: any) {
      console.warn(`[DevGraph Server] FalkorDB schema init deferred: ${err.message}`);
    }
  });
}
