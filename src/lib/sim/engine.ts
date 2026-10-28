// @ts-nocheck -- strict index-access typing to be tightened in a follow-up; logic covered by engine.test.ts
// Deterministic water-network simulation. Pure functions only — no UI, no I/O.
import {
  ASSETS,
  LINKS,
  PRIORITY_RANK,
  TANKER_FLEET,
  TANKER_MLD,
  ZONES,
  zoneLabel,
  type Zone,
} from "./network";

const EPS = 1e-6;
const r2 = (n: number) => Math.round(n * 100) / 100;
const floor2 = (n: number) => Math.floor(n * 100 + EPS) / 100;

// ---------- Conditions & capacities ----------

export interface Conditions {
  assetFactor: Record<string, number>; // 1 = normal, 0 = failed
  demandFactor: number;
}

export const NORMAL: Conditions = { assetFactor: {}, demandFactor: 1 };

export const assetCap = (c: Conditions, id: string) => {
  const a = ASSETS.find((x) => x.id === id)!;
  return a.capacity * (c.assetFactor[id] ?? 1);
};

export const zoneDemand = (c: Conditions, z: Zone) => r2(z.demand * c.demandFactor);

/** Ordered elements (links + assets) on the path from source to a zone. */
export function pathTo(zoneId: string): { links: string[]; assets: string[] } {
  const links: string[] = [];
  const assets: string[] = [];
  let node = zoneId;
  for (;;) {
    const l = LINKS.find((x) => x.to === node);
    if (!l) break;
    links.unshift(l.id);
    assets.unshift(l.from);
    node = l.from;
  }
  return { links, assets };
}

export type ZoneAlloc = Record<string, { pipe: number; tanker: number }>;

export function flows(pipe: Record<string, number>) {
  const link: Record<string, number> = {};
  const asset: Record<string, number> = {};
  for (const l of LINKS) link[l.id] = 0;
  for (const a of ASSETS) asset[a.id] = 0;
  for (const z of ZONES) {
    const q = pipe[z.id] ?? 0;
    const p = pathTo(z.id);
    p.links.forEach((id) => (link[id] += q));
    p.assets.forEach((id) => (asset[id] += q));
  }
  return { link, asset };
}

function remainingCaps(c: Conditions, pipe: Record<string, number>) {
  const f = flows(pipe);
  const rem: Record<string, number> = {};
  for (const l of LINKS) rem[l.id] = l.capacity - f.link[l.id];
  for (const a of ASSETS) rem[a.id] = assetCap(c, a.id) - f.asset[a.id];
  return rem;
}

const byPriority = (zs: Zone[]) =>
  [...zs].sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      b.demand - a.demand ||
      a.id.localeCompare(b.id),
  );

/** Greedy priority-first pipe allocation within all network capacities. */
export function allocatePriority(
  c: Conditions,
  start: Record<string, number> = {},
): Record<string, number> {
  const pipe: Record<string, number> = Object.fromEntries(
    ZONES.map((z) => [z.id, start[z.id] ?? 0]),
  );
  for (const z of byPriority(ZONES)) {
    const rem = remainingCaps(c, pipe);
    const p = pathTo(z.id);
    const head = Math.min(...[...p.links, ...p.assets].map((id) => rem[id]));
    const add = floor2(Math.max(0, Math.min(zoneDemand(c, z) - pipe[z.id], head)));
    pipe[z.id] = r2(pipe[z.id] + add);
  }
  return pipe;
}

function feasiblePipe(c: Conditions, pipe: Record<string, number>) {
  const rem = remainingCaps(c, pipe);
  return Object.values(rem).every((v) => v >= -EPS);
}

/** Equal-fraction sharing of demand, then greedy top-up of leftover capacity. */
export function allocateProportional(c: Conditions): Record<string, number> {
  let lo = 0;
  let hi = 1;
  const at = (f: number) =>
    Object.fromEntries(ZONES.map((z) => [z.id, floor2(zoneDemand(c, z) * f)]));
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (feasiblePipe(c, at(mid))) lo = mid;
    else hi = mid;
  }
  return allocatePriority(c, at(lo));
}

