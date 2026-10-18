import React, { useEffect, useState, useRef } from "react";
import cytoscape from "cytoscape";
import LandingPage from "./LandingPage";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCode2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Home,
  Layers,
  LayoutDashboard,
  Network,
  Play,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

interface OverviewData {
  projectId: string;
  activeSessionsCount: number;
  activeChangesCount: number;
  conflictsCount: number;
  activeSessions: any[];
  activeChanges: any[];
  conflicts: any[];
  recentEvents: any[];
}

interface HealthData {
  status: string;
  falkordb: {
    status: string;
    latencyMs?: number;
    graphId: string;
    nodeCount?: number;
    relationshipCount?: number;
  };
  aiProvider: string;
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "graph" | "conflicts" | "activity"
  >("overview");
  const [projectId, setProjectId] = useState("");
  const [customProjectId, setCustomProjectId] = useState("");
  const [customRepoPath, setCustomRepoPath] = useState("");
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  });
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  // Fetch Health & Overview
  const fetchData = async () => {
    try {
      const [healthRes, overviewRes] = await Promise.all([
        fetch("/api/health"),
        fetch(`/api/projects/${projectId}/overview`),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        setOverview(ov);
      }
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    }
  };

  // Fetch Graph Data
  const fetchGraph = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error("Failed to fetch graph data", err);
    }
  };

  // Load saved project from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("devgraph-project");
    if (saved) {
      try {
        const { projectId: savedId } = JSON.parse(saved);
        setProjectId(savedId || "sample-auth-service");
      } catch {
        setProjectId("sample-auth-service");
      }
    } else {
      setProjectId("sample-auth-service");
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchData();
      fetchGraph();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  // Connect to SSE for Live Updates
  useEffect(() => {
    const sse = new EventSource("/api/events");
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "init" && Array.isArray(data.history)) {
          setEvents(data.history);
        } else if (data.eventId) {
          setEvents((prev) => [data, ...prev.slice(0, 100)]);
          fetchData();
          fetchGraph();
        }
      } catch (err) {
        console.error("Error parsing SSE event", err);
      }
    };
    return () => sse.close();
  }, []);

  // Initialize Cytoscape when on graph tab
  useEffect(() => {
    if (activeTab === "graph" && cyRef.current && graphData.nodes.length > 0) {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }

      const elements: any[] = [];
      const nodeColors: Record<string, string> = {
        Project: "#3b82f6",
        Repository: "#6366f1",
        File: "#10b981",
        Function: "#06b6d4",
        Class: "#8b5cf6",
        Interface: "#ec4899",
        APIContract: "#f59e0b",
        WorkSession: "#e11d48",
        Change: "#f97316",
        Decision: "#14b8a6",
      };

      // Add nodes
      for (const n of graphData.nodes) {
        elements.push({
          data: {
            id: n.id,
            label: n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label,
            fullLabel: n.label,
            type: n.type,
            color: nodeColors[n.type] || "#94a3b8",
            properties: n.properties,
          },
        });
      }

      // Add edges
      for (const e of graphData.edges) {
        elements.push({
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            relType: e.label,
          },
        });
      }

      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              color: "#ffffff",
              "font-size": "11px",
              "font-weight": 600,
              "font-family": "Plus Jakarta Sans, sans-serif",
              "text-valign": "center",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": "80px",
              "background-color": "data(color)",
              width: 50,
              height: 50,
              "border-width": 2.5,
              "border-color": "#0b0f19",
              "border-opacity": 1,
              "text-outline-color": "#0b0f19",
              "text-outline-width": 2.5,
              "overlay-opacity": 0,
            },
          },
          {
            selector: "edge",
            style: {
              label: "",  // Hide edge labels to reduce clutter
              "font-size": "8px",
              "font-family": "JetBrains Mono, monospace",
              color: "#64748b",
              width: 1.5,
              "line-color": "#334155",
              "target-arrow-color": "#334155",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.8,
              "curve-style": "bezier",
              opacity: 0.6,
            },
          },
          {
            selector: "edge[relType]",
            style: {
              "line-style": (ele: any) => {
                const relType = ele.data("relType");
                if (relType === "IMPORTS" || relType === "DEPENDS_ON") return "dashed";
                return "solid";
              },
            },
          },
          {
            selector: ":selected",
            style: {
              "border-color": "#60a5fa",
              "border-width": 4,
              "line-color": "#60a5fa",
              "target-arrow-color": "#60a5fa",
              opacity: 1,
              "z-index": 999,
            },
          },
          {
            selector: "node:active",
            style: {
              "overlay-color": "#60a5fa",
              "overlay-padding": 6,
              "overlay-opacity": 0.2,
            },
          },
          {
            selector: "edge:selected",
            style: {
              width: 3,
              "z-index": 999,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: true,
          animationDuration: 400,
          animationEasing: "ease-in-out",
          nodeRepulsion: () => 12000,
          idealEdgeLength: () => 150,
          edgeElasticity: () => 120,
          gravity: 0.05,
          numIter: 1200,
          fit: true,
          padding: 60,
          randomize: false,
          componentSpacing: 100,
        },
        minZoom: 0.2,
        maxZoom: 2.5,
        wheelSensitivity: 0.15,
      });

      cyInstance.current.on("tap", "node", (evt) => {
        const node = evt.target;
        setSelectedNode(node.data());
      });

      cyInstance.current.on("tap", (evt) => {
        if (evt.target === cyInstance.current) {
          setSelectedNode(null);
        }
      });
    }
  }, [activeTab, graphData]);

  // Save project configuration
  const saveProjectConfig = () => {
    if (!customProjectId.trim()) {
      alert("Please enter a project ID");
      return;
    }
    
    const config = {
      projectId: customProjectId,
      repoPath: customRepoPath || "demo/sample-repo",
    };
    
    localStorage.setItem("devgraph-project", JSON.stringify(config));
    setProjectId(customProjectId);
    setShowProjectConfig(false);
    setActionMessage(`Project switched to: ${customProjectId}`);
  };

  // Action: Trigger Indexing
  const triggerIndex = async () => {
    setIsRunningAction(true);
    
    // Get repo path from localStorage
    let repoPath = "demo/sample-repo";
    const saved = localStorage.getItem("devgraph-project");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        repoPath = config.repoPath || "demo/sample-repo";
      } catch {}
    }
    
    setActionMessage(`Indexing ${repoPath} into FalkorDB...`);
    try {
      const res = await fetch(`/api/projects/${projectId}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath: repoPath,
          repositoryId: `${projectId}-repo`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(
          `Indexed ${data.result.indexedFiles} files, ${data.result.functionsCount} functions, ${data.result.contractsCount} API contracts in ${data.result.durationMs}ms.`
        );
        fetchData();
        fetchGraph();
      } else {
        setActionMessage(`Indexing failed: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Action: Run Agent A (Breaking Change)
  const runAgentA = async () => {
    setIsRunningAction(true);
    setActionMessage("Agent A: Announcing work & publishing breaking API contract change...");
    try {
      // 1. Announce work
      const sessionRes = await fetch(`/api/projects/${projectId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "agent-a-auth-engineer",
          task_description: "Refactor UserAuthResponse contract to separate accessToken and refreshToken",
          intended_files: ["src/types/auth.dto.ts", "src/services/auth.service.ts"],
          intended_symbols: ["UserAuthResponse", "authenticate"],
          branch: "feature/jwt-refactor",
        }),
      });
      const sessionData = await sessionRes.json();
      const sessionId = sessionData.sessionId;

      // 2. Publish uncommitted breaking change
      await fetch(`/api/projects/${projectId}/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          change_version: 1,
          changed_files: ["src/types/auth.dto.ts"],
          changed_symbols: ["UserAuthResponse"],
          change_type: "intended",
          proposed_contract_changes: {
            contract_name: "UserAuthResponse",
            breaking: true,
            changes: "Replaced property 'token: string' with nested object 'tokens: { access: string, refresh: string }'",
          },
          diff: "- token: string;\n+ tokens: { access: string; refresh: string };",
          evidence: "API contract UserAuthResponse modified before git commit",
        }),
      });

      setActionMessage("Agent A published breaking contract change. Check Conflict Center!");
      fetchData();
      fetchGraph();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Action: Run Agent B (Context Query & Conflict Detection)
  const runAgentB = async () => {
    setIsRunningAction(true);
    setActionMessage("Agent B: Requesting get_coding_context for frontend login flow...");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/context?task_description=Implement+frontend+login+page+using+authClient&files=src/components/LoginPage.tsx,src/client/authClient.ts&symbols=handleLoginSubmit,authClient`
      );
      const data = await res.json();
      if (data.potentialConflicts && data.potentialConflicts.length > 0) {
        setActionMessage(
          `Agent B context retrieved! DevGraph detected ${data.potentialConflicts.length} conflict warning(s) with supporting evidence!`
        );
        setActiveTab("conflicts");
        setSelectedFinding(data.potentialConflicts[0]);
      } else {
        setActionMessage("Agent B context retrieved. No conflicts found.");
      }
      fetchData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Action: Run AI Deep Investigation
  const runAiInvestigation = async (finding: any) => {
    setIsInvestigating(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding,
          context: {
            projectId,
            activeSessions: overview?.activeSessions,
            activeChanges: overview?.activeChanges,
          },
        }),
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err: any) {
      setAiAnalysis({
        summary: "Analysis failed",
        compatibleStrategy: err.message,
        recommendedTests: [],
        confidence: 0,
      });
    } finally {
      setIsInvestigating(false);
    }
  };

  // Show landing page if requested
  if (showLanding) {
    return <LandingPage onEnterDashboard={() => setShowLanding(false)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-200">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#1e293b] bg-[#0d1322] flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-5 border-b border-[#1e293b] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                DevGraph
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  MVP
                </span>
              </h1>
              <p className="text-xs text-slate-400">Agent Memory Brain</p>
            </div>
          </div>

          {/* Project Selector */}
          <div className="p-4 border-b border-[#1e293b]/60">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Active Project
            </label>
            <button
              onClick={() => {
                setShowProjectConfig(true);
                setCustomProjectId(projectId);
                const saved = localStorage.getItem("devgraph-project");
                if (saved) {
                  try {
                    const { repoPath } = JSON.parse(saved);
                    setCustomRepoPath(repoPath || "");
                  } catch {}
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#162032] border border-[#1e293b] hover:border-blue-500/50 text-sm text-slate-200 font-mono transition-colors group"
            >
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span className="truncate flex-1 text-left">{projectId || "No Project"}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-blue-400">Edit</span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setShowLanding(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-[#162032] border border-transparent hover:border-[#1e293b]"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>

            <div className="h-px bg-[#1e293b]/60 my-2" />

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#162032]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Project Overview
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "graph"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#162032]"
              }`}
            >
              <Network className="w-4 h-4" />
              Dependency Graph
              {graphData.nodes.length > 0 && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-[#1e293b] text-slate-400 font-mono">
                  {graphData.nodes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("conflicts")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "conflicts"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#162032]"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Conflict Center
              {overview?.conflictsCount ? (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                  {overview.conflictsCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "activity"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#162032]"
              }`}
            >
              <Activity className="w-4 h-4" />
              Agent Activity Feed
              {events.length > 0 && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-[#1e293b] text-slate-400 font-mono">
                  {events.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* FalkorDB Connection Badge */}
        <div className="p-4 border-t border-[#1e293b] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              FalkorDB
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-[11px] ${
                health?.falkordb?.status === "healthy"
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  health?.falkordb?.status === "healthy"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              {health?.falkordb?.status === "healthy"
                ? `${health.falkordb.latencyMs}ms`
                : "Checking..."}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              AI Layer
            </span>
            <span className="text-slate-300 font-mono text-[11px] truncate max-w-[100px]">
              {health?.aiProvider || "Loading..."}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#1e293b] bg-[#0f172a]/70 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white capitalize">
              {activeTab === "overview" && "Project Overview & Status"}
              {activeTab === "graph" && "Live Dependency & Work Subgraph"}
              {activeTab === "conflicts" && "Conflict & Semantic Risk Center"}
              {activeTab === "activity" && "Real-Time Agent Coordination Feed"}
            </h2>
            {actionMessage && (
              <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 animate-fade-in font-mono">
                {actionMessage}
              </span>
            )}
          </div>

          {/* Quick Demo Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={triggerIndex}
              disabled={isRunningAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-medium border border-[#334155] transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              1. Index Repo
            </button>

            <button
              onClick={runAgentA}
              disabled={isRunningAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/30 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              2. Agent A (Breaking Change)
            </button>

            <button
              onClick={runAgentB}
              disabled={isRunningAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium border border-blue-500/30 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Agent B (Verify Conflict)
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Active Work Sessions</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {overview?.activeSessionsCount || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Live coding agent sessions
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Uncommitted Changes</span>
                    <GitCommit className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {overview?.activeChangesCount || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Tracked before git commit
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Open Conflict Risks</span>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {overview?.conflictsCount || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Evidence-backed findings
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Graph Nodes & Edges</span>
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {health?.falkordb?.nodeCount ?? graphData.nodes.length}
                    <span className="text-xs text-slate-400 font-normal ml-2">
                      ({health?.falkordb?.relationshipCount ?? graphData.edges.length} edges)
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    FalkorDB persistent graph
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Sessions & Changes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Sessions */}
                <div className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-blue-400" />
                    Active Work Sessions
                  </h3>
                  {overview?.activeSessions && overview.activeSessions.length > 0 ? (
                    <div className="space-y-3">
                      {overview.activeSessions.map((s: any) => (
                        <div
                          key={s.sessionId}
                          className="p-3.5 rounded-lg bg-[#162032] border border-[#1f2937] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-blue-300">
                              {s.agentId}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {s.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {s.taskDescription}
                          </p>
                          {s.intendedFiles?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.intendedFiles.map((f: string) => (
                                <span
                                  key={f}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b0f19] text-slate-400 border border-[#1e293b]"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No active sessions registered. Run Agent A above to create one.
                    </div>
                  )}
                </div>

                {/* Active Changes */}
                <div className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <GitCommit className="w-4 h-4 text-amber-400" />
                    Uncommitted Changes
                  </h3>
                  {overview?.activeChanges && overview.activeChanges.length > 0 ? (
                    <div className="space-y-3">
                      {overview.activeChanges.map((c: any) => (
                        <div
                          key={c.changeId}
                          className="p-3.5 rounded-lg bg-[#162032] border border-[#1f2937] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-slate-300">
                              {c.changeId}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                              {c.changeType}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Files:{" "}
                            <span className="font-mono text-slate-200">
                              {c.changedPaths.join(", ")}
                            </span>
                          </div>
                          {c.proposedContract && (
                            <div className="p-2 rounded bg-red-950/30 border border-red-900/40 text-xs text-red-300">
                              <span className="font-semibold">
                                Contract Change ({c.proposedContract.contractName}):
                              </span>{" "}
                              {c.proposedContract.changes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No uncommitted changes published.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEPENDENCY & WORK GRAPH */}
          {activeTab === "graph" && (
            <div className="h-full flex flex-col">
              {graphData.nodes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-xl bg-[#111827] border border-[#1f2937]">
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                      <Network className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">No Graph Data</h3>
                    <p className="text-sm text-slate-400">
                      Index your repository to visualize the dependency graph. Click "1. Index Repo" in the header to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col rounded-xl bg-[#111827] border border-[#1f2937] overflow-hidden relative">
                  {/* Graph Controls */}
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <button
                      onClick={() => cyInstance.current?.fit()}
                      className="p-2 rounded-lg bg-[#0b0f19]/90 border border-[#1e293b] backdrop-blur hover:bg-[#162032] transition-colors"
                      title="Fit to view"
                    >
                      <Layers className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2)}
                      className="p-2 rounded-lg bg-[#0b0f19]/90 border border-[#1e293b] backdrop-blur hover:bg-[#162032] transition-colors text-slate-300 text-sm font-bold"
                      title="Zoom in"
                    >
                      +
                    </button>
                    <button
                      onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 0.8)}
                      className="p-2 rounded-lg bg-[#0b0f19]/90 border border-[#1e293b] backdrop-blur hover:bg-[#162032] transition-colors text-slate-300 text-sm font-bold"
                      title="Zoom out"
                    >
                      −
                    </button>
                  </div>

                  {/* Graph Legend */}
                  <div className="absolute top-4 left-4 z-10 p-3.5 rounded-lg bg-[#0b0f19]/95 border border-[#1e293b] backdrop-blur-xl shadow-xl max-w-xs">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Node Types</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">File</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#06b6d4] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">Function</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#8b5cf6] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">Class</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#ec4899] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">Interface</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">Contract</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#e11d48] border-2 border-[#0b0f19]" />
                        <span className="text-slate-300">Session</span>
                      </span>
                    </div>
                    <div className="border-t border-[#1e293b]/60 pt-2 text-[10px] space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-8 h-0.5 bg-[#334155]"></div>
                        <span>Solid: Contains/Uses</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-8 h-0.5 bg-[#334155] border-dashed" style={{ borderTop: "1.5px dashed #334155", background: "none" }}></div>
                        <span>Dashed: Imports/Deps</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#1e293b]/60 text-[10px] text-slate-500 font-mono">
                      {graphData.nodes.length} nodes • {graphData.edges.length} edges
                    </div>
                  </div>

                  {/* Node Inspector Panel */}
                  {selectedNode && (
                    <div className="absolute bottom-4 left-4 z-10 w-80 p-4 rounded-xl bg-[#0d1322]/95 border border-[#1e293b] backdrop-blur-xl text-xs space-y-3 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                        <span className="font-mono font-bold text-white uppercase text-[11px]">
                          {selectedNode.type}
                        </span>
                        <button
                          onClick={() => setSelectedNode(null)}
                          className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <div className="font-mono text-slate-200 text-sm font-semibold break-all">
                        {selectedNode.fullLabel}
                      </div>
                      {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 text-slate-400 pt-1 font-mono text-[11px]">
                          {Object.entries(selectedNode.properties).map(([k, v]) => (
                            <div key={k} className="border-b border-[#1e293b]/50 pb-1">
                              <span className="text-slate-500">{k}: </span>
                              <span className="text-slate-300">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cytoscape Canvas */}
                  <div ref={cyRef} className="w-full h-full min-h-[600px]" />
                </div>
              )}
            </div>
          )}

          {/* TAB: CONFLICT CENTER */}
          {activeTab === "conflicts" && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Semantic Conflict & Risk Findings
                  </h3>
                  <p className="text-xs text-slate-400">
                    Graph-derived warnings with citations, dependency paths, and evidence
                  </p>
                </div>
              </div>

              {overview?.conflicts && overview.conflicts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Finding List */}
                  <div className="lg:col-span-1 space-y-3">
                    {overview.conflicts.map((finding: any) => (
                      <div
                        key={finding.findingId}
                        onClick={() => {
                          setSelectedFinding(finding);
                          setAiAnalysis(null);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedFinding?.findingId === finding.findingId
                            ? "bg-[#162032] border-blue-500 shadow-lg shadow-blue-500/10"
                            : "bg-[#111827] border-[#1f2937] hover:border-[#374151]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              finding.severity === "critical"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {finding.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {finding.riskCategory}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                          {finding.explanation}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Finding Detail Panel */}
                  <div className="lg:col-span-2 rounded-xl bg-[#111827] border border-[#1f2937] p-6 space-y-5">
                    {selectedFinding ? (
                      <>
                        <div className="flex items-start justify-between border-b border-[#1f2937] pb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                {selectedFinding.severity}
                              </span>
                              <span className="text-xs font-mono text-blue-400 uppercase">
                                {selectedFinding.riskCategory}
                              </span>
                              <span className="text-xs font-mono text-emerald-400">
                                Status: {selectedFinding.status}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-white">
                              {selectedFinding.explanation}
                            </h4>
                          </div>

                          <button
                            onClick={() => runAiInvestigation(selectedFinding)}
                            disabled={isInvestigating}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isInvestigating ? "Investigating..." : "AI Investigation"}
                          </button>
                        </div>

                        {/* Evidence Section */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                            Graph & Code Evidence
                          </label>
                          <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1e293b] font-mono text-xs text-amber-200">
                            {selectedFinding.evidence}
                          </div>
                        </div>

                        {/* Dependency Path */}
                        {selectedFinding.dependencyPath &&
                          selectedFinding.dependencyPath.length > 0 && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                Dependency Traversal Path
                              </label>
                              <div className="flex items-center flex-wrap gap-2 p-3 rounded-lg bg-[#0b0f19] border border-[#1e293b] font-mono text-xs text-blue-300">
                                {selectedFinding.dependencyPath.map(
                                  (item: string, idx: number) => (
                                    <React.Fragment key={idx}>
                                      <span className="px-2 py-0.5 rounded bg-[#162032] border border-[#1e293b]">
                                        {item}
                                      </span>
                                      {idx <
                                        selectedFinding.dependencyPath.length -
                                          1 && (
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                                      )}
                                    </React.Fragment>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Recommended Next Action */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                            Recommended Action
                          </label>
                          <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-blue-300">
                            {selectedFinding.recommendedAction}
                          </div>
                        </div>

                        {/* AI Deep Analysis Result */}
                        {aiAnalysis && (
                          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-3 animate-fade-in">
                            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                              <Brain className="w-4 h-4" />
                              AI Architectural Recommendation ({Math.round(aiAnalysis.confidence * 100)}% confidence)
                            </div>
                            <p className="text-xs text-slate-200">
                              {aiAnalysis.summary}
                            </p>
                            <div className="text-xs text-slate-300">
                              <span className="font-semibold text-purple-300">Compatible Strategy: </span>
                              {aiAnalysis.compatibleStrategy}
                            </div>
                            {aiAnalysis.recommendedTests?.length > 0 && (
                              <div className="text-xs space-y-1 text-slate-400">
                                <span className="font-semibold text-slate-300">Recommended Validations:</span>
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {aiAnalysis.recommendedTests.map((t: string, i: number) => (
                                    <li key={i}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs">
                        Select a finding from the left to view graph evidence and recommended next actions.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 rounded-xl bg-[#111827] border border-[#1f2937] text-slate-400 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    No Active Conflicts Detected
                  </p>
                  <p className="text-xs max-w-md mx-auto">
                    All concurrent agent changes are either verified compatible or isolated. Trigger Agent A to simulate an uncommitted breaking change.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVITY FEED */}
          {activeTab === "activity" && (
            <div className="max-w-4xl mx-auto rounded-xl bg-[#111827] border border-[#1f2937] p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f2937] pb-3">
                <Activity className="w-4 h-4 text-blue-400" />
                Live Agent & System Coordination Feed
              </h3>

              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.eventId}
                      className="p-3.5 rounded-lg bg-[#162032] border border-[#1f2937] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-blue-300">
                          {evt.actor}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {evt.eventType}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <pre className="p-2 rounded bg-[#0b0f19] text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No activity events recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Project Configuration Modal */}
      {showProjectConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <h2 className="text-lg font-bold text-white">Configure Project</h2>
              <button
                onClick={() => setShowProjectConfig(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  placeholder="e.g., my-web-app"
                  className="w-full px-3 py-2 bg-[#162032] border border-[#1e293b] rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Unique identifier for this project in DevGraph
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Repository Path (Optional)
                </label>
                <input
                  type="text"
                  value={customRepoPath}
                  onChange={(e) => setCustomRepoPath(e.target.value)}
                  placeholder="e.g., ../my-project or /absolute/path"
                  className="w-full px-3 py-2 bg-[#162032] border border-[#1e293b] rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Path to your repository for indexing. Leave empty to use default demo.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                <strong>Tip:</strong> After configuring, click "1. Index Repo" in the header to index your codebase into FalkorDB.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowProjectConfig(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProjectConfig}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all shadow-lg shadow-blue-500/20"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
