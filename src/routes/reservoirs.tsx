import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSim } from "@/lib/sim/store";
import { Panel, StatCard, DemoBadge } from "@/components/jal/ui";
import { AvailabilityChart, ReservoirTable } from "@/components/jal/sections";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Droplets,
  Layers,
  Power,
  RotateCcw,
  Settings,
  Truck,
  Wrench,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/reservoirs")({
  head: () => ({
    meta: [
      { title: "Network & Reservoir Monitoring — JalSetu" },
      {
        name: "description",
        content: "Visual flow topology, asset controls, and reservoir monitoring.",
      },
    ],
  }),
  component: ReservoirsAndNetworkPage,
});

const n = (v: number) => (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function ReservoirsAndNetworkPage() {
  const { state, m, cityName, loading, intervene } = useSim();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [interventionReason, setInterventionReason] = useState("");

  const sources = m.assets.filter((a) => a.kind === "source");
  const treatments = m.assets.filter((a) => a.kind === "treatment");
  const pumps = m.assets.filter((a) => a.kind === "pump");

  const activeAssetId = selectedAssetId || (pumps[0]?.id ?? m.assets[0]?.id);
  const selectedAsset = m.assets.find((a) => a.id === activeAssetId) || m.assets[0];

  const getConnectedAssets = (aid: string) => {
    const asset = m.assets.find((a) => a.id === aid);
    if (!asset) return [];
    if (asset.kind === "source") return treatments.map((t) => `${t.name} (${t.id})`);
    if (asset.kind === "treatment")
      return [
        ...sources.map((s) => `Inflow: ${s.name} (${s.id})`),
        ...pumps.map((p) => `Outflow: ${p.name} (${p.id})`),
      ];
    if (asset.kind === "pump") return m.zones.map((z) => `${z.id} ${z.name}`);
    return [];
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Water Network & Asset Monitoring — {cityName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Monitor flow topology, inspect asset capacities, track reservoir storage, and perform
            simulated asset interventions for <strong>{cityName}</strong>. Interventions are
            recorded directly into SQLite audit log.
          </p>
        </div>
        <DemoBadge>{cityName} Flow Topology</DemoBadge>
      </div>

      {/* Network Flow Visualization Diagram */}
      <Panel
        title={`Simulated Flow Topology & Pipeline Connections — ${cityName}`}
        subtitle="Click any asset node below to inspect operating telemetry or trigger simulated interventions."
      >
        <div className="rounded-xl border bg-muted/20 p-6">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
            {/* Step 1: Source */}
            <div className="flex flex-col gap-3 items-center">
              {sources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedAssetId(s.id)}
                  className={`flex w-44 flex-col items-center rounded-xl border p-4 text-center transition-all ${
                    activeAssetId === s.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md"
                      : "bg-card hover:border-primary/40 shadow-xs"
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan/20 text-cyan">
                    <Database className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-xs font-bold text-foreground">{s.id}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{s.name}</p>
                  <p className="mt-2 font-mono text-xs font-semibold text-primary">
                    {n(s.flow)} / {n(s.capacity)} MLD
                  </p>
                </button>
              ))}
              <span className="mt-1 text-[10px] uppercase font-semibold text-muted-foreground">
                Raw Source
              </span>
            </div>

            <ArrowRight className="hidden h-6 w-6 text-muted-foreground/60 lg:block" />

            {/* Step 2: Treatment */}
            <div className="flex flex-col gap-3 items-center">
              {treatments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedAssetId(t.id)}
                  className={`flex w-44 flex-col items-center rounded-xl border p-4 text-center transition-all ${
                    activeAssetId === t.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md"
                      : "bg-card hover:border-primary/40 shadow-xs"
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20 text-primary">
                    <Droplets className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-xs font-bold text-foreground">{t.id}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{t.name}</p>
                  <p className="mt-2 font-mono text-xs font-semibold text-primary">
                    {n(t.flow)} / {n(t.effective)} MLD
                  </p>
                </button>
              ))}
              <span className="mt-1 text-[10px] uppercase font-semibold text-muted-foreground">
                Water Treatment
              </span>
            </div>

            <ArrowRight className="hidden h-6 w-6 text-muted-foreground/60 lg:block" />

            {/* Step 3: Pumps */}
            <div className="flex flex-col gap-3">
              {pumps.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedAssetId(p.id)}
                  className={`flex w-48 items-center justify-between rounded-xl border p-3.5 transition-all ${
                    activeAssetId === p.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md"
                      : "bg-card hover:border-primary/40 shadow-xs"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.id}</p>
                    <p className="mt-1 font-mono text-xs font-bold text-primary">
                      {n(p.flow)} / {n(p.effective)} MLD
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      p.factor === 0
                        ? "bg-critical/20 text-critical"
                        : p.factor < 1
                          ? "bg-warning/20 text-warning"
                          : "bg-success/20 text-success"
                    }`}
                  >
                    {p.factor === 0 ? "OFFLINE" : p.factor < 1 ? "DERATED" : "NORMAL"}
                  </span>
                </button>
              ))}
              <span className="text-center text-[10px] uppercase font-semibold text-muted-foreground">
                Pumping Stations
              </span>
            </div>

            <ArrowRight className="hidden h-6 w-6 text-muted-foreground/60 lg:block" />

            {/* Step 4: Distribution Zones */}
            <div className="flex flex-col gap-2 w-56">
              <div className="grid grid-cols-2 gap-2">
                {m.zones.map((z) => (
                  <div key={z.id} className="rounded-lg border bg-card p-2 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-foreground">{z.id}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{z.name}</p>
                    <p
                      className={`mt-1 font-mono text-[10px] font-bold ${
                        z.unmet > 0 ? "text-critical" : "text-success"
                      }`}
                    >
                      {n(z.supplied)} / {n(z.demand)}
                    </p>
                  </div>
                ))}
              </div>
              <span className="text-center text-[10px] uppercase font-semibold text-muted-foreground">
                Municipal Zones
              </span>
            </div>
          </div>
        </div>

        {/* Selected Asset Control & Intervention Drawer */}
        {selectedAsset && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Selected Infrastructure Component
                </span>
                <h3 className="mt-1 text-lg font-bold text-foreground">{selectedAsset.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Asset ID: {selectedAsset.id} · Kind: {selectedAsset.kind.toUpperCase()}
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  selectedAsset.factor === 0
                    ? "bg-critical/20 text-critical"
                    : selectedAsset.factor < 1
                      ? "bg-warning/20 text-warning"
                      : "bg-success/20 text-success"
                }`}
              >
                {selectedAsset.factor === 0
                  ? "OFFLINE"
                  : selectedAsset.factor < 1
                    ? "DEGRADED"
                    : "NORMAL"}
              </span>
            </div>

            {/* Metrics */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-3 shadow-xs">
                <p className="text-xs text-muted-foreground font-medium">Design Capacity</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">
                  {n(selectedAsset.capacity)} MLD
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-xs">
                <p className="text-xs text-muted-foreground font-medium">Current Operating Limit</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">
                  {n(selectedAsset.effective)} MLD
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-xs">
                <p className="text-xs text-muted-foreground font-medium">Current Pipe Throughput</p>
                <p className="mt-1 font-mono text-lg font-bold text-primary">
                  {n(selectedAsset.flow)} MLD
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-xs">
                <p className="text-xs text-muted-foreground font-medium">Connected Assets</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getConnectedAssets(selectedAsset.id).join(", ") || "None"}
                </p>
              </div>
            </div>

            {/* Operator Permitted Simulated Interventions */}
            <div className="mt-5 rounded-xl border border-primary/20 bg-background/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Wrench className="h-4 w-4 text-primary" /> Permitted Simulated Operator
                Interventions
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Manually derate, trip offline, or restore this asset. Actions are executed via
                FastAPI and logged into the audit trail.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={loading || selectedAsset.factor === 0}
                  onClick={() => intervene(selectedAsset.id, "offline", 0.0)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-1.5 text-xs font-semibold text-critical hover:bg-critical/20 disabled:opacity-40"
                >
                  <Power className="h-3.5 w-3.5" /> Trip Asset Offline (0 MLD)
                </button>
                <button
                  type="button"
                  disabled={loading || selectedAsset.factor === 0.5}
                  onClick={() => intervene(selectedAsset.id, "degraded", 0.5)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/20 disabled:opacity-40"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Derate Throughput to 50%
                </button>
                <button
                  type="button"
                  disabled={loading || selectedAsset.factor === 1.0}
                  onClick={() => intervene(selectedAsset.id, "normal", 1.0)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Restore to Full Capacity (100%)
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Reservoir Storage Telemetry (from sections) */}
      <AvailabilityChart />

      <Panel
        title="All Monitored City Reservoirs"
        subtitle="Thresholds: warning below 50%, critical deficit below 20%"
      >
        <ReservoirTable />
      </Panel>
    </div>
  );
}
