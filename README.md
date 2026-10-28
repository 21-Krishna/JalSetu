# JalSetu — AI-Powered Urban Water Crisis Decision-Support System

> **DEMO MODE — SIMULATED WATER NETWORK AND ILLUSTRATIVE DATA**  
> Fictional municipal demonstration network developed for the **AgentX 2026** college exhibition.  
> Combines a high-fidelity React operations command center with a Python FastAPI decision-support engine, persistent SQLite database, and a deterministic 4-stage specialist multi-agent system.

---

## 1. Project Purpose & Scope

JalSetu is a simulated urban water-crisis decision-support system designed to demonstrate how municipal water-supply emergencies can be rapidly analyzed, how alternative response plans can be formulated by specialized agents, how physically infeasible actions are strictly blocked by safety validation gates, and how a human operator retains final approval authority before any response is committed.

### Simulated Data & Ethical Disclosure
- **Demonstration Prototype**: JalSetu is an educational exhibition prototype, not a production municipal SCADA or valve control system.
- **Illustrative Networks**: All geographic network layouts, reservoir capacities, pipe diameters, booster pump ratings, and zonal water demands are simulated illustrative models developed for realistic demonstration. Real city names (Greater Noida, Delhi, Jaipur, Lucknow, Bengaluru) provide geographic and operational context.
- **No Live Actuators**: The system does not claim real-time SCADA telemetry, live municipal sensor integration, or automated physical valve actuation.
- **Deterministic & Explainable**: The specialist AI agents operate using transparent, deterministic algorithms and graph traversal rules. No synthetic LLM API calls are fabricated to mimic artificial intelligence.

---

## 2. Five-Member Team Responsibilities

The JalSetu project is organized into five distinct engineering responsibilities:

| Member & Role | Core Responsibilities | Key Deliverables & Modules |
| :--- | :--- | :--- |
| **Member 1: Frontend & Dashboard** | User interface design, interactive network visualizer, multi-city selector, live metrics, state synchronization, crisis trigger modal, flow diagnostics, and human approval modals. | • React + TanStack Start UI (`src/`)<br>• `AppShell.tsx`, `simulator.tsx`, `reservoirs.tsx`<br>• `CrisisTriggerModal.tsx`, `NetworkFlowDiagram.tsx`<br>• `MultiAgentWorkflowStepper.tsx`, `PlanComparisonSection.tsx`<br>• `RecommendedPlanPanel.tsx`, `HumanApprovalModal.tsx`<br>• Real-time reactive Zustand/React store (`store.tsx`)<br>• Responsive Tailwind CSS styling & Lucide icons |
| **Member 2: Water Simulation & Data** | Hydraulic baseline equations, water balance calculation ($\text{Supplied} + \text{Unmet} == \text{Demand}$), supply/demand accounting, deficit modeling, and tanker fleet mathematics. | • `backend/app/network/topology.py`<br>• Baseline demands ($36\text{ MLD}$ Greater Noida, $44\text{ MLD}$ Delhi, etc.)<br>• Tanker volumetric rules ($0.5\text{ MLD}$ per vehicle)<br>• Water balance verification |
| **Member 3: Network Infrastructure** | Directed network graph representation using NetworkX, topological sorting, edge/link capacity enforcement, link rupture modeling, and downstream outage traversal. | • `backend/app/network/graph_analysis.py`<br>• NetworkX Digraph construction<br>• Link capacity derating & severed pipeline detection<br>• Bottleneck tracing & Reachability analysis<br>• Offline asset bypass routing |
| **Member 4: Multi-Agent System** | Architecture and implementation of the 4 specialist agents, Agent Orchestrator, structured Pydantic I/O, explainable trade-off summaries, and human-in-the-loop gating. | • `backend/app/agents/`<br>• Incident Analysis, Resource Optimization<br>• Validation & Safety Agent, Response Monitoring<br>• Multi-criteria decision matrix scoring & plain-English rationales |
| **Member 5: Decision Engine & Integration** | FastAPI backend API, SQLite ORM persistence, backend hard-constraint validation gate, multi-city data isolation, and comprehensive test suite. | • `backend/app/routes/` & `entities.py`<br>• Backend HTTP 400 validation rejection gate<br>• SQLite persistence (`jalsetu.db`) & Audit trail<br>• 66 Pytest backend test suite |

