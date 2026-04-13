from src.prompt_builder import build_prompt
from src.simulator import SimulationResult


def test_build_prompt_includes_globe_entities_in_openuI_instructions():
    simulation = SimulationResult(
        scenario={
            "chokepoints": ["suez_canal"],
            "severity": "full",
            "affected_vessels": 125,
        },
        rerouting={
            "alternatives": [
                {
                    "route_id": "cape_route",
                    "additional_days": 10,
                    "additional_cost_usd": 600000,
                    "vessels_affected": 12,
                }
            ]
        },
        carriers=[
            {
                "name": "MSC",
                "carrier_id": "msc",
                "exposure_score": 0.92,
                "routes_exposed": 4,
                "estimated_daily_risk_usd": 800000,
            }
        ],
        port_congestion=[
            {
                "port_id": "singapore",
                "baseline_congestion": 0.42,
                "forecast_congestion": 0.68,
                "dwell_increase_hours": 6.5,
            }
        ],
        cascade={
            "impact_timeline": [
                {
                    "port": "Singapore",
                    "hours_to_impact": 36,
                }
            ]
        },
    )

    prompt = build_prompt(
        "What if Suez Canal is blocked?",
        simulation,
        "",
        ["suez_canal", "singapore"],
    )

    assert "GlobeVersion(version=1, entities=['suez_canal', 'singapore'])" in prompt
    assert "GlobeVersion(version: int, entities: list[str])" in prompt
