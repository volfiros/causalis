import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"


def load_ports() -> pd.DataFrame:
    with open(DATA_DIR / "ports.json") as f:
        data = json.load(f)
    return pd.DataFrame(data)


def load_chokepoints() -> gpd.GeoDataFrame:
    return gpd.read_file(DATA_DIR / "chokepoints.geojson")


def load_vessels() -> pd.DataFrame:
    with open(DATA_DIR / "vessels.json") as f:
        data = json.load(f)
    return pd.DataFrame(data)


def load_carriers() -> pd.DataFrame:
    with open(DATA_DIR / "carriers.json") as f:
        data = json.load(f)
    return pd.DataFrame(data)


def load_routes() -> pd.DataFrame:
    with open(DATA_DIR / "routes.json") as f:
        data = json.load(f)
    return pd.DataFrame(data)
