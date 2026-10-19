# DevGraph 🧠
> **One shared brain for every developer and coding agent.**

DevGraph is a graph-powered engineering memory and real-time coordination platform for software teams that utilize multiple human engineers and AI coding agents simultaneously.

Built on **FalkorDB** and powered by the **Model Context Protocol (MCP)**, DevGraph continuously maps repository AST dependencies, tracks concurrent work sessions, captures uncommitted in-progress changes before git commits exist, and detects semantic contract conflicts with verifiable graph evidence.

---

## 🌟 Why DevGraph?

When multiple coding agents (e.g. Claude Code, Cursor, Windsurf, Antigravity) work concurrently in a repository, they operate as isolated silos:
1. **Blind Overlaps**: Agent A refactors a shared interface; Agent B writes code against the old contract unaware.
2. **Delayed Feedback**: Traditional git merge conflicts are only discovered at branch merge or PR time, wasting engineering hours and token spend.
3. **Loss of Context**: Agents lack global awareness of architectural decisions, downstream blast radius, and uncommitted changes across other active branches.

**DevGraph solves this by maintaining a live, shared knowledge graph in FalkorDB.**

---

## 🏗️ Architecture

```
                    ┌───────────────────────────────────────────┐
                    │       Coding Agents (Claude / MCP)        │
                    └──────┬─────────────────────────────▲──────┘
                           │                             │
                  announce_work                   get_coding_context
                  publish_change                  check_conflicts
                           │                             │
                           ▼                             │
                    ┌───────────────────────────────────────────┐
                    │          DevGraph MCP Server              │
                    │   (@modelcontextprotocol/sdk - Stdio)     │
                    └──────┬─────────────────────────────┬──────┘
                           │                             │
                           ▼                             ▼
                    ┌──────────────┐             ┌──────────────┐
                    │  Shared Core │             │   Conflict   │
                    │   Service    │             │    Engine    │
                    └──────┬───────┘             └──────┬───────┘
                           │                            │
                           ▼                            ▼
                 ┌─────────────────────────────────────────────┐
                 │                  FalkorDB                   │
                 │         (Low-Latency Graph Database)        │
                 └──────────────────────▲──────────────────────┘
                                        │
                           ┌────────────┴────────────┐
                           │                         │
                 ┌──────────────────┐      ┌──────────────────┐
                 │   Code Indexer   │      │ React Dashboard  │
                 │ (TS Compiler AST)│      │  (Cytoscape.js)  │
                 └──────────────────┘      └──────────────────┘
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** >= v20 (tested on v26.7.0)
- **pnpm** >= v9
- **Docker** (for FalkorDB container)

### 2. Start FalkorDB
```bash
docker compose up -d
```
*FalkorDB will be available on `localhost:6379`.*

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Run Automated Test Suite
```bash
pnpm test
```
*Runs all 18 unit, integration, AST indexing, MCP protocol, and two-agent scenario tests.*

### 5. Run the Deterministic Two-Agent Demo
```bash
pnpm demo
```
*Indexes the sample repo into FalkorDB, simulates Agent A publishing an uncommitted breaking API change, and demonstrates Agent B receiving an evidence-backed conflict warning before git commit.*

### 6. Start the Server & Web Dashboard
```bash
# Terminal 1: Backend Server (Port 4000)
pnpm dev:server

# Terminal 2: React Dashboard (Port 5173)
pnpm dev:web
```
Open **[http://localhost:5173](http://localhost:5173)** to view the live dashboard!

---

## 🔌 Connecting an AI Agent via MCP

Add DevGraph to your agent's MCP settings configuration:

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "devgraph": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/devgraph/apps/mcp/src/index.ts"],
      "env": {
        "FALKORDB_HOST": "127.0.0.1",
        "FALKORDB_PORT": "6379",
        "FALKORDB_GRAPH_ID": "devgraph"
      }
    }
  }
}
```

