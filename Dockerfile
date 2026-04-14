FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV GDAL_CONFIG=/usr/bin/gdal-config

WORKDIR /app

COPY backend/requirements.txt .

RUN pip install --no-cache-dir torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt \
    && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" \
    && apt-get update && apt-get remove -y build-essential gcc g++ cpp && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "src.provider:app", "--host", "0.0.0.0", "--port", "8000"]