---

## 3. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │             React + TanStack Start Frontend            │
                               │  Command Center Dashboard · Flow Topology · Simulator  │
                               │  City Selector · Candidate Plan Comparison · Audit Log │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │ REST API (/api/v1)
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                 FastAPI Backend Engine                 │
                               │   Request Validation · Route Handlers · ORM Session    │
                               │   Hard-Constraint Gate (HTTP 400 Rejection on Invalid) │
                               └──────────────┬──────────────────────────┬──────────────┘
                                              │                          │
                 ┌────────────────────────────┴─────────┐     ┌──────────┴───────────────┐
                 │      Multi-Agent Pipeline Service    │     │  SQLite Persistent Store │
                 │                                      │     │        (jalsetu.db)      │
                 │ 1. Incident Analysis Agent (Graph)   │     │ • cities                 │
                 │ 2. Resource Optimization Agent       │     │ • network_assets         │
                 │ 3. Validation & Safety Agent (Gate)  │     │ • zones                  │
                 │ 4. Response Monitoring Agent         │     │ • incidents              │
                 │ 5. Agent Orchestrator                │     │ • agent_runs             │
                 │                                      │     │ • response_plans         │
                 │    + Transparent Deterministic Logic │     │ • allocations            │
                 │    + Human-in-the-Loop Approval Gate │     │ • audit_events           │
                 └──────────────────────────────────────┘     └──────────────────────────┘
```

---

## 4. Multi-Agent System Architecture

The JalSetu core is powered by four specialist agents executed in strict sequence by an Orchestrator:

```
[ Crisis Incident ]
         │
         ▼
┌─────────────────────────────────┐
│ 1. Incident Analysis Agent      │ ──► Inspects NetworkX graph, calculates severed paths,
│    (NetworkX Graph Specialist)  │     identifies affected zones, deficits & bottlenecks.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. Resource Optimization Agent  │ ──► Synthesizes 3 candidate mitigation strategies:
│    (Planning Specialist)        │     • Plan A: Priority-First Reroute + Tankers
└────────────────┬────────────────┘     • Plan B: Fair-Share Rationing + Tankers
                 │                      • Plan C: Counter-factual Full-Demand Benchmark
                 ▼
