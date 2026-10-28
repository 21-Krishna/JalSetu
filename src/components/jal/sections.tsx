import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowRight, Bot, ClipboardList, Radar, Truck } from "lucide-react";
import { agents, events, levelPct, reservoirs, statusFor, zones } from "@/lib/mock-data";
import { DemoBadge, EventStatusText, LevelBar, Panel, SeverityPill, StatusPill } from "./ui";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};
const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

export function AvailabilityChart() {
  const data = reservoirs.map((r) => ({
    name: r.name.replace(" Reservoir", ""),
    pct: levelPct(r),
  }));
  const color = {
    normal: "var(--success)",
    warning: "var(--warning)",
    critical: "var(--critical)",
  };
  return (
    <Panel title="Water availability by reservoir" subtitle="Current storage as % of capacity">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axis} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--muted)" }}
              formatter={(v: number) => [`${v}%`, "Storage"]}
            />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {data.map((d) => (
                <Cell key={d.name} fill={color[statusFor(d.pct)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" />
          Normal ≥ 50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          Warning 20–49%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-critical" />
          Critical &lt; 20%
        </span>
      </div>
    </Panel>
  );
}

export function DemandChart() {
  return (
    <Panel title="Water demand by zone" subtitle="Daily demand vs. available supply (ML/day)">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={zones} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="zone" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="demandMLd"
              name="Demand"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="supplyMLd"
              name="Supply"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function ReservoirTable({ limit }: { limit?: number }) {
  const rows = limit ? reservoirs.slice(0, limit) : reservoirs;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Select a reservoir name to inspect its storage and flow details.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 font-medium">Reservoir</th>
              <th className="pb-2 font-medium">Zone</th>
              <th className="pb-2 font-medium">Water level</th>
              <th className="pb-2 text-right font-medium">Capacity</th>
              {!limit && <th className="pb-2 text-right font-medium">Net flow</th>}
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = levelPct(r);
              const status = statusFor(pct);
              const net = r.inflowMLd - r.outflowMLd;
              const isSelected = selectedId === r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-b last:border-0 ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <td className="py-3 font-medium text-foreground">
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : r.id)}
                      aria-expanded={isSelected}
                      className="rounded text-left text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="py-3 text-muted-foreground">{r.zone}</td>
                  <td className="py-3">
                    <LevelBar pct={pct} status={status} />
                  </td>
                  <td className="py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {r.capacityML.toLocaleString()} ML
                  </td>
                  {!limit && (
                    <td
                      className={`py-3 text-right font-mono text-xs tabular-nums ${net < 0 ? "text-critical" : "text-success"}`}
                    >
                      {net > 0 ? "+" : ""}
                      {net} ML/d
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <StatusPill status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected &&
        (() => {
          const pct = levelPct(selected);
          const net = selected.inflowMLd - selected.outflowMLd;
          return (
            <div
              className="rounded-lg border border-primary/30 bg-primary/5 p-4"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Selected reservoir
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{selected.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.id} · {selected.zone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Close details
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Current storage</p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {selected.currentML.toLocaleString()} ML
                  </p>
                  <p className="text-xs text-muted-foreground">{pct}% of capacity</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {selected.capacityML.toLocaleString()} ML
                  </p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Daily inflow</p>
                  <p className="mt-1 font-mono text-lg font-semibold">{selected.inflowMLd} ML/d</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Daily outflow / net</p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {selected.outflowMLd} / {net > 0 ? "+" : ""}
                    {net}
                  </p>
                  <p className="text-xs text-muted-foreground">ML/d · illustrative data</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Status: {statusFor(pct)}. Values are fictional demonstration data and are not
                connected to live reservoir telemetry.
              </p>
            </div>
          );
        })()}
    </div>
  );
}

export function EventsList({ limit }: { limit?: number }) {
  const rows = limit ? events.slice(0, limit) : events;
  return (
    <ul className="divide-y">
      {rows.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <SeverityPill severity={e.severity} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{e.id}</span> · {e.zone} · {e.time}
            </p>
          </div>
          <EventStatusText status={e.status} />
        </li>
      ))}
    </ul>
  );
}

const agentIcons = { monitor: Radar, assess: Activity, plan: Truck, respond: ClipboardList };

export function AgentNetwork({ detailed }: { detailed?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
      {agents.map((a, i) => {
        const Icon = agentIcons[a.key];
        return (
          <div key={a.key} className="contents">
            <div className="flex flex-col rounded-lg border bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar text-sidebar-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <DemoBadge>Demo agent</DemoBadge>
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </p>
              <h3 className="text-sm font-semibold text-foreground">{a.name}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.role}</p>
              {detailed && (
                <p className="mt-auto pt-3 text-xs">
                  <span className="text-muted-foreground">Output: </span>
                  <span className="font-medium text-foreground">{a.output}</span>
                </p>
              )}
            </div>
            {i < agents.length - 1 && (
              <div className="flex items-center justify-center text-cyan">
                <ArrowRight className="h-4 w-4 rotate-90 md:rotate-0" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { Bot };
