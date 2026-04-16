CHOKEPOINT_ALIASES = {
    "suez": "suez_canal",
    "suez canal": "suez_canal",
    "the canal": "suez_canal",
    "hormuz": "strait_of_hormuz",
    "strait of hormuz": "strait_of_hormuz",
    "hormuz strait": "strait_of_hormuz",
    "persian gulf": "strait_of_hormuz",
    "malacca": "strait_of_malacca",
    "strait of malacca": "strait_of_malacca",
    "malacca strait": "strait_of_malacca",
    "panama": "panama_canal",
    "panama canal": "panama_canal",
    "bab el-mandeb": "bab_el_mandeb",
    "bab el mandeb": "bab_el_mandeb",
    "bab elmandeb": "bab_el_mandeb",
    "red sea": "bab_el_mandeb",
    "bosporus": "bosporus",
    "turkish straits": "bosporus",
    "istanbul strait": "bosporus",
    "dardanelles": "bosporus",
}

PORT_ALIASES = {
    "rotterdam": "rotterdam",
    "hamburg": "hamburg",
    "antwerp": "antwerp",
    "singapore": "singapore",
    "shanghai": "shanghai",
    "shenzhen": "shenzhen",
    "hong kong": "hong_kong",
    "busan": "busan",
    "dubai": "dubai",
    "jebel ali": "dubai",
    "fujairah": "fujairah",
    "los angeles": "los_angeles",
    "long beach": "long_beach",
    "new york": "new_york",
    "piraeus": "piraeus",
    "istanbul": "istanbul",
    "mumbai": "mumbai",
    "colon": "colon",
    "colombo": "colombo",
    "jeddah": "jeddah",
}

CARRIER_ALIASES = {
    "maersk": "maersk",
    "msc": "msc",
    "mediterranean shipping": "msc",
    "cma cgm": "cma_cgm",
    "cma": "cma_cgm",
    "cosco": "cosco",
    "hapag-lloyd": "hapag_lloyd",
    "hapag lloyd": "hapag_lloyd",
    "ocean network express": "one",
    "evergreen": "evergreen",
    "yang ming": "yang_ming",
    "zim": "zim",
    "pil": "pil",
}

SEVERITY_KEYWORDS = {
    "full": ["full blockage", "full closure", "completely blocked", "total closure", "shut down", "shut down completely", "completely shut"],
    "temporary": ["temporary", "maintenance", "brief", "short-term", "reopening soon", "brief closure"],
    "partial": ["partial", "reduced capacity", "restricted", "attacks", "houthi", "drone", "missile", "disrupted"],
}


def _find_entities(text: str, alias_dict: dict) -> list[str]:
    lower = text.lower()
    found = set()
    for alias, canonical in alias_dict.items():
        if alias in lower:
            found.add(canonical)
    return sorted(found)


def _detect_severity(text: str, has_chokepoints: bool) -> str:
    lower = text.lower()
    for level, keywords in SEVERITY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return level
    if has_chokepoints:
        return "partial"
    return "partial"


def extract_entities(message: str) -> dict:
    chokepoints = _find_entities(message, CHOKEPOINT_ALIASES)
    ports = _find_entities(message, PORT_ALIASES)
    carriers = _find_entities(message, CARRIER_ALIASES)
    severity = _detect_severity(message, bool(chokepoints))
    return {
        "chokepoints": chokepoints,
        "ports": ports,
        "carriers": carriers,
        "severity": severity,
    }