┌─────────────────────────────────┐
│ 3. Validation & Safety Agent    │ ──► Independent Safety Gate: Evaluates 7 hard physical
│    (Constraint Safety Gate)     │     constraints. Rejects Plan C; certifies Plans A & B.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 4. Response Monitoring Agent    │ ──► Evaluates feasible plans using multi-criteria matrix,
│    (Decision Support Specialist)│     ranks candidates, outputs human-readable rationale.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Human-in-the-Loop Decision Gate │ ──► Operator confirms or rejects plan. System enforces
│ (Mandatory Operator Approval)   │     backend validation before updating SQLite state.
└─────────────────────────────────┘
```

### The 4 Specialist Agents:
1. **Incident Analysis Agent (Stage 1)**:
   - Ingests the newly triggered incident and builds the active city's NetworkX directed graph.
   - Simulates asset degradation or total failure by adjusting capacity factors ($0.0 \le \text{factor} \le 1.0$).
   - Traverses downstream paths to identify disconnected or starved zones.
   - Computes baseline supply, post-incident pipe supply, zonal deficits, and critical bottlenecks.

2. **Resource Optimization Agent (Stage 2)**:
   - Generates three distinct candidate response plans:
     - **Plan A (Priority-First Rerouting)**: Prioritizes critical civic infrastructure (hospitals, dense residential hubs) for remaining pipe throughput and dispatches road tankers to cover deficits.
     - **Plan B (Fair-Share Proportional Rationing)**: Distributes available pipe water proportionally across all zones based on demand, deploying tankers to balance remaining deficits.
     - **Plan C (Full-Demand Counter-Factual Benchmark)**: Attempts to fulfill 100% of demand through the damaged network. Serves as a vital negative-control benchmark to demonstrate the safety validation gate.

3. **Validation and Safety Agent (Stage 3)**:
   - Evaluates each candidate plan against seven hard physical and hydraulic constraints:
     1. **Treatment Plant Capacity**: Total treatment flow cannot exceed effective plant throughput.
     2. **Pump Operating Limits**: Throughput through any pump cannot exceed its operating rating ($0.0\text{ MLD}$ if pump is offline).
     3. **Pipeline Design Capacities**: Flow through any pipe segment cannot exceed its hydraulic design limit.
     4. **Municipal Tanker Fleet Limit**: Deployed road tankers cannot exceed the city fleet size ($8$ in Greater Noida, $10$ in Delhi, $12$ in Jaipur, $8$ in Lucknow, $14$ in Bengaluru).
     5. **Tanker Volumetric Math**: Tanker water volume must strictly equal $\text{tankers} \times 0.5\text{ MLD}$.
     6. **Non-Negativity**: Allocations cannot be negative ($\ge 0$).
     7. **Demand Ceiling**: Total water allocated to any zone cannot exceed that zone's current demand.
   - **Outcome**: Marks Plan A and Plan B as **feasible**; **blocks Plan C as infeasible** with explicit physical violation notes.

4. **Response Monitoring Agent (Stage 4)**:
   - Filters out infeasible plans and scores surviving candidates using a multi-criteria decision matrix:
     $$\text{Score} = w_1 \cdot (1 - \text{Deficit Ratio}) + w_2 \cdot (\text{High-Priority Protection}) - w_3 \cdot (\text{Tanker Fleet Cost})$$
   - Formulates explainable, operator-friendly natural-language rationales detailing why the recommended plan was chosen.

5. **Agent Orchestrator & Audit Service**:
   - Manages execution sequence, logs execution time ($<25\text{ ms}$ per agent), and commits structured execution records to the `agent_runs` table.
   - Appends chronological event records to the `audit_events` table for compliance and post-incident review.

---

## 5. Multi-City Topologies & Crisis Scenarios

JalSetu includes five distinct municipal networks, each with its own water sources, treatment plants, booster pumps, supply zones, tanker fleets, and deterministic demonstration scenarios:

| City | Source & Intake | Water Treatment Plant | Primary Pumps | Supply Zones (Demand) | Tanker Fleet | Built-in Scenarios |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Greater Noida** *(Default)* | Upper Ganga Canal ($40\text{ MLD}$) | Kasna WTP ($36\text{ MLD}$) | P-03 ($18\text{ MLD}$)<br>P-04 ($18\text{ MLD}$) | Z-01 North ($10\text{ MLD}$)<br>Z-02 Market ($12\text{ MLD}$)<br>Z-03 Institutional ($8\text{ MLD}$)<br>Z-04 South ($6\text{ MLD}$)<br>*(Total: $36\text{ MLD}$)* | 8 Tankers ($4.0\text{ MLD}$) | • **Pump Failure P-03** *(Core Exhibition Demo)*<br>• WTP Kasna Derating (50%)<br>• Heatwave Demand Surge (+30%)<br>• Dual Pump Outage |
| **Delhi** | Yamuna River Intake ($50\text{ MLD}$) | Sonia Vihar WTP ($46\text{ MLD}$) | P-DEL-01 ($24\text{ MLD}$)<br>P-DEL-02 ($22\text{ MLD}$) | DEL-Z01 Civil Lines ($12\text{ MLD}$)<br>DEL-Z02 Connaught Place ($14\text{ MLD}$)<br>DEL-Z03 Dwarka ($10\text{ MLD}$)<br>DEL-Z04 Okhla ($8\text{ MLD}$)<br>*(Total: $44\text{ MLD}$)* | 10 Tankers ($5.0\text{ MLD}$) | • Trans-Yamuna Booster Failure (P-DEL-01)<br>• Sonia Vihar Turbidity Derating (60%) |
| **Jaipur** | Bisalpur Dam Feeder ($42\text{ MLD}$) | Surajpura WTP ($38\text{ MLD}$) | P-JPR-01 ($20\text{ MLD}$)<br>P-JPR-02 ($18\text{ MLD}$) | JPR-Z01 Mansarovar ($10\text{ MLD}$)<br>JPR-Z02 Vaishali Nagar ($12\text{ MLD}$)<br>JPR-Z03 Malviya Nagar ($9\text{ MLD}$)<br>JPR-Z04 Walled City ($7\text{ MLD}$)<br>*(Total: $38\text{ MLD}$)* | 12 Tankers ($6.0\text{ MLD}$) | • Mansarovar Pump Trip (P-JPR-01)<br>• Arid Summer Demand Surge (+35%) |
| **Lucknow** | Gomti Barrage Intake ($36\text{ MLD}$) | Aishbagh WTP ($32\text{ MLD}$) | P-LKO-01 ($16\text{ MLD}$)<br>P-LKO-02 ($16\text{ MLD}$) | LKO-Z01 Hazratganj ($9\text{ MLD}$)<br>LKO-Z02 Gomti Nagar ($11\text{ MLD}$)<br>LKO-Z03 Alambagh ($7\text{ MLD}$)<br>LKO-Z04 Indira Nagar ($5\text{ MLD}$)<br>*(Total: $32\text{ MLD}$)* | 8 Tankers ($4.0\text{ MLD}$) | • Hazratganj Feeder Pump Outage (P-LKO-01)<br>• Aishbagh Filter Maintenance |
| **Bengaluru** | Cauvery Stage IV Intake ($48\text{ MLD}$) | TK Halli WTP ($44\text{ MLD}$) | P-BLR-01 ($22\text{ MLD}$)<br>P-BLR-02 ($22\text{ MLD}$) | BLR-Z01 Whitefield ($12\text{ MLD}$)<br>BLR-Z02 Electronic City ($14\text{ MLD}$)<br>BLR-Z03 Indiranagar ($10\text{ MLD}$)<br>BLR-Z04 Koramangala ($8\text{ MLD}$)<br>*(Total: $44\text{ MLD}$)* | 14 Tankers ($7.0\text{ MLD}$) | • High-Lift Booster Trip (P-BLR-01)<br>• Peak Summer Inflow Deficit |

### City Data Isolation Guarantee
Every incident created, agent pipeline executed, and allocation committed is strictly tagged with its corresponding `city_id`. Triggering a crisis in Greater Noida does not affect Delhi or Bengaluru. Switching cities in the navigation header loads that city's isolated database records and baseline state.

---

## 6. Quick Start Guide (macOS / Linux)

### Prerequisites
- Node.js $\ge 18.0$ and `npm`
- Python $\ge 3.10$

### Option A: Single Command Startup (Recommended)
Run the startup script from the project root:

```bash
./start.sh
```

This starts:
- **FastAPI Backend** on `http://127.0.0.1:8000`
- **React Frontend** on `http://localhost:8080` (or `http://localhost:5173`)