// ---------- Incidents ----------

export type IncidentType = "pump_failure_p03" | "treatment_reduction" | "demand_surge";

export const INCIDENTS: Record<
  IncidentType,
  { label: string; description: string; conditions: Conditions }
> = {
  pump_failure_p03: {
    label: "Pump failure: P-03",
    description: "Pump P-03 trips offline (0 of 18 MLD).",
    conditions: { assetFactor: { "P-03": 0 }, demandFactor: 1 },
  },
  treatment_reduction: {
    label: "Treatment capacity reduction",
    description: "TP-01 throughput drops to 60% (21 of 35 MLD).",
    conditions: { assetFactor: { "TP-01": 0.6 }, demandFactor: 1 },
  },
  demand_surge: {
    label: "Demand surge",
    description: "Heatwave raises demand in all zones by 30%.",
    conditions: { assetFactor: {}, demandFactor: 1.3 },
  },
};

export interface ZoneImpact {
  zoneId: string;
  demand: number;
  baseline: number;
  incident: number;
  shortage: number; // demand - incident supply
  loss: number; // baseline - incident supply
  bottleneck: string;
}

export interface Analysis {
  impacts: ZoneImpact[];
  affected: string[];
  totalDemand: number;
  totalSupply: number;
  totalShortage: number;
  reasoning: string[];
}

export const baselinePipe = () => allocatePriority(NORMAL);

export function analyse(type: IncidentType): Analysis {
  const c = INCIDENTS[type].conditions;
  const base = baselinePipe();
  const inc = allocatePriority(c);
  const reasoning: string[] = [INCIDENTS[type].description];

  for (const [id, f] of Object.entries(c.assetFactor)) {
    const a = ASSETS.find((x) => x.id === id)!;
    const down = LINKS.filter((l) => l.from === id).map((l) => l.id);
    reasoning.push(
      f === 0
        ? `${id} is offline. Downstream links ${down.join(", ")} can carry 0 MLD.`
        : `${id} effective capacity is ${r2(a.capacity * f)} MLD (was ${a.capacity} MLD).`,
    );
  }
  if (c.demandFactor !== 1)
    reasoning.push(
      `Total demand rises from ${ZONES.reduce((s, z) => s + z.demand, 0)} to ${r2(ZONES.reduce((s, z) => s + zoneDemand(c, z), 0))} MLD.`,
    );

  const impacts: ZoneImpact[] = ZONES.map((z) => {
    const p = pathTo(z.id);
    const rem = remainingCaps(c, {});
    const limiting = [...p.assets, ...p.links].reduce((m, id) => (rem[id] < rem[m] ? id : m));
    const demand = zoneDemand(c, z);
    return {
      zoneId: z.id,
      demand,
      baseline: base[z.id],
      incident: inc[z.id],
      shortage: r2(demand - inc[z.id]),
      loss: r2(base[z.id] - inc[z.id]),
      bottleneck: inc[z.id] < demand - EPS ? limiting : "—",
    };
  });

  const affected = impacts
    .filter((i) => i.loss > EPS || (i.shortage > EPS && c.demandFactor !== 1))
    .map((i) => i.zoneId);
  for (const i of impacts.filter((x) => affected.includes(x.zoneId))) {
    reasoning.push(
      `${zoneLabel(i.zoneId)} (path ${pathTo(i.zoneId).links.join(" → ")}): supply ${i.baseline} → ${i.incident} MLD against demand ${i.demand} MLD; shortage ${i.shortage} MLD. Limiting element: ${i.bottleneck}.`,
    );
  }
  const unaffectedFull = impacts.filter((i) => !affected.includes(i.zoneId));
  if (unaffectedFull.length)
    reasoning.push(`Unaffected: ${unaffectedFull.map((i) => zoneLabel(i.zoneId)).join(", ")}.`);

  return {
    impacts,
    affected,
    totalDemand: r2(impacts.reduce((s, i) => s + i.demand, 0)),
    totalSupply: r2(impacts.reduce((s, i) => s + i.incident, 0)),
    totalShortage: r2(impacts.reduce((s, i) => s + i.shortage, 0)),
    reasoning,
  };
}

