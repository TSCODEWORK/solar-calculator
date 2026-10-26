# Self-Updating Solar & Storage Payback Engine

A production-ready, client-side interactive Solar & Battery Storage Payback Calculator web application with an automated weekly background updater for regional solar insolation and local retail electricity utility rates.

**100% Free, Private, and Zero User Lead-Capture** — No sales calls, no phone or email capture walls, and zero client tracking cookies.

---

## Technical Stack & Topology

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & Theme:** Tailwind CSS v4, dark engineering aesthetic inspired by hydrological dashboards (chilewaterlevels)
- **Visualizations:** Recharts responsive Cumulative Cash Flow AreaChart and Monthly Seasonal Harvest Composed Chart
- **State Management:** URL search parameters (shareable calculation scenario links) + local React state
- **Background Cron Updater:** Weekly scheduled refresh script (`scripts/sync-rates-and-weather.ts`), GitHub Actions workflow (`.github/workflows/weekly-sync.yml`), and Next.js route `/api/cron/sync`
- **Data Caching:** Static pre-compiled datasets (`public/data/regional_rates.json`, `data/tariffs.json`, `data/solar_cache.json`) for instantaneous client queries with zero API lag

---

## Core Calculation Engine & Financial Math (`src/lib/solar-math.ts`)

The simulation engine models physical degradation, utility inflation compounding, battery round-trip efficiency, and net metering export regimes:

1. **Yearly Degraded Energy Yield:**
   $$E_t = \text{Annual\_kWh} \times (1 - \text{Degradation})^{t-1} \times \text{Battery\_Efficiency\_Factor}$$

2. **Yearly Escalated Electricity Rate:**
   $$R_t = \text{Base\_Rate} \times (1 + \text{Inflation})^{t-1}$$

3. **Annual Avoided Cost ($):**
   $$\text{Savings}_t = E_t \times R_t \times \text{Effective\_Tariff\_Multiplier}$$

4. **Exact Payback Horizon:**
   Interpolated month and year where $\text{Cumulative Savings} \ge \text{Net Capex}$.

5. **Levelized Cost of Energy (LCOE, $/kWh):**
   $$\text{LCOE} = \frac{\text{Net Capex}}{\sum_{t=1}^{25} E_t}$$

6. **Net Present Value (NPV) & Internal Rate of Return (IRR):**
   Newton-Raphson polynomial solver determining discount rate where $\text{NPV} = 0$.

7. **Net Metering Policies:**
   - **1:1 Full Retail Net Metering:** 100% credit for all exported daytime kilowatt-hours.
   - **Avoided Cost / NEM 3.0 (California style):** Direct self-consumption + battery peak shift capture full retail avoided cost; surplus exported at wholesale avoided cost (~28%).
   - **100% Self-Consumption / Off-Grid:** Zero grid export credit; daytime surplus beyond battery storage capacity is clipped.

---

## Weekly Sync Pipeline

```
GitHub Actions / Vercel Cron (Weekly)
             │
             ▼
   scripts/sync-rates-and-weather.ts
             │
             ├──> EIA API v2 / OpenEI (Residential electricity rate movements)
             └──> NREL PVWatts v8 Benchmark (Solar irradiance updates)
             │
             ▼
   public/data/regional_rates.json
   data/tariffs.json
   data/solar_cache.json
             │
             ▼
   Client Browser: Instantaneous lookup & live sync badge indicator:
   "Rates & Solar Data Synced: [Date] (Updated Weekly)"
```

---

## Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v20 and v25)
- npm 9+

### Installation & Build
```bash
# 1. Install dependencies
npm install

# 2. Run unit test suite (100% mathematical model verification)
npm test

# 3. Test background data sync engine
npm run sync-data

# 4. Build production bundle
npm run build

# 5. Start production server
npm start
```

### Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables (Optional)

| Variable | Description |
|---|---|
| `NREL_API_KEY` | Optional. If provided, enables live real-time queries to NREL PVWatts v8 API. If omitted, app automatically uses high-precision regional cache. |
| `EIA_API_KEY` | Optional. For weekly rate refresh directly from US Energy Information Administration. |
| `CRON_SECRET` | Optional. Bearer token to protect `/api/cron/sync` when called via external webhooks. |

---

## Shareability & Exports

- **Copy Shareable Link:** Encodes all system inputs into URL parameters (e.g. `?zip=94102&capex=11000&kw=10&batt=30&rate=0.384&esc=4.0&nem=avoided_cost`).
- **Export Summary CSV:** Downloads complete 25-year amortization schedule, monthly seasonal yields, and KPI summary.
- **Export / Print PDF:** Formatted clean report with custom print stylesheet.
