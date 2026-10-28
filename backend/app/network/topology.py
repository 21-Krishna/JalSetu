from typing import Any, Dict, List, Literal, NamedTuple

PriorityType = Literal["high", "medium", "low"]
AssetKindType = Literal["source", "treatment", "pump"]

class ZoneDef(NamedTuple):
    id: str
    name: str
    population: int
    priority: PriorityType
    demand: float  # MLD

class AssetDef(NamedTuple):
    id: str
    name: str
    kind: AssetKindType
    capacity: float  # MLD

class LinkDef(NamedTuple):
    id: str
    from_node: str
    to_node: str
    capacity: float  # MLD

class ReservoirDef(NamedTuple):
    id: str
    name: str
    zone: str
    capacity_ml: float
    current_ml: float
    inflow_mld: float
    outflow_mld: float

class CityTopology(NamedTuple):
    id: str
    name: str
    state: str
    description: str
    zones: List[ZoneDef]
    assets: List[AssetDef]
    links: List[LinkDef]
    reservoirs: List[ReservoirDef]
    tanker_fleet: int
    scenarios: Dict[str, Dict[str, Any]]


# =====================================================================
# 1. GREATER NOIDA (Default Demonstration City)
# =====================================================================
GREATER_NOIDA = CityTopology(
    id="greater_noida",
    name="Greater Noida",
    state="Uttar Pradesh",
    description="Planned urban center in Gautam Buddha Nagar, NCR. Simulated network with canal intake, treatment, and dual booster lift.",
    tanker_fleet=8,
    zones=[
        ZoneDef("Z-01", "North Zone", 18000, "high", 10.0),
        ZoneDef("Z-02", "Market Zone", 22000, "medium", 12.0),
        ZoneDef("Z-03", "South Zone", 15000, "high", 8.0),
        ZoneDef("Z-04", "East Zone", 12000, "low", 6.0),
    ],
    assets=[
        AssetDef("SRC-01", "Central Source Reservoir", "source", 40.0),
        AssetDef("TP-01", "Water Treatment Plant", "treatment", 35.0),
        AssetDef("P-03", "Pumping Station P-03", "pump", 18.0),
        AssetDef("P-04", "Pumping Station P-04", "pump", 15.0),
    ],
    links=[
        LinkDef("L-01", "SRC-01", "TP-01", 35.0),
        LinkDef("L-02", "TP-01", "P-03", 18.0),
        LinkDef("L-03", "P-03", "Z-01", 10.0),
        LinkDef("L-04", "P-03", "Z-02", 8.0),
        LinkDef("L-05", "TP-01", "P-04", 15.0),
        LinkDef("L-06", "P-04", "Z-03", 8.0),
        LinkDef("L-07", "P-04", "Z-04", 6.0),
    ],
    reservoirs=[
        ReservoirDef("R1", "Central Reservoir", "North Zone", 4200.0, 3150.0, 42.0, 51.0),
        ReservoirDef("R2", "North Reservoir", "Market Zone", 3600.0, 612.0, 12.0, 38.0),
        ReservoirDef("R3", "East Reservoir", "South Zone", 2800.0, 1260.0, 22.0, 30.0),
        ReservoirDef("R4", "South Reservoir", "East Zone", 3100.0, 2480.0, 35.0, 33.0),
        ReservoirDef("R5", "West Lake Reservoir", "North Zone", 2400.0, 384.0, 8.0, 26.0),
        ReservoirDef("R6", "Riverside Reservoir", "Market Zone", 1900.0, 1406.0, 19.0, 21.0),
        ReservoirDef("R7", "Hillview Reservoir", "South Zone", 1500.0, 645.0, 10.0, 15.0),
        ReservoirDef("R8", "Lakeside Reservoir", "East Zone", 2100.0, 1638.0, 24.0, 22.0),
    ],
    scenarios={
        "pump_failure_p03": {
            "label": "Pump Failure: P-03",
            "description": "Booster pump P-03 trips offline (0 of 18 MLD). Severely starves North (Z-01) and Market (Z-02) zones.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "Pump P-03 operating at 0 MLD (offline)",
            "expected_impact": "Downstream flow severed to Z-01 North & Z-02 Market; 22.0 MLD immediate shortage",
            "asset_factor": {"P-03": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-03",
            "city_compatibility": ["greater_noida"],
        },
        "treatment_reduction": {
            "label": "Treatment Capacity Reduction",
            "description": "Kasna WTP (TP-01) throughput drops to 60% (21 of 35 MLD) following coagulant filter breakdown.",
            "category": "treatment_reduction",
            "severity": "HIGH",
            "simulated_condition": "TP-01 operating at 21.0 MLD (60% effective capacity)",
            "expected_impact": "Upstream treatment constriction limits total supply across city; 11.0 MLD shortage",
            "asset_factor": {"TP-01": 0.6},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "TP-01",
            "city_compatibility": ["greater_noida"],
        },
        "demand_surge": {
            "label": "Heatwave Demand Surge (+30%)",
            "description": "Unprecedented summer heatwave raises civic water demand by +30% across all 4 municipal zones.",
            "category": "demand_surge",
            "severity": "MODERATE",
            "simulated_condition": "Civic demand multiplier at 1.30x (total 46.8 MLD)",
            "expected_impact": "Network pipes operating at capacity ceiling; 14.8 MLD unmet demand",
            "asset_factor": {},
            "link_factor": {},
            "demand_factor": 1.3,
            "failed_asset": None,
            "city_compatibility": ["greater_noida"],
        },
        "pipeline_disruption_l03": {
            "label": "Feeder Pipeline Rupture: L-03",
            "description": "Primary 800mm trunk pipeline L-03 (P-03 → Z-01) ruptures, cutting delivery to North Zone.",
            "category": "pipeline_disruption",
            "severity": "HIGH",
            "simulated_condition": "Link L-03 flow constricted to 0 MLD (ruptured pipe)",
            "expected_impact": "Z-01 North completely isolated from pipe supply (10.0 MLD deficit); P-03 continues feeding Z-02",
            "asset_factor": {},
            "link_factor": {"L-03": 0.0},
            "demand_factor": 1.0,
            "failed_asset": None,
            "failed_link": "L-03",
            "city_compatibility": ["greater_noida"],
        },
        "multiple_asset_failure": {
            "label": "Dual Booster Station Blackout",
            "description": "Simultaneous substation trip takes both booster pumping stations P-03 and P-04 offline.",
            "category": "multiple_asset_failure",
            "severity": "CRITICAL",
            "simulated_condition": "Pumps P-03 (0 MLD) and P-04 (0 MLD) both offline",
            "expected_impact": "Complete distribution grid collapse across all 4 zones; 36.0 MLD municipal deficit",
            "asset_factor": {"P-03": 0.0, "P-04": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-03, P-04",
            "city_compatibility": ["greater_noida"],
        },
        "reservoir_level_reduction": {
            "label": "Source Reservoir Storage Drop",
            "description": "Central Source Reservoir (SRC-01) throughput constrained to 18 MLD due to seasonal depletion.",
            "category": "treatment_reduction",
            "severity": "CRITICAL",
            "simulated_condition": "SRC-01 throughput constrained to 18.0 MLD (45% capacity)",
            "expected_impact": "Citywide source limitation starving all downstream treatment and booster stations; 14.0 MLD deficit",
            "asset_factor": {"SRC-01": 0.45},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "SRC-01",
            "city_compatibility": ["greater_noida"],
        },
    },
)

# =====================================================================
# 2. DELHI (National Capital Territory)
# =====================================================================
DELHI = CityTopology(
    id="delhi",
    name="Delhi",
    state="National Capital Territory",
    description="Metropolitan capital territory relying on Yamuna intakes and major filtration works at Sonia Vihar and Wazirabad.",
    tanker_fleet=10,
    zones=[
        ZoneDef("DEL-Z01", "Civil Lines & Old Delhi", 25000, "high", 12.0),
        ZoneDef("DEL-Z02", "Shahdara East Zone", 28000, "medium", 14.0),
        ZoneDef("DEL-Z03", "Connaught Place & Lutyens", 16000, "high", 10.0),
        ZoneDef("DEL-Z04", "Okhla Industrial Belt", 18000, "low", 8.0),
    ],
    assets=[
        AssetDef("SRC-DEL-01", "Yamuna Raw Water Intake", "source", 50.0),
        AssetDef("TP-DEL-01", "Sonia Vihar Treatment Works", "treatment", 45.0),
        AssetDef("P-DEL-01", "Trans-Yamuna Booster Station", "pump", 24.0),
        AssetDef("P-DEL-02", "Central Ridge Pumping Station", "pump", 20.0),
    ],
    links=[
        LinkDef("DL-01", "SRC-DEL-01", "TP-DEL-01", 45.0),
        LinkDef("DL-02", "TP-DEL-01", "P-DEL-01", 24.0),
        LinkDef("DL-03", "P-DEL-01", "DEL-Z01", 12.0),
        LinkDef("DL-04", "P-DEL-01", "DEL-Z02", 12.0),
        LinkDef("DL-05", "TP-DEL-01", "P-DEL-02", 20.0),
        LinkDef("DL-06", "P-DEL-02", "DEL-Z03", 10.0),
        LinkDef("DL-07", "P-DEL-02", "DEL-Z04", 8.0),
    ],
    reservoirs=[
        ReservoirDef("DEL-R1", "Wazirabad Reservoir", "Civil Lines & Old Delhi", 5000.0, 3850.0, 48.0, 45.0),
        ReservoirDef("DEL-R2", "Sonia Vihar Balancing Sump", "Shahdara East Zone", 4200.0, 1100.0, 18.0, 40.0),
        ReservoirDef("DEL-R3", "Ridge Master Storage", "Connaught Place & Lutyens", 3400.0, 2600.0, 32.0, 30.0),
        ReservoirDef("DEL-R4", "Okhla Industrial Tank", "Okhla Industrial Belt", 2800.0, 2100.0, 24.0, 22.0),
    ],
    scenarios={
        "delhi_trans_yamuna_pump": {
            "label": "Trans-Yamuna Booster Trip",
            "description": "Booster P-DEL-01 fails unexpectedly (0 of 24 MLD). Supply severed to Civil Lines and Shahdara East.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "Booster P-DEL-01 offline (0.0 / 24.0 MLD)",
            "expected_impact": "Downstream flow cut off to DEL-Z01 and DEL-Z02; 26.0 MLD immediate deficit",
            "asset_factor": {"P-DEL-01": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-DEL-01",
            "city_compatibility": ["delhi"],
        },
        "delhi_wtp_derating": {
            "label": "Raw Water Quality Drop: WTP Derated",
            "description": "High river ammonia derates Sonia Vihar WTP (TP-DEL-01) to 50% capacity (22.5 of 45 MLD).",
            "category": "treatment_reduction",
            "severity": "HIGH",
            "simulated_condition": "TP-DEL-01 constrained to 22.5 MLD (50% throughput)",
            "expected_impact": "Upstream treatment cut reduces capacity across all Delhi zones; 18.0 MLD deficit",
            "asset_factor": {"TP-DEL-01": 0.5},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "TP-DEL-01",
            "city_compatibility": ["delhi"],
        },
        "delhi_heatwave_surge": {
            "label": "NCR Severe Heatwave (+30% Surge)",
            "description": "Civic water demand spikes by +30% during an intense summer heatwave in the national capital.",
            "category": "demand_surge",
            "severity": "MODERATE",
            "simulated_condition": "Demand multiplier 1.30x across all capital zones",
            "expected_impact": "Transmission links saturated at design ceiling; 15.6 MLD shortfall",
            "asset_factor": {},
            "link_factor": {},
            "demand_factor": 1.3,
            "failed_asset": None,
            "city_compatibility": ["delhi"],
        },
        "delhi_pipeline_rupture": {
            "label": "Trans-Yamuna Trunk Pipeline Burst: DL-03",
            "description": "Main transmission conduit DL-03 (P-DEL-01 → DEL-Z01) ruptures under high pressure.",
            "category": "pipeline_disruption",
            "severity": "HIGH",
            "simulated_condition": "Link DL-03 severed to 0 MLD throughput",
            "expected_impact": "Civil Lines & Old Delhi cut off (12.0 MLD deficit) while P-DEL-01 feeds DEL-Z02",
            "asset_factor": {},
            "link_factor": {"DL-03": 0.0},
            "demand_factor": 1.0,
            "failed_asset": None,
            "failed_link": "DL-03",
            "city_compatibility": ["delhi"],
        },
        "delhi_dual_asset_cascade": {
            "label": "Compound Intake & Pumping Cascade",
            "description": "P-DEL-01 trips offline while Sonia Vihar WTP derates to 50% due to turbidity shock.",
            "category": "multiple_asset_failure",
            "severity": "CRITICAL",
            "simulated_condition": "P-DEL-01 at 0 MLD and TP-DEL-01 at 22.5 MLD (50%)",
            "expected_impact": "Severe multi-stage outage starving Old Delhi, Shahdara, and throttling Lutyens; 31.0 MLD deficit",
            "asset_factor": {"P-DEL-01": 0.0, "TP-DEL-01": 0.5},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-DEL-01, TP-DEL-01",
            "city_compatibility": ["delhi"],
        },
    },
)

# =====================================================================
# 3. JAIPUR (Rajasthan)
# =====================================================================
JAIPUR = CityTopology(
    id="jaipur",
    name="Jaipur",
    state="Rajasthan",
    description="Semi-arid historic capital supplied via the Bisalpur dam transmission corridor and Surajpura waterworks.",
    tanker_fleet=12,
    zones=[
        ZoneDef("JPR-Z01", "C-Scheme & Civil Lines", 16000, "high", 8.0),
        ZoneDef("JPR-Z02", "Mansarovar Township", 24000, "medium", 12.0),
        ZoneDef("JPR-Z03", "Malviya Nagar & Fort Area", 20000, "high", 10.0),
        ZoneDef("JPR-Z04", "Sitapura Industrial Area", 14000, "low", 6.0),
    ],
    assets=[
        AssetDef("SRC-JPR-01", "Bisalpur Dam Feeder", "source", 38.0),
        AssetDef("TP-JPR-01", "Surajpura Filtration Works", "treatment", 34.0),
        AssetDef("P-JPR-01", "Mansarovar Headworks Booster", "pump", 18.0),
        AssetDef("P-JPR-02", "Jawahar Circle Pumping Unit", "pump", 16.0),
    ],
    links=[
        LinkDef("JP-01", "SRC-JPR-01", "TP-JPR-01", 34.0),
        LinkDef("JP-02", "TP-JPR-01", "P-JPR-01", 18.0),
        LinkDef("JP-03", "P-JPR-01", "JPR-Z01", 8.0),
        LinkDef("JP-04", "P-JPR-01", "JPR-Z02", 10.0),
        LinkDef("JP-05", "TP-JPR-01", "P-JPR-02", 16.0),
        LinkDef("JP-06", "P-JPR-02", "JPR-Z03", 10.0),
        LinkDef("JP-07", "P-JPR-02", "JPR-Z04", 6.0),
    ],
    reservoirs=[
        ReservoirDef("JPR-R1", "Surajpura Master Reservoir", "C-Scheme & Civil Lines", 4000.0, 3100.0, 35.0, 34.0),
        ReservoirDef("JPR-R2", "Mansarovar Elevated Reservoir", "Mansarovar Township", 3500.0, 750.0, 10.0, 28.0),
        ReservoirDef("JPR-R3", "Jawahar Circle Reservoir", "Malviya Nagar & Fort Area", 2900.0, 2200.0, 24.0, 22.0),
        ReservoirDef("JPR-R4", "Sitapura Industrial Tank", "Sitapura Industrial Area", 2400.0, 1850.0, 19.0, 17.0),
    ],
    scenarios={
        "jaipur_mansarovar_pump": {
            "label": "Mansarovar Headworks Outage",
            "description": "Primary pump P-JPR-01 trips offline (0 of 18 MLD). C-Scheme and Mansarovar supply severed.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "P-JPR-01 offline (0.0 / 18.0 MLD)",
            "expected_impact": "Downstream flow cut off to JPR-Z01 and JPR-Z02; 20.0 MLD immediate shortage",
            "asset_factor": {"P-JPR-01": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-JPR-01",
            "city_compatibility": ["jaipur"],
        },
        "jaipur_wtp_derating": {
            "label": "Surajpura Filtration Throughput Constriction",
            "description": "Surajpura WTP (TP-JPR-01) throughput constricted to 55% (18.7 of 34 MLD) due to raw water intake siltation.",
            "category": "treatment_reduction",
            "severity": "HIGH",
            "simulated_condition": "TP-JPR-01 operating at 18.7 MLD (55% capacity)",
            "expected_impact": "Filtration shortfall constrains distribution across all Jaipur zones; 15.3 MLD deficit",
            "asset_factor": {"TP-JPR-01": 0.55},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "TP-JPR-01",
            "city_compatibility": ["jaipur"],
        },
        "jaipur_arid_surge": {
            "label": "Thar Desert Heatwave (+35% Surge)",
            "description": "Intense arid summer conditions drive demand up by +35% across Jaipur zones.",
            "category": "demand_surge",
            "severity": "MODERATE",
            "simulated_condition": "Civic demand multiplier at 1.35x across historic city",
            "expected_impact": "High evaporation and peak residential usage; 14.2 MLD deficit",
            "asset_factor": {},
            "link_factor": {},
            "demand_factor": 1.35,
            "failed_asset": None,
            "city_compatibility": ["jaipur"],
        },
        "jaipur_pipeline_rupture": {
            "label": "Mansarovar Conduit Rupture: JP-03",
            "description": "Main supply conduit JP-03 (P-JPR-01 → JPR-Z01) fractures along Ajmer Road.",
            "category": "pipeline_disruption",
            "severity": "HIGH",
            "simulated_condition": "Link JP-03 severed to 0 MLD throughput",
            "expected_impact": "C-Scheme & Civil Lines cut off (8.0 MLD deficit) while P-JPR-01 feeds Mansarovar",
            "asset_factor": {},
            "link_factor": {"JP-03": 0.0},
            "demand_factor": 1.0,
            "failed_asset": None,
            "failed_link": "JP-03",
            "city_compatibility": ["jaipur"],
        },
        "jaipur_compound_failure": {
            "label": "Bisalpur Dam Feeder & Booster Compound Trip",
            "description": "Bisalpur Intake drops to 50% while Mansarovar headworks pump P-JPR-01 trips.",
            "category": "multiple_asset_failure",
            "severity": "CRITICAL",
            "simulated_condition": "P-JPR-01 offline (0 MLD) and SRC-JPR-01 at 19 MLD (50%)",
            "expected_impact": "Severe multi-stage failure starving Mansarovar and constraining Jawahar Circle; 24.0 MLD deficit",
            "asset_factor": {"P-JPR-01": 0.0, "SRC-JPR-01": 0.5},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-JPR-01, SRC-JPR-01",
            "city_compatibility": ["jaipur"],
        },
        "jaipur_dam_depletion": {
            "label": "Bisalpur Transmission Loss",
            "description": "Bisalpur raw water intake drops to 50% capacity (19 of 38 MLD) due to emergency pipeline repair.",
            "category": "treatment_reduction",
            "severity": "CRITICAL",
            "simulated_condition": "SRC-JPR-01 at 19.0 MLD (50% capacity)",
            "expected_impact": "Raw water transmission shortage constraining Surajpura WTP; 17.0 MLD deficit",
            "asset_factor": {"SRC-JPR-01": 0.5},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "SRC-JPR-01",
            "city_compatibility": ["jaipur"],
        },
    },
)

# =====================================================================
# 4. LUCKNOW (Uttar Pradesh)
# =====================================================================
LUCKNOW = CityTopology(
    id="lucknow",
    name="Lucknow",
    state="Uttar Pradesh",
    description="Administrative capital with supply managed through Gomti river intakes and Aishbagh waterworks.",
    tanker_fleet=8,
    zones=[
        ZoneDef("LKO-Z01", "Hazratganj Administrative Core", 15000, "high", 9.0),
        ZoneDef("LKO-Z02", "Alambagh Commercial Zone", 22000, "medium", 11.0),
        ZoneDef("LKO-Z03", "Gomti Nagar Residential", 26000, "high", 11.0),
        ZoneDef("LKO-Z04", "Indira Nagar Colony", 17000, "low", 7.0),
    ],
    assets=[
        AssetDef("SRC-LKO-01", "Gomti River Intake Barrage", "source", 42.0),
        AssetDef("TP-LKO-01", "Aishbagh Water Treatment Facility", "treatment", 36.0),
        AssetDef("P-LKO-01", "Hazratganj Distribution Pump", "pump", 20.0),
        AssetDef("P-LKO-02", "Trans-Gomti Pumping Station", "pump", 16.0),
    ],
    links=[
        LinkDef("LK-01", "SRC-LKO-01", "TP-LKO-01", 36.0),
        LinkDef("LK-02", "TP-LKO-01", "P-LKO-01", 20.0),
        LinkDef("LK-03", "P-LKO-01", "LKO-Z01", 9.0),
        LinkDef("LK-04", "P-LKO-01", "LKO-Z02", 9.0),
        LinkDef("LK-05", "TP-LKO-01", "P-LKO-02", 16.0),
        LinkDef("LK-06", "P-LKO-02", "LKO-Z03", 10.0),
        LinkDef("LK-07", "P-LKO-02", "LKO-Z04", 6.0),
    ],
    reservoirs=[
        ReservoirDef("LKO-R1", "Aishbagh Master Storage", "Hazratganj Administrative Core", 4400.0, 3400.0, 40.0, 38.0),
        ReservoirDef("LKO-R2", "Alambagh Sump Tank", "Alambagh Commercial Zone", 3200.0, 800.0, 12.0, 29.0),
        ReservoirDef("LKO-R3", "Gomti Nagar Reservoir", "Gomti Nagar Residential", 3800.0, 2900.0, 31.0, 30.0),
        ReservoirDef("LKO-R4", "Indira Nagar Overhead Tank", "Indira Nagar Colony", 2600.0, 1980.0, 20.0, 19.0),
    ],
    scenarios={
        "lucknow_hazratganj_pump": {
            "label": "Hazratganj Primary Pump Trip",
            "description": "Distribution pump P-LKO-01 fails (0 of 20 MLD). Hazratganj and Alambagh zones severed.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "P-LKO-01 offline (0.0 / 20.0 MLD)",
            "expected_impact": "Downstream flow cut off to LKO-Z01 and LKO-Z02; 20.0 MLD immediate shortage",
            "asset_factor": {"P-LKO-01": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-LKO-01",
            "city_compatibility": ["lucknow"],
        },
        "lucknow_gomti_lowflow": {
            "label": "Gomti Low Inflow: WTP Derated",
            "description": "River silt and low seasonal discharge reduce Aishbagh throughput to 55% (19.8 of 36 MLD).",
            "category": "treatment_reduction",
            "severity": "MODERATE",
            "simulated_condition": "Aishbagh WTP (TP-LKO-01) at 19.8 MLD (55% throughput)",
            "expected_impact": "Treatment plant throttled, causing widespread delivery cuts; 14.4 MLD shortage",
            "asset_factor": {"TP-LKO-01": 0.55},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "TP-LKO-01",
            "city_compatibility": ["lucknow"],
        },
        "lucknow_heatwave_surge": {
            "label": "Gangetic Plain Heatwave (+30% Surge)",
            "description": "Peak summer temperature drives civic demand up by +30% across Lucknow administrative zones.",
            "category": "demand_surge",
            "severity": "MODERATE",
            "simulated_condition": "Demand multiplier 1.30x across state capital",
            "expected_impact": "Distribution piping bottlenecked at capacity ceiling; 13.8 MLD unmet deficit",
            "asset_factor": {},
            "link_factor": {},
            "demand_factor": 1.3,
            "failed_asset": None,
            "city_compatibility": ["lucknow"],
        },
        "lucknow_pipeline_rupture": {
            "label": "Hazratganj Trunk Pipeline Burst: LK-03",
            "description": "Main feeder conduit LK-03 (P-LKO-01 → LKO-Z01) ruptures at Vidhan Sabha Marg.",
            "category": "pipeline_disruption",
            "severity": "HIGH",
            "simulated_condition": "Link LK-03 severed to 0 MLD throughput",
            "expected_impact": "Administrative Core (LKO-Z01) loses all pipe delivery (9.0 MLD deficit); P-LKO-01 feeds Alambagh",
            "asset_factor": {},
            "link_factor": {"LK-03": 0.0},
            "demand_factor": 1.0,
            "failed_asset": None,
            "failed_link": "LK-03",
            "city_compatibility": ["lucknow"],
        },
        "lucknow_dual_pump": {
            "label": "Trans-Gomti & Hazratganj Dual Pump Outage",
            "description": "Grid voltage surge knocks out both P-LKO-01 (20 MLD) and P-LKO-02 (16 MLD) simultaneously.",
            "category": "multiple_asset_failure",
            "severity": "CRITICAL",
            "simulated_condition": "P-LKO-01 (0 MLD) and P-LKO-02 (0 MLD) both offline",
            "expected_impact": "Complete shutdown of municipal pipeline delivery across all 4 zones; 32.0 MLD deficit",
            "asset_factor": {"P-LKO-01": 0.0, "P-LKO-02": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-LKO-01, P-LKO-02",
            "city_compatibility": ["lucknow"],
        },
        "lucknow_trans_gomti_pump": {
            "label": "Trans-Gomti Pumping Failure",
            "description": "Secondary pump P-LKO-02 offline (0 of 16 MLD). Supply cut off to Gomti Nagar and Indira Nagar.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "P-LKO-02 offline (0.0 / 16.0 MLD)",
            "expected_impact": "Supply severed to Gomti Nagar & Indira Nagar; 18.0 MLD deficit",
            "asset_factor": {"P-LKO-02": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-LKO-02",
            "city_compatibility": ["lucknow"],
        },
    },
)

# =====================================================================
# 5. BENGALURU (Karnataka)
# =====================================================================
BENGALURU = CityTopology(
    id="bengaluru",
    name="Bengaluru",
    state="Karnataka",
    description="Southern technology hub lifting water 100 km from Cauvery Stage IV with high elevation pumping stages.",
    tanker_fleet=14,
    zones=[
        ZoneDef("BLR-Z01", "Koramangala & CBD Zone", 24000, "high", 11.0),
        ZoneDef("BLR-Z02", "HSR Layout & BTM Enclave", 22000, "medium", 10.0),
        ZoneDef("BLR-Z03", "Whitefield Tech Hub & Hospitals", 28000, "high", 12.0),
        ZoneDef("BLR-Z04", "Indiranagar Residential", 16000, "low", 7.0),
    ],
    assets=[
        AssetDef("SRC-BLR-01", "Cauvery Stage IV Feeder", "source", 48.0),
        AssetDef("TP-BLR-01", "T.K. Halli Purification Plant", "treatment", 40.0),
        AssetDef("P-BLR-01", "South Bengaluru Main Lifting Station", "pump", 22.0),
        AssetDef("P-BLR-02", "East Tech Corridor Booster Station", "pump", 18.0),
    ],
    links=[
        LinkDef("BL-01", "SRC-BLR-01", "TP-BLR-01", 40.0),
        LinkDef("BL-02", "TP-BLR-01", "P-BLR-01", 22.0),
        LinkDef("BL-03", "P-BLR-01", "BLR-Z01", 11.0),
        LinkDef("BL-04", "P-BLR-01", "BLR-Z02", 10.0),
        LinkDef("BL-05", "TP-BLR-01", "P-BLR-02", 18.0),
        LinkDef("BL-06", "P-BLR-02", "BLR-Z03", 11.0),
        LinkDef("BL-07", "P-BLR-02", "BLR-Z04", 7.0),
    ],
    reservoirs=[
        ReservoirDef("BLR-R1", "TK Halli Master Reservoir", "Koramangala & CBD Zone", 5000.0, 3900.0, 44.0, 42.0),
        ReservoirDef("BLR-R2", "Whitefield Ground Level Sump", "Whitefield Tech Hub & Hospitals", 4200.0, 920.0, 14.0, 38.0),
        ReservoirDef("BLR-R3", "Koramangala Master Sump", "HSR Layout & BTM Enclave", 3600.0, 2750.0, 30.0, 28.0),
        ReservoirDef("BLR-R4", "Indiranagar GLR", "Indiranagar Residential", 2800.0, 2100.0, 23.0, 21.0),
    ],
    scenarios={
        "blr_booster_trip": {
            "label": "East Tech Corridor Booster Trip",
            "description": "Booster pump P-BLR-02 fails (0 of 18 MLD). Whitefield Tech Hub and Indiranagar cut off.",
            "category": "pump_failure",
            "severity": "HIGH",
            "simulated_condition": "P-BLR-02 offline (0.0 / 18.0 MLD)",
            "expected_impact": "Downstream flow cut off to Whitefield (BLR-Z03) and Indiranagar (BLR-Z04); 19.0 MLD deficit",
            "asset_factor": {"P-BLR-02": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-BLR-02",
            "city_compatibility": ["bengaluru"],
        },
        "blr_wtp_derating": {
            "label": "T.K. Halli Inflow Clarifier Derate",
            "description": "Cauvery intake high turbidity derates T.K. Halli purification plant to 55% (22.0 of 40 MLD).",
            "category": "treatment_reduction",
            "severity": "HIGH",
            "simulated_condition": "TP-BLR-01 constricted to 22.0 MLD (55% throughput)",
            "expected_impact": "Bulk purification deficit choking both booster stages; 18.0 MLD municipal shortage",
            "asset_factor": {"TP-BLR-01": 0.55},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "TP-BLR-01",
            "city_compatibility": ["bengaluru"],
        },
        "blr_summer_deficit": {
            "label": "Pre-Monsoon Peak Deficit (+30% Surge)",
            "description": "Rapid commercial and hospital demand surge increases municipal water demand by +30% across Bengaluru zones.",
            "category": "demand_surge",
            "severity": "MODERATE",
            "simulated_condition": "Demand multiplier 1.30x across technology and residential clusters",
            "expected_impact": "Lifting pipelines pushed past hydraulic capacity limits; 14.0 MLD shortfall",
            "asset_factor": {},
            "link_factor": {},
            "demand_factor": 1.3,
            "failed_asset": None,
            "city_compatibility": ["bengaluru"],
        },
        "blr_pipeline_rupture": {
            "label": "Koramangala CBD Transmission Burst: BL-03",
            "description": "High-pressure transmission line BL-03 (P-BLR-01 → BLR-Z01) ruptures along Hosur Road.",
            "category": "pipeline_disruption",
            "severity": "HIGH",
            "simulated_condition": "Link BL-03 flow constricted to 0 MLD",
            "expected_impact": "Koramangala & CBD completely cut off from pipe supply (11.0 MLD deficit); P-BLR-01 feeds HSR Layout",
            "asset_factor": {},
            "link_factor": {"BL-03": 0.0},
            "demand_factor": 1.0,
            "failed_asset": None,
            "failed_link": "BL-03",
            "city_compatibility": ["bengaluru"],
        },
        "blr_compound_failure": {
            "label": "Cauvery Lifting Cascade & Booster Fault",
            "description": "Simultaneous grid blackout trips both South Lifting Station P-BLR-01 and Tech Booster P-BLR-02.",
            "category": "multiple_asset_failure",
            "severity": "CRITICAL",
            "simulated_condition": "P-BLR-01 (0 MLD) and P-BLR-02 (0 MLD) both offline",
            "expected_impact": "Total collapse of piped municipal supply across all 4 IT and residential zones (40.0 MLD deficit)",
            "asset_factor": {"P-BLR-01": 0.0, "P-BLR-02": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-BLR-01, P-BLR-02",
            "city_compatibility": ["bengaluru"],
        },
        "blr_lifting_station": {
            "label": "South Bengaluru Lifting Station Fault",
            "description": "Main lift pump P-BLR-01 trips (0 of 22 MLD). Koramangala and HSR Layout supply severed.",
            "category": "pump_failure",
            "severity": "CRITICAL",
            "simulated_condition": "Main lift pump P-BLR-01 offline (0.0 / 22.0 MLD)",
            "expected_impact": "Piped delivery severed to Koramangala (BLR-Z01) and HSR Layout (BLR-Z02); 21.0 MLD shortage",
            "asset_factor": {"P-BLR-01": 0.0},
            "link_factor": {},
            "demand_factor": 1.0,
            "failed_asset": "P-BLR-01",
            "city_compatibility": ["bengaluru"],
        },
    },
)

# Map of all supported cities
CITY_TOPOLOGIES: Dict[str, CityTopology] = {
    "greater_noida": GREATER_NOIDA,
}

def get_city_topology(city_id: str = "greater_noida") -> CityTopology:
    return CITY_TOPOLOGIES.get(city_id.lower(), GREATER_NOIDA)

def list_supported_cities() -> List[Dict[str, Any]]:
    return [
        {
            "id": c.id,
            "name": c.name,
            "state": c.state,
            "description": c.description,
            "tanker_fleet": c.tanker_fleet,
            "zone_count": len(c.zones),
            "asset_count": len(c.assets),
            "default_scenario": next(iter(c.scenarios.keys())),
        }
        for c in CITY_TOPOLOGIES.values()
    ]

# Backward compatibility bindings (defaults to Greater Noida)
ZONES: List[ZoneDef] = GREATER_NOIDA.zones
ASSETS: List[AssetDef] = GREATER_NOIDA.assets
LINKS: List[LinkDef] = GREATER_NOIDA.links
RESERVOIRS: List[ReservoirDef] = GREATER_NOIDA.reservoirs
TANKER_FLEET = GREATER_NOIDA.tanker_fleet
TANKER_MLD = 0.5  # MLD per tanker

PRIORITY_RANK: Dict[PriorityType, int] = {"high": 3, "medium": 2, "low": 1}

def zone_label(zid: str, city_id: str = "greater_noida") -> str:
    top = get_city_topology(city_id)
    for z in top.zones:
        if z.id == zid:
            return f"{z.id} {z.name}"
    # Fallback search across all cities
    for top in CITY_TOPOLOGIES.values():
        for z in top.zones:
            if z.id == zid:
                return f"{z.id} {z.name}"
    return zid