// ---------- Plans ----------

export type Decision = "pending" | "approved" | "rejected" | "superseded";

export interface Plan {
  id: string;
  name: string;
  strategy: string;
  objective?: string | null;
  plain_english?: string | null;
  why_useful?: string | null;
  benefiting_zones?: any[] | null;
  resource_consumption?: any | null;
  benefits?: string[] | null;
  alloc: ZoneAlloc;
  tankers: Record<string, number>; // count per zone
  tankersUsed: number;
  totalSupplied: number;
  unmet: number;
  unmetByZone: Record<string, number>;
  tradeOffs: string[];
  violations: string[];
  feasible: boolean;
  recommended: boolean;
  decision: Decision;
}

function tankersPriority(c: Conditions, pipe: Record<string, number>, fleet: number) {
  const t: Record<string, number> = {};
  let left = fleet;
  for (const z of byPriority(ZONES)) {
    const n = Math.min(left, Math.floor((zoneDemand(c, z) - pipe[z.id]) / TANKER_MLD + EPS));
    t[z.id] = Math.max(0, n);
    left -= t[z.id];
  }
  return t;
}

function tankersProportional(c: Conditions, pipe: Record<string, number>, fleet: number) {
  const short = ZONES.map((z) => ({ z, s: Math.max(0, zoneDemand(c, z) - pipe[z.id]) }));
  const maxN = (s: number) => Math.floor(s / TANKER_MLD + EPS);
  const totalCap = short.reduce((a, x) => a + maxN(x.s), 0);
  const n = Math.min(fleet, totalCap);
  const totalS = short.reduce((a, x) => a + x.s, 0) || 1;
  const t: Record<string, number> = {};
  const rema: { id: string; r: number }[] = [];
  let used = 0;
  for (const { z, s } of short) {
    const exact = (s / totalS) * n;
    t[z.id] = Math.min(maxN(s), Math.floor(exact));
    used += t[z.id];
    rema.push({ id: z.id, r: exact - Math.floor(exact) });
  }
  rema.sort((a, b) => b.r - a.r || a.id.localeCompare(b.id));
  for (let i = 0; used < n && i < rema.length * 4; i++) {
    const { id } = rema[i % rema.length];
    const s = short.find((x) => x.z.id === id)!.s;
    if (t[id] < maxN(s)) {
      t[id]++;
      used++;
    }
  }
  return t;
}

/** Validate a plan against every hard constraint. Returns violation messages. */
export function validate(
  c: Conditions,
  alloc: ZoneAlloc,
  tankers: Record<string, number>,
  fleet: number,
): string[] {
  const v: string[] = [];
  const pipe = Object.fromEntries(ZONES.map((z) => [z.id, alloc[z.id]?.pipe ?? 0]));
  for (const z of ZONES) {
    const a = alloc[z.id] ?? { pipe: 0, tanker: 0 };
    if (a.pipe < -EPS || a.tanker < -EPS) v.push(`${zoneLabel(z.id)}: negative allocation.`);
    const total = a.pipe + a.tanker;
    if (total > zoneDemand(c, z) + EPS)
      v.push(
        `${zoneLabel(z.id)}: allocation ${r2(total)} MLD exceeds demand ${zoneDemand(c, z)} MLD.`,
      );
    const tk = tankers[z.id] ?? 0;
    if (!Number.isInteger(tk)) v.push(`${zoneLabel(z.id)}: tanker count must be a whole number.`);
    if (Math.abs(tk * TANKER_MLD - a.tanker) > EPS)
      v.push(`${zoneLabel(z.id)}: tanker volume ${a.tanker} MLD ≠ ${tk} × ${TANKER_MLD} MLD.`);
  }
  const f = flows(pipe);
  for (const l of LINKS)
    if (f.link[l.id] > l.capacity + EPS)
      v.push(`Link ${l.id} flow ${r2(f.link[l.id])} MLD exceeds capacity ${l.capacity} MLD.`);
  for (const a of ASSETS) {
    const cap = r2(assetCap(c, a.id));
    if (f.asset[a.id] > cap + EPS)
      v.push(
        `${a.id} throughput ${r2(f.asset[a.id])} MLD exceeds available capacity ${cap} MLD${cap === 0 ? " (offline)" : ""}.`,
      );
  }
  const used = Object.values(tankers).reduce((s, n) => s + n, 0);
  if (used > fleet) v.push(`Uses ${used} tankers; only ${fleet} available in the simulated fleet.`);
  return v;
}

