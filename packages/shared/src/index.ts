import { z } from "zod";

// ============================================================================
// Graph Node Labels & Edge Types
// ============================================================================

export const NodeLabels = {
  Project: "Project",
  Repository: "Repository",
  Developer: "Developer",
  CodingAgent: "CodingAgent",
  WorkSession: "WorkSession",
  Task: "Task",
  File: "File",
  Function: "Function",
  Class: "Class",
  Interface: "Interface",
  APIContract: "APIContract",
  DatabaseSchema: "DatabaseSchema",
  Change: "Change",
  Decision: "Decision",
  Test: "Test",
  Commit: "Commit",
  PullRequest: "PullRequest",
  Branch: "Branch",
} as const;

export type NodeLabel = (typeof NodeLabels)[keyof typeof NodeLabels];

export const RelationshipTypes = {
  CONTAINS: "CONTAINS",
  IMPORTS: "IMPORTS",
  CALLS: "CALLS",
  USES: "USES",
  OWNS: "OWNS",
  EXECUTES: "EXECUTES",
  WORKS_ON: "WORKS_ON",
  PROPOSES: "PROPOSES",
  MODIFIES: "MODIFIES",
  AFFECTS: "AFFECTS",
  DEPENDS_ON: "DEPENDS_ON",
  GOVERNS: "GOVERNS",
  VALIDATED_BY: "VALIDATED_BY",
  INCLUDES: "INCLUDES",
} as const;

export type RelationshipType =
  (typeof RelationshipTypes)[keyof typeof RelationshipTypes];

// ============================================================================
// Core Domain Entities & Schemas
// ============================================================================

