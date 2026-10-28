# JalSetu simulation integration

## What's wired up
- `SimProvider` is mounted around the route tree in `src/routes/__root.tsx`.
- `/simulator` triggers three incidents, displays impact analysis, compares generated plans, validates constraints, and supports approve/reject/reset actions.
- `/` displays the simulation's current metrics instead of the old reservoir mock data.
- `/allocation` shows simulated zone supply, asset capacity and tanker assignments after approval.
- `/agents` displays the four-stage workflow and its activity log.
- `/response` shows the current incident and session history.
- Existing styling, navigation and reservoir monitoring route are retained.

## Demo caveats
All network values, populations, capacities and scenarios are fictional. This is a deterministic rule-based simulation, not a live municipal system. It does not call an LLM, external APIs, sensor feeds, emergency services, or real tanker dispatch systems. State is kept in React memory and resets when the app reloads.

## Run locally
```bash
npm install
npm run dev
```
Open the local address shown by Vite (previously `http://localhost:8080/`).

## Verify
```bash
npm test
npm run build
```

## Additional interaction update
- Reservoir names in Reservoir Monitoring are now interactive buttons; selecting one opens a detail panel with storage, capacity, inflow, outflow, net flow and status. Details can be closed or toggled by selecting the same reservoir again.
- The README now includes a demo checklist and clear notes on the simulation's limits.