---

### Option B: Manual Two-Terminal Startup

#### Terminal 1: Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```
- API Documentation (Swagger): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

#### Terminal 2: Frontend
```bash
npm install
npm run dev
```
- Open browser at `http://localhost:8080`

---

## 7. Automated Testing & Verification

The project includes 73 automated tests verifying end-to-end functionality, mathematical correctness, water balance conservation ($\text{Supplied} + \text{Unmet} == \text{Demand}$), physical constraint enforcement, and city isolation:

### Run All Tests:
```bash
npm run test:all
```
*(Runs both frontend Vitest tests and backend Pytest test suites sequentially).*

### Backend Pytest Suite (66 Tests across 9 test suites):
```bash
npm run backend:test
```
Verified Test Suites:
1. `test_scenarios_deep.py` (18 tests): Exhaustive testing of scenario listing, all 5 crisis categories (pump failure, treatment derate, demand surge, pipeline rupture, multi-asset blackout) across all 5 cities, zone impact calculation, strict water-balance conservation ($\text{totalSupplied} + \text{unmet} == \text{totalDemand}$), trade-off summaries, feasibility hard gate, recommendation consistency, and human approval persistence.
2. `test_multicity.py` (9 tests): City registration, baseline topology integrity across all 5 cities, city network isolation, and city-specific incident workflows.
3. `test_constraints_deep.py` (14 tests): Exhaustive validation of demand ceilings across all 5 cities, tanker fleet bounds across all 5 cities, volumetric math validation, offline pump blockage, and derated treatment plant bounds.
4. `test_demo_walkthrough.py` (1 test): Complete programmatic execution of the 14-step exhibition demonstration.
5. `test_audit_persistence.py` (4 tests): Rejection handling, audit event ordering and filtering, invalid incident rejection, and nonexistent plan safety.
6. `test_agents.py` (4 tests): Verification of the 4 specialist agent outputs, schemas, and scoring rationales.
7. `test_api.py` (6 tests): Health, network state, pump failure workflow, cities endpoints, multi-city dashboard queries, and selective city reset.
8. `test_network.py` (4 tests): Baseline flow math, pump outage impact, treatment plant derating, and demand surge calculation.
9. `test_validation.py` (4 tests): Rejection of over-capacity allocations, excess tankers, negative allocations, and demand ceiling violations.