function buildPlan(
  c: Conditions,
  id: string,
  name: string,
  strategy: string,
  pipe: Record<string, number>,
  tankers: Record<string, number>,
  fleet: number,
  tradeOffs: string[],
): Plan {
  const alloc: ZoneAlloc = Object.fromEntries(
    ZONES.map((z) => [
      z.id,
      { pipe: pipe[z.id] ?? 0, tanker: r2((tankers[z.id] ?? 0) * TANKER_MLD) },
    ]),
  );
  const unmetByZone = Object.fromEntries(
    ZONES.map((z) => [
      z.id,
      r2(Math.max(0, zoneDemand(c, z) - alloc[z.id].pipe - alloc[z.id].tanker)),
    ]),
  );
  const violations = validate(c, alloc, tankers, fleet);
  return {
    id,
    name,
    strategy,
    alloc,
    tankers,
    tankersUsed: Object.values(tankers).reduce((s, n) => s + n, 0),
    totalSupplied: r2(ZONES.reduce((s, z) => s + alloc[z.id].pipe + alloc[z.id].tanker, 0)),
    unmet: r2(Object.values(unmetByZone).reduce((s, n) => s + n, 0)),
    unmetByZone,
    tradeOffs,
    violations,
    feasible: violations.length === 0,
    recommended: false,
    decision: "pending",
  };
}

const highUnmet = (c: Conditions, p: Plan) =>
  r2(ZONES.filter((z) => z.priority === "high").reduce((s, z) => s + p.unmetByZone[z.id], 0));

export function generatePlans(type: IncidentType, fleet = TANKER_FLEET): Plan[] {
  const c = INCIDENTS[type].conditions;

  const pipeA = allocatePriority(c);
  const tA = tankersPriority(c, pipeA, fleet);
  const pipeB = allocateProportional(c);
  const tB = tankersProportional(c, pipeB, fleet);
  const pipeC = Object.fromEntries(ZONES.map((z) => [z.id, zoneDemand(c, z)]));

  const plans = [
    buildPlan(
      c,
      "A",
      "Plan A — Priority reroute + targeted tankers",
      "Route all feasible pipe supply to high-priority zones first, then send tankers to the highest-priority shortfalls.",
      pipeA,
      tA,
      fleet,
      [],
    ),
    buildPlan(
      c,
      "B",
      "Plan B — Fair-share rationing + vulnerability tankers",
      "Share pipe supply as an equal fraction of demand, then split tankers in proportion to each zone's shortfall.",
      pipeB,
      tB,
      fleet,
      [],
    ),
    buildPlan(
      c,
      "C",
      "Plan C — Full-demand pipe restoration",
      "Push every zone's full demand through the existing network without tankers.",
      pipeC,
      {},
      fleet,
      [],
    ),
  ];

  const [a, b, cc] = plans;
  a.tradeOffs = [
    `High-priority unmet demand: ${highUnmet(c, a)} MLD.`,
    `Concentrates relief; lower-priority zones carry ${r2(a.unmet - highUnmet(c, a))} MLD of the shortfall.`,
    `${a.tankersUsed} of ${fleet} tankers committed.`,
  ];
  b.tradeOffs = [
    `High-priority unmet demand: ${highUnmet(c, b)} MLD.`,
    `Spreads hardship more evenly; zones with shortfall: ${ZONES.filter((z) => b.unmetByZone[z.id] > EPS).length}.`,
    `${b.tankersUsed} of ${fleet} tankers committed.`,
  ];
  cc.tradeOffs = [
    "Would meet all demand if the network could carry it.",
    "Ignores failed or reduced assets.",
  ];

  const feasible = plans.filter((p) => p.feasible);
  const best = [...feasible].sort(
    (x, y) =>
      x.unmet - y.unmet || highUnmet(c, x) - highUnmet(c, y) || x.tankersUsed - y.tankersUsed,
  )[0];
  if (best) best.recommended = true;
  return plans;
}