### Available MCP Tools
| Tool Name | Purpose |
| :--- | :--- |
| `get_coding_context` | Retrieves focused subgraph memory, dependencies, active sessions, and conflict warnings before coding. |
| `announce_work` | Registers an active work session and intended file scope with immediate overlap detection. |
| `publish_change` | Publishes an in-progress or intended uncommitted change into the shared graph before git commit. |
| `check_conflicts` | Analyzes proposed files/symbols/contracts for Categories A-E risks. |
| `get_impact_analysis` | Downstream dependency traversal tracing blast radius and affected components. |
| `record_decision` | Persists architectural decision records (ADRs) linked to contracts. |
| `complete_work` | Marks work sessions as completed, abandoned, or blocked. |
| `reserve_resource` | Time-bounded coordination leases on critical shared files or schemas. |

---

## 🎯 Semantic Conflict Categories

DevGraph classifies engineering risks into 5 deterministic categories:
- **Category A (Direct Overlap)**: Concurrent active sessions modifying identical source files.
- **Category B (Shared Symbol)**: Concurrent edits touching the same function, class, or interface.
- **Category C (Contract Incompatibility)**: Breaking change to an APIContract / DTO actively depended on by another session.
- **Category D (Architectural Constraint)**: Modifications conflicting with recorded architectural decisions.
- **Category E (Dependency Impact)**: Informational downstream blast radius analysis.

---

## 📊 Live Dashboard Features

- **Project Overview**: Active coding agents, uncommitted changes, open findings, and graph metrics.
- **Dependency & Work Graph**: Interactive Cytoscape.js canvas showing Files, Symbols, Sessions, Changes, and Relationships.
- **Conflict Center**: Structured finding cards with line references, evidence citations, dependency paths, and recommended actions.
- **Agent Activity Feed**: Real-time Server-Sent Events (SSE) stream of all agent announcements, changes, and commits.
- **AI Investigation**: Live Gemini integration providing architectural explanations and compatible resolution strategies.

---

## 🧪 Verification & Definition of Done

- [x] **FalkorDB Persistence**: Graph database client with connection pooling, index creation, and Cypher queries.
- [x] **TypeScript AST Indexing**: File, function, class, interface, and import extraction via TypeScript Compiler API.
- [x] **MCP Protocol Compliance**: Full `@modelcontextprotocol/sdk` implementation using stdio transport.
- [x] **Uncommitted Change Tracking**: Observed and intended changes stored and surfaced prior to git commits.
- [x] **Evidence-Backed Conflicts**: Traversal paths and diff citations with zero false certainty.
- [x] **Compatible Change Non-Conflict**: Backward-compatible changes verified without false positive alerts.
- [x] **100% Passing Automated Tests**: 18 tests covering all service boundaries.


---

## 🚀 AWS Deployment

### Current Status

✅ **AWS Setup Complete:**
- AWS CLI authenticated with profile `devgraph`
- AWS Agent Toolkit installed (24 AWS skills in `~/.kiro/skills`)
- AWS MCP Server configured for Kiro
- CDK environment bootstrapped in `us-east-1`
- Infrastructure code ready in `infrastructure/`

### Deployment Options

#### Option 1: AWS CDK (Full Stack)

The CDK infrastructure is ready but encountered permissions issues. To deploy:

```bash
cd infrastructure

# Deploy frontend only (S3 + CloudFront)
cdk deploy --profile devgraph

# After resolving AWS permissions, deploy full stack:
# - Switch to devgraph-stack.ts in cdk-app.ts
# - Includes ECS Fargate + ElastiCache + ALB
```

**Note:** The root account may need additional IAM permissions or SCP adjustments for full deployment.

#### Option 2: Docker Compose (Recommended for Now)

Deploy immediately on any machine with Docker:

```bash
cd /Users/devbulchandani/DevGraph

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

**Includes:**
- Backend API (port 4000)
- Frontend (port 80)  
- FalkorDB (port 6379)

Access at: `http://localhost`

### Manual AWS Deployment (Alternative)

If CDK permissions remain blocked, deploy manually:

1. **Create EC2 instance** (t3.medium, Ubuntu 22.04)
2. **Upload code**: `scp -r DevGraph ubuntu@ec2-ip:/home/ubuntu/`
3. **SSH and setup**:
   ```bash
   ssh ubuntu@ec2-ip
   cd DevGraph
   
   # Install dependencies
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt-get install -y nodejs docker.io docker-compose
   sudo npm install -g pnpm pm2
   
   # Start services
   docker-compose -f docker-compose.prod.yml up -d
   
   # Access at http://ec2-ip
   ```

---

## 📦 Project Structure
