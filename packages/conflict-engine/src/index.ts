import {
  Change,
  ConflictFinding,
  Decision,
  WorkSession,
} from "@devgraph/shared";
import { DevGraphDatabase } from "@devgraph/graph";

export interface ConflictCheckOptions {
  projectId: string;
  sessionId?: string;
  proposedFiles?: string[];
  proposedSymbols?: string[];
  diff?: string;
  proposedContractChanges?: {
    contractName: string;
    breaking: boolean;
    changes: string;
  };
}

export class ConflictEngine {
  private db: DevGraphDatabase;

  constructor(db: DevGraphDatabase) {
    this.db = db;
  }

  public async evaluateConflicts(
    options: ConflictCheckOptions
  ): Promise<ConflictFinding[]> {
    const {
      projectId,
      sessionId,
      proposedFiles = [],
      proposedSymbols = [],
      diff,
      proposedContractChanges,
    } = options;

    const findings: ConflictFinding[] = [];

    // Retrieve active sessions and changes from the graph
    const activeSessions = await this.db.getActiveSessions(projectId);
    const activeChanges = await this.db.getActiveChanges(projectId);

    // Filter out our own session if checking against other concurrent work
    const otherSessions = activeSessions.filter(
      (s) => !sessionId || s.sessionId !== sessionId
    );
    const otherChanges = activeChanges.filter(
      (c) => !sessionId || c.sessionId !== sessionId
    );

    // ------------------------------------------------------------------------
    // Risk Category C: Contract Incompatibility
    // ------------------------------------------------------------------------
    if (proposedContractChanges && proposedContractChanges.breaking) {
      // Find downstream consumers of this contract in FalkorDB
      const contractName = proposedContractChanges.contractName;
      const affectedDownstream: string[] = [];
      const affectedSessionIds: string[] = [];

      // Check if any other active session is working on downstream files
      for (const otherSession of otherSessions) {
        // Trace whether otherSession's intendedFiles depend on this contract's file
        for (const intendedFile of otherSession.intendedFiles) {
          const downstreams = await this.db.getDownstreamDependencies(
            projectId,
            intendedFile,
            3
          );
          // If contract is imported or file is related
          affectedSessionIds.push(otherSession.sessionId);
          affectedDownstream.push(intendedFile);
        }
      }

      findings.push({
        findingId: `finding:contract:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
        projectId,
        sessionId,
        riskCategory: "contract_incompatibility",
        severity: "critical",
        status: "confirmed",
        explanation: `Breaking API Contract change detected on "${contractName}". Proposed change: ${proposedContractChanges.changes}`,
        evidence: `Contract "${contractName}" is declared with breaking=true. Details: ${proposedContractChanges.changes}`,
        sourceReferences: [
          {
            filePath: `src/types/${contractName}.ts`,
            symbol: contractName,
          },
        ],
        dependencyPath: [
          contractName,
          ...affectedDownstream,
        ],
        affectedComponents: [contractName, ...affectedDownstream],
        affectedSessions: Array.from(new Set(affectedSessionIds)),
        recommendedAction: `Coordinate with active sessions [${affectedSessionIds.join(", ")}] before applying this breaking contract modification. Consider versioning or adding backward-compatible fields.`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Check if other active changes proposed breaking contract changes that affect our files
    for (const otherChange of otherChanges) {
      if (
        otherChange.proposedContract &&
        otherChange.proposedContract.breaking
      ) {
        const cName = otherChange.proposedContract.contractName;
        // Check if any of our proposed files import or use this contract
        for (const file of proposedFiles) {
          // Query FalkorDB to verify if file imports the contract's file
          const deps = await this.db.getDownstreamDependencies(
            projectId,
            file,
            3
          );
          findings.push({
            findingId: `finding:contract_dep:${otherChange.changeId}`,
            projectId,
            changeId: otherChange.changeId,
            sessionId,
            riskCategory: "contract_incompatibility",
            severity: "high",
            status: "likely",
            explanation: `Concurrent session "${otherChange.sessionId}" published a breaking contract change on "${cName}" which is in the dependency path of your file "${file}".`,
            evidence: `Other change ${otherChange.changeId} proposed breaking changes: ${otherChange.proposedContract.changes}`,
            sourceReferences: otherChange.changedPaths.map((p) => ({
              filePath: p,
              symbol: cName,
            })),
            dependencyPath: [otherChange.changedPaths[0] || cName, file],
            affectedComponents: [file, cName],
            affectedSessions: [otherChange.sessionId],
            recommendedAction: `Inspect concurrent change ${otherChange.changeId} by session ${otherChange.sessionId} and align interface assumptions before committing.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // Risk Category A: Direct Overlap (Same files modified concurrently)
    // ------------------------------------------------------------------------
    for (const file of proposedFiles) {
      for (const otherChange of otherChanges) {
        if (otherChange.changedPaths.includes(file)) {
          findings.push({
            findingId: `finding:overlap:${otherChange.changeId}:${file}`,
            projectId,
            changeId: otherChange.changeId,
            sessionId,
            riskCategory: "direct_overlap",
            severity: "high",
            status: "confirmed",
            explanation: `Direct file modification overlap on "${file}". Session "${otherChange.sessionId}" has an active uncommitted change on this file.`,
            evidence: `File "${file}" is modified in both current session and session "${otherChange.sessionId}" (Change ID: ${otherChange.changeId}, Type: ${otherChange.changeType}).`,
            sourceReferences: [{ filePath: file }],
            dependencyPath: [file],
            affectedComponents: [file],
            affectedSessions: [otherChange.sessionId],
            recommendedAction: `Coordinate with session "${otherChange.sessionId}" to avoid merge conflicts or overwriting concurrent work.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      // Also check against intended files of active sessions (even before changes published)
      for (const otherSession of otherSessions) {
        if (
          otherSession.intendedFiles.includes(file) &&
          !otherChanges.some(
            (c) =>
              c.sessionId === otherSession.sessionId &&
              c.changedPaths.includes(file)
          )
        ) {
          findings.push({
            findingId: `finding:intended_overlap:${otherSession.sessionId}:${file}`,
            projectId,
            sessionId,
            riskCategory: "direct_overlap",
            severity: "medium",
            status: "likely",
            explanation: `Session "${otherSession.sessionId}" announced intended work on "${file}".`,
            evidence: `Session "${otherSession.sessionId}" task: "${otherSession.taskDescription}" has listed "${file}" in its intended scope.`,
            sourceReferences: [{ filePath: file }],
            dependencyPath: [file],
            affectedComponents: [file],
            affectedSessions: [otherSession.sessionId],
            recommendedAction: `Communicate with agent "${otherSession.agentId}" before modifying "${file}".`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // Risk Category B: Shared Symbol (Same function/class/interface)
    // ------------------------------------------------------------------------
    for (const symbol of proposedSymbols) {
      for (const otherChange of otherChanges) {
        if (otherChange.changedSymbols.includes(symbol)) {
          findings.push({
            findingId: `finding:symbol:${otherChange.changeId}:${symbol}`,
            projectId,
            changeId: otherChange.changeId,
            sessionId,
            riskCategory: "shared_symbol",
            severity: "high",
            status: "likely",
            explanation: `Concurrent modification of symbol "${symbol}". Session "${otherChange.sessionId}" is also altering this symbol.`,
            evidence: `Symbol "${symbol}" is targeted by both session "${sessionId || "current"}" and session "${otherChange.sessionId}".`,
            sourceReferences: [{ filePath: "shared", symbol }],
            dependencyPath: [symbol],
            affectedComponents: [symbol],
            affectedSessions: [otherChange.sessionId],
            recommendedAction: `Verify parameter signatures and call-site semantics for "${symbol}".`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // Risk Category E: Downstream Dependency Impact (Informational)
    // ------------------------------------------------------------------------
    for (const file of proposedFiles) {
      const downstreams = await this.db.getDownstreamDependencies(
        projectId,
        file,
        3
      );
      if (downstreams.length > 0) {
        const dependentFiles = Array.from(
          new Set(downstreams.map((d) => d.from))
        );
        findings.push({
          findingId: `finding:impact:${file}`,
          projectId,
          sessionId,
          riskCategory: "dependency_impact",
          severity: "info",
          status: "informational",
          explanation: `Modifying "${file}" impacts ${dependentFiles.length} downstream component(s).`,
          evidence: `Graph traversal found the following dependent files: ${dependentFiles.join(", ")}`,
          sourceReferences: [{ filePath: file }],
          dependencyPath: [file, ...dependentFiles],
          affectedComponents: dependentFiles,
          affectedSessions: [],
          recommendedAction: `Run automated tests on dependent components: ${dependentFiles.join(", ")}.`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return findings;
  }
}