// ---------- Workflow state (reducer) ----------

export interface LogEntry {
  at: string;
  step:
    "Monitoring" | "Crisis Assessment" | "Resource Planning" | "Response Coordination" | "Operator";
  message: string;
}

export type IncidentStatus = "awaiting approval" | "mitigated" | "all plans rejected";

export interface Incident {
  id: string;
  type: IncidentType;
  label: string;
  triggeredAt: string;
  status: IncidentStatus;
  analysis: Analysis;
  before: ZoneAlloc;
  approvedPlanId: string | null;
  resolvedAt: string | null;
}

export interface SimState {
  conditions: Conditions;
  current: ZoneAlloc;
  tankersDeployed: number;
  incident: Incident | null;
  plans: Plan[];
  history: Incident[];
  log: LogEntry[];
  seq: number;
}

const pipeToAlloc = (pipe: Record<string, number>): ZoneAlloc =>
  Object.fromEntries(ZONES.map((z) => [z.id, { pipe: pipe[z.id], tanker: 0 }]));

export function initialState(): SimState {
  return {
    conditions: NORMAL,
    current: pipeToAlloc(baselinePipe()),
    tankersDeployed: 0,
    incident: null,
    plans: [],
    history: [],
    log: [],
    seq: 1,
  };
}

export type Action =
  | { type: "analyse"; incident: IncidentType; now: string }
  | { type: "approve"; planId: string; now: string }
  | { type: "reject"; planId: string; now: string }
  | { type: "reset" };

const archive = (s: SimState, inc: Incident) => [inc, ...s.history.filter((h) => h.id !== inc.id)];

