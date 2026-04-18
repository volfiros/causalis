import re
from typing import Dict, Optional
from rapidfuzz import fuzz

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
    "full": [
        "full blockage",
        "full closure",
        "completely blocked",
        "total closure",
        "shut down",
        "shut down completely",
        "completely shut",
    ],
    "temporary": [
        "temporary",
        "maintenance",
        "brief",
        "short-term",
        "reopening soon",
        "brief closure",
    ],
    "partial": [
        "partial",
        "reduced capacity",
        "restricted",
        "attacks",
        "houthi",
        "drone",
        "missile",
        "disrupted",
    ],
}

FUZZY_THRESHOLD = 75

_MIN_TOKEN_LENGTH = 3

_STOP_WORDS = frozenset(
    {
        "the",
        "and",
        "for",
        "are",
        "but",
        "not",
        "you",
        "all",
        "can",
        "had",
        "her",
        "was",
        "one",
        "our",
        "out",
        "has",
        "have",
        "been",
        "from",
        "this",
        "that",
        "with",
        "they",
        "will",
        "what",
        "when",
        "make",
        "like",
        "just",
        "over",
        "such",
        "take",
        "than",
        "them",
        "very",
        "does",
        "into",
        "also",
        "some",
        "could",
        "would",
        "should",
        "about",
        "which",
        "their",
        "there",
        "these",
        "those",
        "being",
        "after",
        "before",
        "between",
        "through",
        "during",
        "without",
    }
)

_PHONETIC_MAP: Optional[Dict[str, Dict[str, str]]] = None


def _metaphone(word: str) -> str:
    code = []
    i = 0
    w = word.upper()
    n = len(w)
    if n == 0:
        return ""

    if w[0] in ("A", "E", "I", "O", "U"):
        code.append("A")
    elif w[0] == "K" or w[0] == "J":
        code.append("K")
    elif w[0] == "G":
        code.append("K")
    elif w[0] == "P":
        code.append("P")
    elif w[0] == "B":
        code.append("P")
    elif w[0] in ("S", "Z", "C"):
        code.append("S")
    elif w[0] == "T" or w[0] == "D":
        code.append("T")
    elif w[0] == "F" or w[0] == "V":
        code.append("F")
    elif w[0] == "M" or w[0] == "N":
        code.append("M")
    elif w[0] == "L":
        code.append("L")
    elif w[0] == "R":
        code.append("R")
    elif w[0] == "H":
        code.append("H")
    else:
        code.append(w[0])

    i = 1
    while i < n and len(code) < 6:
        c = w[i]
        if c in ("A", "E", "I", "O", "U"):
            i += 1
            continue
        if c in ("B", "P", "F", "V"):
            code.append(c)
        elif c in ("C", "S", "K", "G", "J", "Q", "X", "Z"):
            code.append("S")
        elif c in ("D", "T"):
            code.append("T")
        elif c == "L":
            code.append("L")
        elif c in ("M", "N"):
            code.append("M")
        elif c == "R":
            code.append("R")
        elif c == "H":
            code.append("H")
        i += 1

    return "".join(code)


def _build_phonetic_map(alias_dict: dict) -> Dict[str, str]:
    mapping: dict[str, str] = {}
    for alias, canonical in alias_dict.items():
        tokens = alias.split()
        for token in tokens:
            ph = _metaphone(token)
            if ph and ph not in mapping:
                mapping[ph] = canonical
    return mapping


def _get_phonetic_maps() -> Dict[str, Dict[str, str]]:
    global _PHONETIC_MAP
    if _PHONETIC_MAP is None:
        _PHONETIC_MAP = {
            "chokepoints": _build_phonetic_map(CHOKEPOINT_ALIASES),
            "ports": _build_phonetic_map(PORT_ALIASES),
            "carriers": _build_phonetic_map(CARRIER_ALIASES),
        }
    return _PHONETIC_MAP


def _extract_tokens(text: str) -> list[str]:
    return re.findall(r"\b[a-z]+\b", text.lower())


def _extract_phrases(text: str, max_words: int = 3) -> list[str]:
    words = _extract_tokens(text)
    phrases: list[str] = []
    for length in range(2, max_words + 1):
        for i in range(len(words) - length + 1):
            phrases.append(" ".join(words[i : i + length]))
    return phrases


def _find_entities(
    text: str, alias_dict: dict, phonetic_map: Optional[dict] = None
) -> list:
    lower = text.lower()
    found = set()

    for alias, canonical in alias_dict.items():
        if alias in lower:
            found.add(canonical)

    tokens = _extract_tokens(lower)
    phrases = _extract_phrases(lower, max_words=3)
    candidates = [
        t for t in tokens if t not in _STOP_WORDS and len(t) >= _MIN_TOKEN_LENGTH
    ] + phrases

    for alias, canonical in alias_dict.items():
        if canonical in found:
            continue
        for candidate in candidates:
            score = fuzz.ratio(candidate, alias)
            if score >= FUZZY_THRESHOLD:
                found.add(canonical)
                break

    if not found and phonetic_map:
        for token in tokens:
            if len(token) < _MIN_TOKEN_LENGTH or token in _STOP_WORDS:
                continue
            ph = _metaphone(token)
            if ph in phonetic_map:
                found.add(phonetic_map[ph])

    return sorted(found)


def _detect_severity(text: str, has_chokepoints: bool) -> str:
    lower = text.lower()
    for level, keywords in SEVERITY_KEYWORDS.items():
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower):
                return level
    if has_chokepoints:
        return "partial"
    return "partial"


def extract_entities(message: str) -> dict:
    maps = _get_phonetic_maps()
    chokepoints = _find_entities(message, CHOKEPOINT_ALIASES, maps["chokepoints"])
    ports = _find_entities(message, PORT_ALIASES, maps["ports"])
    carriers = _find_entities(message, CARRIER_ALIASES, maps["carriers"])
    severity = _detect_severity(message, bool(chokepoints))
    return {
        "chokepoints": chokepoints,
        "ports": ports,
        "carriers": carriers,
        "severity": severity,
    }