export const SessionStatusSchema = z.enum([
  "active",
  "completed",
  "abandoned",
  "stale",
  "blocked",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ChangeTypeSchema = z.enum([
  "intended",
  "observed",
  "committed",
  "merged",
]);
export type ChangeType = z.infer<typeof ChangeTypeSchema>;

export const LifecycleStatusSchema = z.enum([
  "draft",
  "proposed",
  "validated",
  "applied",
]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

export const RiskCategorySchema = z.enum([
  "direct_overlap",
  "shared_symbol",
  "contract_incompatibility",
  "architectural_constraint",
  "dependency_impact",
]);
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const RiskSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

export const FindingStatusSchema = z.enum([
  "confirmed",
  "likely",
  "possible",
  "informational",
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

// WorkSession
export const WorkSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  agentId: z.string(),
  developerId: z.string().optional(),
  taskDescription: z.string(),
  status: SessionStatusSchema,
  startTime: z.string(),
  lastHeartbeat: z.string(),
  baseCommit: z.string().optional(),
  currentBranch: z.string().optional(),
  version: z.number().int().nonnegative().default(1),
  intendedFiles: z.array(z.string()).default([]),
  intendedSymbols: z.array(z.string()).default([]),
});
export type WorkSession = z.infer<typeof WorkSessionSchema>;

// Change
export const ChangeSchema = z.object({
  changeId: z.string(),
  sessionId: z.string(),
  projectId: z.string(),
  changedPaths: z.array(z.string()),
  changedSymbols: z.array(z.string()).default([]),
  changeType: ChangeTypeSchema,
  lifecycleStatus: LifecycleStatusSchema.default("proposed"),
  baseCommit: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  version: z.number().int().nonnegative().default(1),
  diff: z.string().optional(),
  proposedContract: z
    .object({
      contractName: z.string(),
      breaking: z.boolean(),
      changes: z.string(),
    })
    .optional(),
});
export type Change = z.infer<typeof ChangeSchema>;

// Code Entity (File / Function / Class / Interface)
export const CodeEntitySchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  projectId: z.string(),
  filePath: z.string(),
  symbolName: z.string().optional(),
  entityType: z.enum([
    "file",
    "function",
    "class",
    "interface",
    "type_alias",
    "variable",
  ]),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  exported: z.boolean().default(false),
  lastIndexedRevision: z.string().optional(),
});
export type CodeEntity = z.infer<typeof CodeEntitySchema>;

// API Contract
export const APIContractSchema = z.object({
  contractId: z.string(),
  projectId: z.string(),
  name: z.string(),
  filePath: z.string(),
  symbol: z.string(),
  schemaDefinition: z.string(),
  version: z.string().default("1.0.0"),
  lastUpdated: z.string(),
});
export type APIContract = z.infer<typeof APIContractSchema>;

// Architectural Decision
export const DecisionSchema = z.object({
  decisionId: z.string(),
  projectId: z.string(),
  title: z.string(),
  rationale: z.string(),
  constraints: z.array(z.string()).default([]),
  affectedComponents: z.array(z.string()).default([]),
  author: z.string(),
  timestamp: z.string(),
});
export type Decision = z.infer<typeof DecisionSchema>;

// Conflict Finding
export const ConflictFindingSchema = z.object({
  findingId: z.string(),
  projectId: z.string(),
  changeId: z.string().optional(),
  sessionId: z.string().optional(),
  riskCategory: RiskCategorySchema,
  severity: RiskSeveritySchema,
  status: FindingStatusSchema,
  explanation: z.string(),
  evidence: z.string(),
  sourceReferences: z
    .array(
      z.object({
        filePath: z.string(),
        startLine: z.number().optional(),
        endLine: z.number().optional(),
        symbol: z.string().optional(),
      })
    )
    .default([]),
  dependencyPath: z.array(z.string()).default([]),
  affectedComponents: z.array(z.string()).default([]),
  affectedSessions: z.array(z.string()).default([]),
  recommendedAction: z.string(),
  detectedAt: z.string(),
  aiAnalysis: z
    .object({
      summary: z.string(),
      compatibleStrategy: z.string(),
      recommendedTests: z.array(z.string()),
      confidence: z.number(),
    })
    .optional(),
});
export type ConflictFinding = z.infer<typeof ConflictFindingSchema>;

// ============================================================================
// Event Bus Types
// ============================================================================

export const EventTypeSchema = z.enum([
  "work_session.started",
  "work_session.heartbeat",
  "work_session.completed",
  "task.announced",
  "change.intended",
  "change.observed",
  "change.validated",
  "git.commit",
  "git.merge",
  "context.updated",
  "conflict.detected",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const DevGraphEventSchema = z.object({
  eventId: z.string(),
  projectId: z.string(),
  eventType: EventTypeSchema,
  actor: z.string(),
  timestamp: z.string(),
  payload: z.record(z.any()),
});
export type DevGraphEvent = z.infer<typeof DevGraphEventSchema>;

// ============================================================================
// MCP Tool Request & Response Schemas
// ============================================================================

export const GetCodingContextInputSchema = z.object({
  project_id: z.string(),
  task_description: z.string(),
  files_of_interest: z.array(z.string()).optional(),
  symbols_of_interest: z.array(z.string()).optional(),
  include_active_changes: z.boolean().default(true),
  include_related_dependencies: z.boolean().default(true),
  max_result_size: z.number().int().positive().optional(),
});
export type GetCodingContextInput = z.infer<typeof GetCodingContextInputSchema>;

export interface CodingContextOutput {
  projectId: string;
  query: {
    taskDescription: string;
    filesOfInterest?: string[];
    symbolsOfInterest?: string[];
  };
  relevantFiles: string[];
  relevantSymbols: Array<{
    name: string;
    filePath: string;
    type: string;
    line?: number;
  }>;
  dependencyPaths: Array<{
    from: string;
    to: string;
    relation: string;
    via?: string[];
  }>;
  activeWorkSessions: Array<{
    sessionId: string;
    agentId: string;
    taskDescription: string;
    status: string;
    lastHeartbeat: string;
    intendedFiles: string[];
  }>;
  activeChanges: Array<{
    changeId: string;
    sessionId: string;
    changeType: string;
    changedPaths: string[];
    changedSymbols: string[];
    lifecycleStatus: string;
    proposedContract?: {
      contractName: string;
      breaking: boolean;
      changes: string;
    };
  }>;
  applicableDecisions: Decision[];
  potentialConflicts: ConflictFinding[];
  contextVersion: number;
  freshnessTimestamp: string;
}

export const AnnounceWorkInputSchema = z.object({
  project_id: z.string(),
  agent_id: z.string(),
  developer_id: z.string().optional(),
  task_description: z.string(),
  intended_files: z.array(z.string()).default([]),
  intended_symbols: z.array(z.string()).default([]),
  expected_interfaces: z.array(z.string()).default([]),
  base_commit: z.string().optional(),
  branch: z.string().optional(),
});
export type AnnounceWorkInput = z.infer<typeof AnnounceWorkInputSchema>;

export const PublishChangeInputSchema = z.object({
  project_id: z.string(),
  session_id: z.string(),
  event_id: z.string().optional(),
  change_version: z.number().int().positive().default(1),
  changed_files: z.array(z.string()),
  changed_symbols: z.array(z.string()).default([]),
  change_type: ChangeTypeSchema.default("intended"),
  diff: z.string().optional(),
  proposed_contract_changes: z
    .object({
      contract_name: z.string(),
      breaking: z.boolean(),
      changes: z.string(),
    })
    .optional(),
  evidence: z.string().optional(),
});
export type PublishChangeInput = z.infer<typeof PublishChangeInputSchema>;

export const CheckConflictsInputSchema = z.object({
  project_id: z.string(),
  session_id: z.string().optional(),
  proposed_files: z.array(z.string()).default([]),
  proposed_symbols: z.array(z.string()).default([]),
  diff: z.string().optional(),
  base_commit: z.string().optional(),
});
export type CheckConflictsInput = z.infer<typeof CheckConflictsInputSchema>;

export const GetImpactAnalysisInputSchema = z.object({
  project_id: z.string(),
  target_file: z.string().optional(),
  target_symbol: z.string().optional(),
  target_contract: z.string().optional(),
  depth: z.number().int().min(1).max(5).default(3),
});
export type GetImpactAnalysisInput = z.infer<
  typeof GetImpactAnalysisInputSchema
>;

export const RecordDecisionInputSchema = z.object({
  project_id: z.string(),
  title: z.string(),
  rationale: z.string(),
  constraints: z.array(z.string()).default([]),
  affected_components: z.array(z.string()).default([]),
  author: z.string(),
});
export type RecordDecisionInput = z.infer<typeof RecordDecisionInputSchema>;

export const CompleteWorkInputSchema = z.object({
  project_id: z.string(),
  session_id: z.string(),
  status: z.enum(["completed", "abandoned", "blocked"]).default("completed"),
  commit_hash: z.string().optional(),
  summary: z.string().optional(),
});
export type CompleteWorkInput = z.infer<typeof CompleteWorkInputSchema>;

export const ReserveResourceInputSchema = z.object({
  project_id: z.string(),
  resource_id: z.string(),
  owner: z.string(),
  ttl_seconds: z.number().int().min(10).max(3600).default(300),
});
export type ReserveResourceInput = z.infer<typeof ReserveResourceInputSchema>;