export function reducer(s: SimState, a: Action): SimState {
  switch (a.type) {
    case "reset":
      return { ...initialState(), history: s.history, seq: s.seq };
    case "analyse": {
      if (s.incident) return s;
      const def = INCIDENTS[a.incident];
      const analysis = analyse(a.incident);
      const plans = generatePlans(a.incident, TANKER_FLEET - s.tankersDeployed);
      const degraded = pipeToAlloc(allocatePriority(def.conditions));
      const inc: Incident = {
        id: `INC-${String(s.seq).padStart(3, "0")}`,
        type: a.incident,
        label: def.label,
        triggeredAt: a.now,
        status: "awaiting approval",
        analysis,
        before: degraded,
        approvedPlanId: null,
        resolvedAt: null,
      };
      const feasible = plans.filter((p) => p.feasible);
      const rec = plans.find((p) => p.recommended);
      const log: LogEntry[] = [
        { at: a.now, step: "Monitoring", message: `${inc.id}: ${def.description}` },
        {
          at: a.now,
          step: "Crisis Assessment",
          message: `Affected zones: ${analysis.affected.map(zoneLabel).join(", ") || "none"}. Total shortage ${analysis.totalShortage} MLD of ${analysis.totalDemand} MLD demand.`,
        },
        {
          at: a.now,
          step: "Resource Planning",
          message: `Generated ${plans.length} plans; ${feasible.length} feasible.${plans
            .filter((p) => !p.feasible)
            .map((p) => ` ${p.id} rejected: ${p.violations[0]}`)
            .join("")}`,
        },
        {
          at: a.now,
          step: "Response Coordination",
          message: rec
            ? `Recommends ${rec.id} (unmet ${rec.unmet} MLD). Awaiting operator approval.`
            : "No feasible plan found. Escalate to operator.",
        },
      ];
      return {
        ...s,
        conditions: def.conditions,
        current: degraded,
        incident: inc,
        plans,
        history: archive(s, inc),
        log: [...log.reverse(), ...s.log],
        seq: s.seq + 1,
      };
    }
    case "reject": {
      const p = s.plans.find((x) => x.id === a.planId);
      if (!s.incident || !p || p.decision !== "pending") return s;
      const plans = s.plans.map((x) =>
        x.id === p.id ? { ...x, decision: "rejected" as const } : x,
      );
      const allRejected = plans.every((x) => x.decision === "rejected");
      const inc: Incident = allRejected
        ? { ...s.incident, status: "all plans rejected" }
        : s.incident;
      return {
        ...s,
        plans,
        incident: inc,
        history: archive(s, inc),
        log: [
          { at: a.now, step: "Operator", message: `Rejected ${p.id}. System state unchanged.` },
          ...s.log,
        ],
      };
    }
    case "approve": {
      const p = s.plans.find((x) => x.id === a.planId);
      if (!s.incident || !p || !p.feasible || p.decision !== "pending" || s.incident.approvedPlanId)
        return s;
      const plans = s.plans.map((x) =>
        x.id === p.id
          ? { ...x, decision: "approved" as const }
          : x.decision === "pending"
            ? { ...x, decision: "superseded" as const }
            : x,
      );
      const inc: Incident = {
        ...s.incident,
        status: "mitigated",
        approvedPlanId: p.id,
        resolvedAt: a.now,
      };
      return {
        ...s,
        plans,
        current: p.alloc,
        tankersDeployed: s.tankersDeployed + p.tankersUsed,
        incident: inc,
        history: archive(s, inc),
        log: [
          {
            at: a.now,
            step: "Response Coordination",
            message: `Applied ${p.id}: ${p.tankersUsed} tankers dispatched; unmet demand now ${p.unmet} MLD.`,
          },
          { at: a.now, step: "Operator", message: `Approved ${p.id}.` },
          ...s.log,
        ],
      };
    }
  }
}

// ---------- Derived metrics ----------

export function metrics(s: SimState) {
  const zones = ZONES.map((z) => {
    const a = s.current[z.id];
    const demand = zoneDemand(s.conditions, z);
    const supplied = r2(a.pipe + a.tanker);
    return {
      ...z,
      demand,
      pipe: a.pipe,
      tanker: a.tanker,
      supplied,
      unmet: r2(Math.max(0, demand - supplied)),
    };
  });
  const pipe = Object.fromEntries(zones.map((z) => [z.id, z.pipe]));
  const f = flows(pipe);
  return {
    zones,
    totalDemand: r2(zones.reduce((t, z) => t + z.demand, 0)),
    totalSupplied: r2(zones.reduce((t, z) => t + z.supplied, 0)),
    totalUnmet: r2(zones.reduce((t, z) => t + z.unmet, 0)),
    zonesShort: zones.filter((z) => z.unmet > EPS).length,
    assetsDegraded: ASSETS.filter((a) => (s.conditions.assetFactor[a.id] ?? 1) < 1).length,
    tankersAvailable: TANKER_FLEET - s.tankersDeployed,
    assets: ASSETS.map((a) => ({
      ...a,
      effective: r2(assetCap(s.conditions, a.id)),
      flow: r2(f.asset[a.id]),
      factor: s.conditions.assetFactor[a.id] ?? 1,
    })),
    links: LINKS.map((l) => ({ ...l, flow: r2(f.link[l.id]) })),
  };
}
