import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Droplets,
  Layers,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { useSim } from "@/lib/sim/store";

interface NetworkFlowDiagramProps {
  className?: string;
  compact?: boolean;
}

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export function NetworkFlowDiagram({ className = "", compact = false }: NetworkFlowDiagramProps) {
  const { state, m, cityName, cityId } = useSim();
  const inc = state.incident;

  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: "source" | "treatment" | "pump" | "zone";
    name: string;
    flow: number;
    capacity: number;
    status: string;
    details?: string;
  } | null>(null);

  // Group assets
  const sources = m.assets.filter((a) => a.kind === "source");
  const treatments = m.assets.filter((a) => a.kind === "treatment");
  const pumps = m.assets.filter((a) => a.kind === "pump");
  const zones = m.zones;

  // Determine failed asset IDs from active incident conditions or asset factor
  const failedAssetIds = new Set(m.assets.filter((a) => a.factor < 1.0).map((a) => a.id));

  // Determine affected zones from incident analysis
  const affectedZoneIds = new Set(inc?.analysis?.affected || []);

  return (
    <div className={`rounded-xl border bg-card p-4 sm:p-5 shadow-xs ${className}`}>
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              {cityName} Topological Network Flow
            </h3>
            {inc && (
              <span className="rounded-full bg-critical/15 px-2 py-0.5 text-[10px] font-bold text-critical flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Incident Active: {inc.id}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Directed topological flow from Raw Intake Source → Water Treatment → Primary Booster
            Pumps → Urban Supply Zones.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Normal Supply
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-critical animate-pulse" /> Failed / Severed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Constricted / Deficit
          </span>
        </div>
      </div>

      {/* 4-Stage Flow Canvas */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[720px] grid grid-cols-4 gap-4 items-center py-2">
          {/* Column 1: Sources */}
          <div className="space-y-3">
            <div className="text-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              1. Raw Water Source
            </div>
            {sources.map((s) => {
              const isFailed = failedAssetIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setSelectedNode({
                      id: s.id,
                      type: "source",
                      name: s.name,
                      flow: s.flow,
                      capacity: s.capacity,
                      status: isFailed ? "DEGRADED" : "NORMAL",
                      details: `Source reservoir for ${cityName}. Provides intake water to treatment facilities.`,
                    })
                  }
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    isFailed
                      ? "border-critical bg-critical/10 ring-2 ring-critical/40 animate-pulse"
                      : "bg-muted/30 hover:border-primary/50 hover:bg-card shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan/20 text-cyan">
                      <Database className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        isFailed
                          ? "bg-critical text-critical-foreground"
                          : "bg-success/20 text-success"
                      }`}
                    >
                      {isFailed ? "CONSTRAINED" : "ONLINE"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-foreground truncate">{s.id}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.name}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Inflow:</span>
                    <span className="font-bold text-primary">
                      {n(s.flow)} / {n(s.effective)} MLD
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Column 2: Water Treatment */}
          <div className="space-y-3">
            <div className="text-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              2. Treatment Plant
            </div>
            {treatments.map((t) => {
              const isFailed = failedAssetIds.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setSelectedNode({
                      id: t.id,
                      type: "treatment",
                      name: t.name,
                      flow: t.flow,
                      capacity: t.capacity,
                      status: isFailed ? "DERATED" : "NORMAL",
                      details: `Purification facility filtering raw water before booster transmission.`,
                    })
                  }
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    isFailed
                      ? "border-critical bg-critical/10 ring-2 ring-critical/40 animate-pulse"
                      : "bg-muted/30 hover:border-primary/50 hover:bg-card shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">
                      <Droplets className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        isFailed
                          ? "bg-critical text-critical-foreground"
                          : "bg-success/20 text-success"
                      }`}
                    >
                      {isFailed ? "DERATED (60%)" : "OPERATIONAL"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-foreground truncate">{t.id}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.name}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Output:</span>
                    <span className="font-bold text-primary">
                      {n(t.flow)} / {n(t.effective)} MLD
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Column 3: Pumping Stations */}
          <div className="space-y-3">
            <div className="text-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              3. Booster Pumps
            </div>
            {pumps.map((p) => {
              const isFailed = failedAssetIds.has(p.id);
              const isOffline = p.factor === 0.0;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setSelectedNode({
                      id: p.id,
                      type: "pump",
                      name: p.name,
                      flow: p.flow,
                      capacity: p.capacity,
                      status: isOffline ? "OFFLINE" : isFailed ? "DEGRADED" : "NORMAL",
                      details: `High-lift distribution pump pressurizing transmission lines to civic zones.`,
                    })
                  }
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    isOffline
                      ? "border-critical bg-critical/15 ring-2 ring-critical/50 animate-pulse"
                      : isFailed
                        ? "border-warning bg-warning/10"
                        : "bg-muted/30 hover:border-primary/50 hover:bg-card shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg ${
                        isOffline
                          ? "bg-critical text-critical-foreground"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        isOffline
                          ? "bg-critical text-critical-foreground"
                          : isFailed
                            ? "bg-warning/20 text-warning"
                            : "bg-success/20 text-success"
                      }`}
                    >
                      {isOffline ? "OFFLINE (0 MLD)" : isFailed ? "DEGRADED" : "RUNNING"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-foreground truncate">{p.id}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.name}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Throughput:</span>
                    <span className={`font-bold ${isOffline ? "text-critical" : "text-primary"}`}>
                      {n(p.flow)} / {n(p.effective)} MLD
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Column 4: Supply Zones */}
          <div className="space-y-3">
            <div className="text-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              4. Distribution Zones
            </div>
            {zones.map((z) => {
              const isAffected = affectedZoneIds.has(z.id) || z.unmet > 0.01;
              const pct = Math.round((z.supplied / Math.max(z.demand, 0.1)) * 100);
              return (
                <button
                  key={z.id}
                  onClick={() =>
                    setSelectedNode({
                      id: z.id,
                      type: "zone",
                      name: z.name,
                      flow: z.supplied,
                      capacity: z.demand,
                      status: isAffected ? "SHORTAGE" : "NORMAL",
                      details: `${z.priority} priority urban sector. Population: ${z.population.toLocaleString()}. Daily demand: ${z.demand} MLD.`,
                    })
                  }
                  className={`w-full text-left rounded-xl border p-2.5 transition-all ${
                    isAffected
                      ? "border-critical bg-critical/10 ring-1 ring-critical/40"
                      : "bg-muted/30 hover:border-primary/50 hover:bg-card shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground truncate">
                      {z.id} · {z.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        isAffected
                          ? "bg-critical text-critical-foreground"
                          : "bg-success/20 text-success"
                      }`}
                    >
                      {isAffected ? `-${n(z.unmet)} MLD` : "100% COVERAGE"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{z.priority} priority</span>
                    <span className="font-mono font-bold">
                      {n(z.supplied)} / {n(z.demand)} MLD ({pct}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        pct < 60 ? "bg-critical" : pct < 90 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Node Telemetry Inspector */}
      {selectedNode && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                {selectedNode.id} · {selectedNode.name}
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary uppercase">
                {selectedNode.type}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono">
                {selectedNode.status}
              </span>
            </div>
            <p className="mt-0.5 text-muted-foreground text-[11px]">{selectedNode.details}</p>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <div>
              <span className="text-muted-foreground mr-1">Current Throughput:</span>
              <strong className="text-primary">{n(selectedNode.flow)} MLD</strong>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">Design Capacity:</span>
              <strong>{n(selectedNode.capacity)} MLD</strong>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Simulated Footer Disclaimer */}
      <div className="mt-2 text-[10px] text-muted-foreground italic flex items-center justify-between">
        <span>
          * Simulated demonstration network model. Flow throughputs represent volumetric
          conservation calculations.
        </span>
        <span>Click any node to inspect telemetry</span>
      </div>
    </div>
  );
}
