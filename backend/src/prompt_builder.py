from typing import Optional

from src.simulator import SimulationResult


def _format_globe_entities(globe_entities: list[str]) -> str:
    return repr(globe_entities)


def build_prompt(
    user_message: str,
    simulation: SimulationResult,
    rag_context: str = "",
    globe_entities: Optional[list[str]] = None,
) -> str:
    sim_dict = simulation.to_dict()
    globe_entities = globe_entities or sim_dict["scenario"]["chokepoints"]
    globe_entities_text = _format_globe_entities(globe_entities)

    rerouting_lines = []
    for alt in sim_dict["rerouting"]["alternatives"]:
        rerouting_lines.append(
            f"  - Route {alt['route_id']}: +{alt['additional_days']} days, "
            f"+${alt['additional_cost_usd']:,.0f} additional cost, "
            f"{alt['vessels_affected']} vessels affected"
        )
    rerouting_text = "\n".join(rerouting_lines) if rerouting_lines else "  No alternative routes available."

    carriers_lines = []
    for c in sim_dict["carriers"][:5]:
        carriers_lines.append(
            f"  - {c['name']} (ID: {c['carrier_id']}): exposure {c['exposure_score']}, "
            f"{c['routes_exposed']} routes exposed, "
            f"${c['estimated_daily_risk_usd']:,.0f}/day estimated risk"
        )
    carriers_text = "\n".join(carriers_lines) if carriers_lines else "  No carriers significantly exposed."

    congestion_lines = []
    for p in sim_dict["port_congestion"][:5]:
        congestion_lines.append(
            f"  - {p['port_id']}: baseline {p['baseline_congestion']:.2f} "
            f"→ forecast {p['forecast_congestion']:.2f} "
            f"(+{p['dwell_increase_hours']:.1f}h dwell)"
        )
    congestion_text = "\n".join(congestion_lines) if congestion_lines else "  No significant port congestion."

    timeline_lines = []
    for entry in sim_dict["cascade"]["impact_timeline"][:5]:
        timeline_lines.append(f"  - {entry['port']}: +{entry['hours_to_impact']}h")
    timeline_text = "\n".join(timeline_lines) if timeline_lines else "  No cascade timeline available."

    rag_section = (
        f"## Reference Material\n{rag_context}\n"
        if rag_context
        else "## Reference Material\nNo additional reference material available.\n"
    )

    return f"""You are a maritime supply chain analyst. Answer the user's question using the simulation data and reference material below.

## User Question
{user_message}

## Simulation Data

### Scenario
- Blocked chokepoints: {', '.join(sim_dict['scenario']['chokepoints'])}
- Severity: {sim_dict['scenario']['severity']}
- Vessels affected: {sim_dict['scenario']['affected_vessels']}

### Rerouting Alternatives
{rerouting_text}

### Carrier Exposure
{carriers_text}

### Port Congestion Forecast
{congestion_text}

### Cascade Impact Timeline
{timeline_text}

{rag_section}## OpenUI Lang Syntax
You MUST respond using OpenUI Lang. Every response must start with:
root = Stack([...])

Available components:
- Stack(children: list) — vertical layout container
- ImpactStats(vessels: int, routes: int, cost_usd: int) — high-level metrics grid
- CarrierTable(carriers: list[dict]) — carrier exposure ranking with name and exposure score
- ReroutingCard(route_id: str, additional_days: int, additional_cost_usd: int, vessels_affected: int) — route alternative info
- PortCongestion(port_id: str, baseline: float, forecast: float, dwell_increase_hours: float) — port congestion forecast
- CascadeTimeline(timeline: list[dict]) — port impact timeline with hours_to_impact
- GlobeVersion(version: int, entities: list[str]) — trigger globe visualization (always use version=1)
- TextBlock(text: str) — narrative text explanation

Syntax rules:
1. ALWAYS start with: root = Stack([...])
2. Use TextBlock for narrative text: TextBlock(text="Your explanation here")
3. Use GlobeVersion for spatial references: GlobeVersion(version=1, entities=["suez_canal"])
4. Combine components in a Stack: root = Stack([TextBlock(text="..."), ImpactStats(vessels=125, routes=47, cost_usd=2400000)])
5. Arguments are POSITIONAL — do NOT use keyword: syntax

Example:
root = Stack([
  TextBlock(text="The Suez blockage affects " + str(vessels) + " vessels..."),
  ImpactStats(vessels={sim_dict['scenario']['affected_vessels']}, routes=47, cost_usd=2_400_000),
  GlobeVersion(version=1, entities={globe_entities_text})
])

## Spatial Entities
Use these exact entity ids when rendering GlobeVersion:
{globe_entities_text}

## Output Format
IMPORTANT: Your ENTIRE response must be valid OpenUI Lang starting with root = Stack([...]). Do NOT output plain text, markdown, or explanations outside of OpenUI Lang syntax.
Use specific numbers from the simulation data above. Be concise and factual.
"""
