import warnings
warnings.filterwarnings("ignore", message=".*urllib3.*")
warnings.filterwarnings("ignore", message=".*capture.*")

from pathlib import Path
from typing import List, Optional
import json as _json
import numpy as np

DATA_DIR = Path(__file__).parent.parent / "data"


class MaritimeKnowledgeBase:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(model_name)
        self._documents: List[str] = []
        self._metadatas: List[dict] = []
        self._embeddings: Optional[np.ndarray] = None
        self._load_data()

    def _load_data(self) -> None:
        docs: List[str] = []
        metadatas: List[dict] = []

        try:
            with open(DATA_DIR / "disruptions.json") as f:
                for d in _json.load(f):
                    doc_id = d["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(d)}")
                    metadatas.append({"type": "disruption_event", "chokepoint": d.get("chokepoint", "")})
        except FileNotFoundError:
            pass

        try:
            with open(DATA_DIR / "ports.json") as f:
                for p in _json.load(f):
                    doc_id = "port_" + p["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(p)}")
                    metadatas.append({"type": "port", "name": p["name"]})
        except FileNotFoundError:
            pass

        try:
            with open(DATA_DIR / "carriers.json") as f:
                for c in _json.load(f):
                    doc_id = "carrier_" + c["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(c)}")
                    metadatas.append({"type": "carrier", "name": c["name"]})
        except FileNotFoundError:
            pass

        try:
            with open(DATA_DIR / "routes.json") as f:
                for r in _json.load(f):
                    doc_id = "route_" + r["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(r)}")
                    metadatas.append({"type": "route", "name": r["name"]})
        except FileNotFoundError:
            pass

        if docs:
            self._documents = docs
            self._metadatas = metadatas
            self._embeddings = self._model.encode(docs, normalize_embeddings=True)

    def retrieve(self, query: str, n_results: int = 3) -> List[dict]:
        if not query.strip() or self._embeddings is None or len(self._documents) == 0:
            return []
        query_embedding = self._model.encode([query], normalize_embeddings=True)
        scores = (query_embedding @ self._embeddings.T).flatten()
        top_k = min(n_results, len(self._documents))
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [
            {"id": self._extract_id(self._documents[i]), "content": self._documents[i], "metadata": self._metadatas[i]}
            for i in top_indices
        ]

    def _extract_id(self, doc: str) -> str:
        start = doc.index("[ID:") + 4
        end = doc.index("]", start)
        return doc[start:end]
