import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity, Status, EventStatus } from "@/lib/mock-data";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  critical: "bg-critical/10 text-critical",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/10 text-success",
  cyan: "bg-cyan/15 text-cyan",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof toneMap;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const statusStyles: Record<Status, string> = {
  normal: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/10 text-critical",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const sevStyles: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-warning/15 text-warning",
  high: "bg-critical/10 text-critical",
  critical: "bg-critical text-destructive-foreground",
};

export function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        sevStyles[severity],
      )}
    >
      {severity}
    </span>
  );
}

const evStyles: Record<EventStatus, string> = {
  open: "text-critical",
  "in progress": "text-warning",
  resolved: "text-success",
};

export function EventStatusText({ status }: { status: EventStatus }) {
  return <span className={cn("text-xs font-medium capitalize", evStyles[status])}>{status}</span>;
}

export function LevelBar({ pct, status }: { pct: number; status: Status }) {
  const bar = { normal: "bg-success", warning: "bg-warning", critical: "bg-critical" }[status];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-xs tabular-nums text-foreground">{pct}%</span>
    </div>
  );
}

export function DemoBadge({ children = "Demo" }: { children?: ReactNode }) {
  return (
    <span className="rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
