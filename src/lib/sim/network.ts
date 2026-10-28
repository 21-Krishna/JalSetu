// Fictional demo network — illustrative simulation data, not live municipal data.
// All flow quantities are in MLD (million litres per day).

export type Priority = "high" | "medium" | "low";
export type AssetKind = "source" | "treatment" | "pump";

export interface Zone {
  id: string;
  name: string;
  population: number;
  priority: Priority;
  demand: number; // MLD
}

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  capacity: number; // MLD
}

export interface Link {
  id: string;
  from: string;
  to: string;
  capacity: number; // MLD
}

export const ZONES: Zone[] = [
  { id: "Z-01", name: "North", population: 18000, priority: "high", demand: 10 },
  { id: "Z-02", name: "Market", population: 22000, priority: "medium", demand: 12 },
  { id: "Z-03", name: "South", population: 15000, priority: "high", demand: 8 },
  { id: "Z-04", name: "East", population: 12000, priority: "low", demand: 6 },
];

export const ASSETS: Asset[] = [
  { id: "SRC-01", name: "Source", kind: "source", capacity: 40 },
  { id: "TP-01", name: "Treatment Plant", kind: "treatment", capacity: 35 },
  { id: "P-03", name: "Pump P-03", kind: "pump", capacity: 18 },
  { id: "P-04", name: "Pump P-04", kind: "pump", capacity: 15 },
];

export const LINKS: Link[] = [
  { id: "L-01", from: "SRC-01", to: "TP-01", capacity: 35 },
  { id: "L-02", from: "TP-01", to: "P-03", capacity: 18 },
  { id: "L-03", from: "P-03", to: "Z-01", capacity: 10 },
  { id: "L-04", from: "P-03", to: "Z-02", capacity: 8 },
  { id: "L-05", from: "TP-01", to: "P-04", capacity: 15 },
  { id: "L-06", from: "P-04", to: "Z-03", capacity: 8 },
  { id: "L-07", from: "P-04", to: "Z-04", capacity: 6 },
];

/** Simulated emergency tanker fleet. */
export const TANKER_FLEET = 8;
/** Daily delivery per tanker (12 KL × ~42 trips ≈ 0.5 MLD). */
export const TANKER_MLD = 0.5;

export const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export const zoneLabel = (id: string) => {
  const z = ZONES.find((x) => x.id === id);
  return z ? `${z.id} ${z.name}` : id;
};
