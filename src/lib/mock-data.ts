// Illustrative demo data only — not real-world statistics.
export type Status = "normal" | "warning" | "critical";

export interface Reservoir {
  id: string;
  name: string;
  zone: string;
  capacityML: number;
  currentML: number;
  inflowMLd: number;
  outflowMLd: number;
}

export const reservoirs: Reservoir[] = [
  {
    id: "R1",
    name: "Central Reservoir",
    zone: "Zone A",
    capacityML: 4200,
    currentML: 3150,
    inflowMLd: 42,
    outflowMLd: 51,
  },
  {
    id: "R2",
    name: "North Reservoir",
    zone: "Zone B",
    capacityML: 3600,
    currentML: 612,
    inflowMLd: 12,
    outflowMLd: 38,
  },
  {
    id: "R3",
    name: "East Reservoir",
    zone: "Zone C",
    capacityML: 2800,
    currentML: 1260,
    inflowMLd: 22,
    outflowMLd: 30,
  },
  {
    id: "R4",
    name: "South Reservoir",
    zone: "Zone D",
    capacityML: 3100,
    currentML: 2480,
    inflowMLd: 35,
    outflowMLd: 33,
  },
  {
    id: "R5",
    name: "West Lake Reservoir",
    zone: "Zone E",
    capacityML: 2400,
    currentML: 384,
    inflowMLd: 8,
    outflowMLd: 26,
  },
  {
    id: "R6",
    name: "Riverside Reservoir",
    zone: "Zone A",
    capacityML: 1900,
    currentML: 1406,
    inflowMLd: 19,
    outflowMLd: 21,
  },
  {
    id: "R7",
    name: "Hillview Reservoir",
    zone: "Zone F",
    capacityML: 1500,
    currentML: 645,
    inflowMLd: 10,
    outflowMLd: 15,
  },
  {
    id: "R8",
    name: "Lakeside Reservoir",
    zone: "Zone C",
    capacityML: 2100,
    currentML: 1638,
    inflowMLd: 24,
    outflowMLd: 22,
  },
];

export function levelPct(r: Pick<Reservoir, "capacityML" | "currentML">) {
  return Math.round((r.currentML / r.capacityML) * 100);
}

export function statusFor(pct: number): Status {
  if (pct < 20) return "critical";
  if (pct < 50) return "warning";
  return "normal";
}

export interface ZoneDemand {
  zone: string;
  population: number;
  demandMLd: number;
  supplyMLd: number;
}

export const zones: ZoneDemand[] = [
  { zone: "Zone A", population: 410000, demandMLd: 68, supplyMLd: 58 },
  { zone: "Zone B", population: 365000, demandMLd: 61, supplyMLd: 34 },
  { zone: "Zone C", population: 298000, demandMLd: 52, supplyMLd: 45 },
  { zone: "Zone D", population: 252000, demandMLd: 44, supplyMLd: 43 },
  { zone: "Zone E", population: 231000, demandMLd: 40, supplyMLd: 19 },
  { zone: "Zone F", population: 176000, demandMLd: 31, supplyMLd: 22 },
];

export const affectedZones = zones.filter((z) => z.supplyMLd / z.demandMLd < 0.9);

export type Severity = "low" | "moderate" | "high" | "critical";
export type EventStatus = "open" | "in progress" | "resolved";

export interface CrisisEvent {
  id: string;
  time: string;
  title: string;
  zone: string;
  severity: Severity;
  status: EventStatus;
}

export const events: CrisisEvent[] = [
  {
    id: "EV-1042",
    time: "27 Oct, 09:42",
    title: "North Reservoir below 20% threshold",
    zone: "Zone B",
    severity: "critical",
    status: "open",
  },
  {
    id: "EV-1041",
    time: "27 Oct, 07:15",
    title: "West Lake inflow drop of 38%",
    zone: "Zone E",
    severity: "critical",
    status: "in progress",
  },
  {
    id: "EV-1039",
    time: "26 Oct, 21:08",
    title: "Pressure loss on trunk main T-4",
    zone: "Zone F",
    severity: "high",
    status: "in progress",
  },
  {
    id: "EV-1036",
    time: "26 Oct, 14:30",
    title: "Demand surge above forecast",
    zone: "Zone C",
    severity: "moderate",
    status: "open",
  },
  {
    id: "EV-1031",
    time: "25 Oct, 18:52",
    title: "Valve fault at pumping station P-2",
    zone: "Zone A",
    severity: "low",
    status: "resolved",
  },
];

export interface Tanker {
  id: string;
  capacityKL: number;
  depot: string;
  assignedZone: string | null;
}

export const tankers: Tanker[] = [
  { id: "TK-01", capacityKL: 12, depot: "Central Depot", assignedZone: "Zone B" },
  { id: "TK-02", capacityKL: 12, depot: "Central Depot", assignedZone: "Zone B" },
  { id: "TK-03", capacityKL: 10, depot: "North Depot", assignedZone: "Zone E" },
  { id: "TK-04", capacityKL: 10, depot: "North Depot", assignedZone: null },
  { id: "TK-05", capacityKL: 15, depot: "East Depot", assignedZone: "Zone F" },
  { id: "TK-06", capacityKL: 15, depot: "East Depot", assignedZone: null },
  { id: "TK-07", capacityKL: 12, depot: "South Depot", assignedZone: null },
  { id: "TK-08", capacityKL: 12, depot: "South Depot", assignedZone: null },
  { id: "TK-09", capacityKL: 10, depot: "Central Depot", assignedZone: null },
  { id: "TK-10", capacityKL: 10, depot: "West Depot", assignedZone: null },
  { id: "TK-11", capacityKL: 15, depot: "West Depot", assignedZone: null },
  { id: "TK-12", capacityKL: 12, depot: "West Depot", assignedZone: null },
  { id: "TK-13", capacityKL: 12, depot: "North Depot", assignedZone: null },
  { id: "TK-14", capacityKL: 10, depot: "East Depot", assignedZone: null },
  { id: "TK-15", capacityKL: 15, depot: "South Depot", assignedZone: null },
  { id: "TK-16", capacityKL: 12, depot: "Central Depot", assignedZone: null },
];

export const availableTankers = tankers.filter((t) => t.assignedZone === null);

export const agents = [
  {
    key: "monitor",
    name: "Monitoring Agent",
    role: "Ingests reservoir levels, inflow and sensor readings; flags threshold breaches.",
    output: "Telemetry & alerts",
  },
  {
    key: "assess",
    name: "Crisis Assessment Agent",
    role: "Scores severity, estimates affected population and days of supply remaining.",
    output: "Risk assessment",
  },
  {
    key: "plan",
    name: "Resource Planning Agent",
    role: "Allocates tankers, reroutes supply and prioritises vulnerable zones.",
    output: "Allocation plan",
  },
  {
    key: "respond",
    name: "Response Coordination Agent",
    role: "Dispatches teams, issues public advisories and tracks resolution.",
    output: "Action orders",
  },
] as const;
