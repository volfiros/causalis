import json

from src.simulator import SimulationResult


def build_prompt(user_message: str, simulation: SimulationResult, rag_context: str = "") -> str:
    sim_dict = simulation.to_dict()

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

{rag_section}## Output Format
Provide your analysis as a causal chain with these bullet points:
→ Vessel rerouting impact (how many vessels, where they go)
→ Transit time changes (additional days, affected routes)
→ Port congestion forecast (which ports, how much congestion increases)
→ Carrier exposure (most exposed carriers, financial risk)
→ Timeline (when impacts reach key ports)

Use specific numbers from the simulation data above. Be concise and factual.
"""