### Frontend Vitest Suite (7 Tests):
```bash
npm test
```
Verifies client-side simulation math, state transitions, and UI routing.

### Production Build & Code Quality:
```bash
npm run build    # Compiles client and SSR Nitro bundle with 0 errors
npm run lint     # Validates ESLint rules with 0 errors
```

---

## 8. Live Application URLs

| Screen / Endpoint | URL | Description |
| :--- | :--- | :--- |
| **Command Center Dashboard** | `http://localhost:8080/` | Overview of network balance, active incidents, deficit metrics |
| **Crisis Simulator** | `http://localhost:8080/simulator` | Interactive crisis scenarios, agent orchestration, plan comparison |
| **Multi-Agent Command Center** | `http://localhost:8080/agents` | Execution breakdown, agent status badges, structured JSON inspector |
| **Interactive Network & Reservoirs** | `http://localhost:8080/reservoirs` | Dynamic topological flow diagram (`Source → Treatment → Pumps → Zones`) |
| **Resource Allocation Monitor** | `http://localhost:8080/allocation` | Committed pipe vs tanker balances, fleet status |
| **Incident & Audit History** | `http://localhost:8080/response` | Historical incidents, human approval logs, chronological SQLite audit trail |
| **FastAPI Swagger Docs** | `http://127.0.0.1:8000/docs` | Interactive OpenAPI documentation and test client |
| **Health Check API** | `http://127.0.0.1:8000/api/v1/health` | Backend and SQLite database status |

---

## 9. 14-Step Judge Demonstration Script

Follow this repeatable 5-minute presentation script during judging:

