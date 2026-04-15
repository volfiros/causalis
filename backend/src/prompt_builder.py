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

Available components (arguments are POSITIONAL, in the order shown below):
- Stack(children) — vertical layout container. children is a list of components.
- TextBlock(text) — narrative text. text is a string.
- ImpactStats(vessels, routes, cost_usd) — metrics grid. vessels, routes are ints, cost_usd is an int in USD.
- CarrierTable(carriers) — carrier exposure ranking. carriers is a list of objects with "name" and "exposure" keys.
- ReroutingCard(route_id, additional_days, additional_cost_usd, vessels_affected) — route alternative info. route_id is a string, days and cost are ints.
- PortCongestion(port_id, baseline, forecast, dwell_increase_hours) — port congestion. port_id is a string, baseline and forecast are floats, dwell_increase_hours is a float.
- CascadeTimeline(timeline) — impact timeline. timeline is a list of objects with "port" and "hours_to_impact" keys.
- GlobeVersion(version, entities) — trigger globe visualization. version is an int (always use 1), entities is a list of entity id strings.

Syntax rules:
1. ALWAYS start with: root = Stack([...])
2. Arguments are POSITIONAL — pass values in the exact order shown above. Do NOT use key=value syntax.
3. Use GlobeVersion for spatial references: GlobeVersion(1, ["suez_canal"])
4. Combine components in a Stack: root = Stack([TextBlock("The Suez blockage affects 125 vessels."), ImpactStats(125, 47, 2400000)])
5. Never use string concatenation (+) inside component arguments — put the full text in a single string

Example:
root = Stack([
  TextBlock("The Suez blockage affects 125 vessels."),
  ImpactStats(125, 47, 2400000),
  GlobeVersion(1, ["suez_canal"])
])

## Spatial Entities
Use these exact entity ids when rendering GlobeVersion:
{globe_entities_text}

## Output Format
IMPORTANT: Your ENTIRE response must be valid OpenUI Lang starting with root = Stack([...]). Do NOT output plain text, markdown, or explanations outside of OpenUI Lang syntax.
Use specific numbers from the simulation data above. Be concise and factual.
"""
