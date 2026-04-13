from chromadb.api.types import EmbeddingFunction
from chromadb.types import Metadata
from pathlib import Path
from typing import List, Optional, Union
import json as _json

DATA_DIR = Path(__file__).parent.parent / "data"


class SentenceTransformerEmbedding(EmbeddingFunction):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(model_name)

    def __call__(self, input_texts: Union[str, List[str]]) -> List[List[float]]:
        if isinstance(input_texts, str):
            input_texts = [input_texts]
        return self._model.encode(input_texts).tolist()


class MaritimeKnowledgeBase:
    def __init__(
        self,
        persist_directory: Optional[str] = None,
        collection_name: str = "maritime_knowledge",
        embedding_function: Optional[EmbeddingFunction] = None,
    ):
        import chromadb

        if persist_directory:
            self.client = chromadb.PersistentClient(path=persist_directory)
        else:
            self.client = chromadb.EphemeralClient()

        self.ef = embedding_function or SentenceTransformerEmbedding()
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.ef,
        )
        self._load_data()

    def _load_data(self) -> None:
        docs: List[str] = []
        ids: List[str] = []
        metadatas: List[Metadata] = []

        try:
            with open(DATA_DIR / "disruptions.json") as f:
                for d in _json.load(f):
                    doc_id = d["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(d)}")
                    ids.append(doc_id)
                    metadatas.append({"type": "disruption_event", "chokepoint": d.get("chokepoint", "")})
        except FileNotFoundError:
            pass

        try:
            with open(DATA_DIR / "ports.json") as f:
                for p in _json.load(f):
                    doc_id = "port_" + p["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(p)}")
                    ids.append(doc_id)
                    metadatas.append({"type": "port", "name": p["name"]})
        except FileNotFoundError:
            pass

        try:
            with open(DATA_DIR / "carriers.json") as f:
                for c in _json.load(f):
                    doc_id = "carrier_" + c["id"]
                    docs.append(f"[ID:{doc_id}] {_json.dumps(c)}")
                    ids.append(doc_id)
                    metadatas.append({"type": "carrier", "name": c["name"]})
        except FileNotFoundError:
            pass

        if docs:
            self.collection.add(documents=docs, ids=ids, metadatas=metadatas)

    def retrieve(self, query: str, n_results: int = 3) -> List[dict]:
        if not query.strip() or not self.collection.count():
            return []
        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results, self.collection.count()),
            include=["documents", "metadatas"],
        )
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        if not docs:
            return []
        return [
            {"id": self._extract_id(doc), "content": doc, "metadata": meta}
            for doc, meta in zip(docs, metas)
        ]

    def _extract_id(self, doc: str) -> str:
        start = doc.index("[ID:") + 4
        end = doc.index("]", start)
        return doc[start:end]