1. **Open Overview Dashboard (`/`)**: Show the live command center. Point out the header city dropdown showing **Greater Noida** as default. Highlight the persistent simulation notice: *"DEMO MODE — Simulated water network and illustrative data"*. Show baseline supply ($32\text{ MLD}$) satisfies baseline pipe capacity.
2. **Inspect Interactive Network (`/reservoirs`)**: Point out the topological flow diagram (`Upper Ganga Canal → Kasna WTP → P-03 & P-04 → Zones Z-01..Z-04`). Click **Pump P-03** to demonstrate the Asset Inspection Panel showing its $18\text{ MLD}$ capacity and downstream connections to Zones Z-01 and Z-02.
3. **Open Crisis Simulator (`/simulator`)**: Point out the active city's built-in scenarios. Select **Scenario 1: Pump Failure P-03**.
4. **Trigger the Incident**: Click **Trigger Scenario**. Observe real-time agent pipeline orchestration.
5. **Review Impact Analysis**: Note that P-03 is offline ($0.0\text{ MLD}$), creating an immediate $22.0\text{ MLD}$ deficit affecting Zone Z-01 North ($10\text{ MLD}$ deficit) and Zone Z-02 Market ($12\text{ MLD}$ deficit).
6. **Open Multi-Agent Command Center (`/agents`)**: Show the 4 sequential execution cards. Point out that all 4 specialist agents executed deterministically with recorded latency ($<20\text{ ms}$). Click **Inspect JSON** on the Incident Analysis or Validation Agent to view the structured SQLite payload.
7. **Return to Simulator Plan Comparison (`/simulator`)**: Review the candidate plans:
   - **Plan A (Priority-First Reroute)**: Feasible. Reroutes pipe water to high-priority zones; dispatches 8 tankers ($4.0\text{ MLD}$).
   - **Plan B (Fair-Share Rationing)**: Feasible. Shares remaining pipe water proportionally across zones.
   - **Plan C (Full-Demand Benchmark)**: **REJECTED AS INFEASIBLE**. Highlight the red safety gate: *"P-03 throughput exceeds available operating capacity (asset offline)"*.
8. **Demonstrate Safety Gate**: Click on Plan C and show that the system forbids approving infeasible plans (both on the frontend and via FastAPI backend $400$ re-validation).
9. **Review Plan A**: Click **Approve Plan** on Plan A.
10. **Confirm in Modal**: Review the confirmation dialog summarizing tanker deployment (8 tankers) and remaining deficit. Click **Confirm & Commit**.
11. **Verify Allocation State (`/allocation`)**: Show that the status badge transitioned from *"Normal Baseline"* to *"Committed Allocations"*. Show that 8 tankers are now dispatched to Zone Z-01 ($4.0\text{ MLD}$).
12. **Inspect Audit History (`/response`)**: Scroll to the **Chronological Audit History** to prove full audit persistence (`incident_created` $\to$ `workflow_executed` $\to$ `human_approval` $\to$ `allocation_committed`).
13. **Demonstrate Multi-City Isolation**: Select **Delhi** in the header city dropdown. Show that Delhi immediately loads its own network (Yamuna intake, Sonia Vihar WTP, P-DEL-01, 10 tankers, 0 active incidents). The Greater Noida incident has not leaked into Delhi.
14. **Reset Demonstration**: Click **Reset Demo Data** in the sidebar and confirm to cleanly restore baseline state for the next demonstration!

---

## 10. Technical Limitations & Future Work

- **Hydraulic Simplification**: Network calculations model volumetric conservation and link capacities; they do not solve full non-linear Darcy-Weisbach or Hazen-Williams pressure-pipe equations.
- **Sensor Telemetry**: Incident triggers are currently simulated operator interventions or deterministic scenario benchmarks. Future iterations could ingest MQTT or SCADA OPC-UA telemetry.
- **Persistent Storage**: Uses SQLite for exhibition simplicity and portability; designed for seamless migration to PostgreSQL in municipal production.

## Report an Issue workflow

The dashboard's **Report a Water-Supply Issue** action opens `/report`. Reports are submitted to `POST /api/v1/incidents`, persisted in the demonstration SQLite database, and assessed by the existing four specialist agents. Results remain pending human approval. Greater Noida areas shown in the form are illustrative labels and are not verified municipal asset locations. The model's tanker assumption is 0.5 MLD per vehicle; it is a simulation rule, not a real vehicle capacity.

### Run locally

Backend (Python 3.11+ recommended):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python run.py
```

Frontend (Node.js compatible with the Vite version in `package.json`):

```bash
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` if the backend is not at `http://127.0.0.1:8000/api/v1`. The project uses the existing `backend/jalsetu.db`; back it up before any manual reset. The active API/topology is scoped to Greater Noida, while historical database records are preserved rather than destructively deleted.
