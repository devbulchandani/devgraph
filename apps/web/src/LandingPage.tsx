import React from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Code2,
  Database,
  GitBranch,
  GitMerge,
  Layers,
  Network,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Zap,
} from "lucide-react";

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export default function LandingPage({ onEnterDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0f19] via-[#0f1420] to-[#0b0f19] text-slate-100 overflow-auto">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white tracking-tight">DevGraph</h1>
              <p className="text-xs text-slate-400">Engineering Memory Platform</p>
            </div>
          </div>
          <button
            onClick={onEnterDashboard}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors flex items-center gap-2"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              One Shared Brain for Every Agent & Developer
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-slate-300 bg-clip-text text-transparent leading-tight">
              Real-Time Coordination
              <br />
              Before the Commit
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              DevGraph maintains a live, shared knowledge graph of your repository's architecture, 
              dependencies, and in-progress changes—so AI agents and developers never work in isolation again.
            </p>

            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={onEnterDashboard}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-2"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <a
                href="https://github.com/devbulchandani/devgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition-all flex items-center gap-2"
              >
                <GitBranch className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0d1322]/50 backdrop-blur p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Shared Memory</h3>
                  <p className="text-sm text-slate-400">
                    Live FalkorDB graph tracking repository structure, dependencies, and active work sessions.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Conflict Detection</h3>
                  <p className="text-sm text-slate-400">
                    Evidence-backed warnings about breaking changes, contract incompatibilities, and overlapping work.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">MCP Integration</h3>
                  <p className="text-sm text-slate-400">
                    Native Model Context Protocol support for Claude, Cursor, and other AI coding agents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-red-950/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              The Problem: Isolated Agents
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              When multiple AI agents work concurrently, they operate as blind silos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/30">
              <div className="text-red-400 mb-4">
                <GitMerge className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Blind Overlaps</h3>
              <p className="text-sm text-slate-400">
                Agent A refactors a shared interface. Agent B writes code against the old contract, unaware of the change.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/30">
              <div className="text-red-400 mb-4">
                <Terminal className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delayed Feedback</h3>
              <p className="text-sm text-slate-400">
                Conflicts discovered only at PR time, wasting engineering hours and expensive token spend.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/30">
              <div className="text-red-400 mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Loss of Context</h3>
              <p className="text-sm text-slate-400">
                No global awareness of architectural decisions, downstream impact, or uncommitted changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              The DevGraph Solution
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              A live, graph-powered coordination layer for modern engineering teams
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Live AST Indexing</h3>
                  <p className="text-sm text-slate-400">
                    TypeScript Compiler API extracts files, functions, classes, interfaces, and dependency relationships into FalkorDB.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Uncommitted Change Tracking</h3>
                  <p className="text-sm text-slate-400">
                    Agents publish in-progress changes to the graph before git commit, making work visible to other agents instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Evidence-Backed Conflicts</h3>
                  <p className="text-sm text-slate-400">
                    5 deterministic conflict categories (A-E) with graph traversal paths, symbol names, and diff citations—zero false certainty.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">MCP Native Protocol</h3>
                  <p className="text-sm text-slate-400">
                    8 tools for agents: get_coding_context, announce_work, publish_change, check_conflicts, and more.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real-Time Dashboard</h3>
                  <p className="text-sm text-slate-400">
                    Interactive Cytoscape.js graph visualization, conflict center, agent activity feed, and live metrics.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI Investigation Layer</h3>
                  <p className="text-sm text-slate-400">
                    Gemini integration provides architectural explanations and compatible resolution strategies for conflicts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-blue-950/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Built on FalkorDB and powered by the Model Context Protocol
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-6 rounded-xl bg-[#111827] border border-[#1f2937]">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Code2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">1. Index</h3>
              <p className="text-xs text-slate-400">
                TypeScript AST extraction into FalkorDB graph
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-[#111827] border border-[#1f2937]">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">2. Announce</h3>
              <p className="text-xs text-slate-400">
                Agents register work sessions via MCP tools
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-[#111827] border border-[#1f2937]">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">3. Track</h3>
              <p className="text-xs text-slate-400">
                Publish uncommitted changes to shared graph
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-[#111827] border border-[#1f2937]">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">4. Detect</h3>
              <p className="text-xs text-slate-400">
                Evidence-backed conflict warnings before commit
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built With Modern Stack
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "FalkorDB", desc: "Graph Database" },
              { name: "TypeScript", desc: "Full Stack" },
              { name: "React", desc: "Dashboard UI" },
              { name: "MCP", desc: "Agent Protocol" },
              { name: "Cytoscape.js", desc: "Graph Viz" },
              { name: "Express", desc: "REST API" },
              { name: "Tailwind CSS", desc: "Styling" },
              { name: "Gemini AI", desc: "Investigation" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="p-4 rounded-lg bg-[#111827] border border-[#1f2937] text-center"
              >
                <div className="font-mono font-semibold text-white text-sm mb-1">
                  {tech.name}
                </div>
                <div className="text-xs text-slate-400">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Coordinate Your Agents?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Experience real-time agent coordination with evidence-backed conflict detection.
              Run the two-agent demo and see DevGraph in action.
            </p>
            <button
              onClick={onEnterDashboard}
              className="px-10 py-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center gap-3 mx-auto"
            >
              Launch DevGraph Dashboard
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white">DevGraph</div>
                <div className="text-xs text-slate-400">One Shared Brain for Every Agent</div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a
                href="https://github.com/devbulchandani/devgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
              <span>•</span>
              <button onClick={onEnterDashboard} className="hover:text-white transition-colors">
                Dashboard
              </button>
              <span>•</span>
              <span>Built for Hackathon MVP</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
