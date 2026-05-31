# RNN vs Transformer Demo

> **Note:** Attention weights and hidden states are shown as normalized visualization projections. Metrics are heuristic trend proxies clamped to [0,1] — not semantic ground truth.

## Architecture

- **Frontend** — React + Vite + Context API (`frontend/`)
- **Backend** — FastAPI + PyTorch + HuggingFace BERT (`backend/`)

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

First run downloads `bert-base-uncased` weights (~440 MB).

## Models

- **RNN** — `nn.Embedding` + `nn.LSTM(64, 128)`, randomly initialized (demo only, not trained)
- **Transformer** — `bert-base-uncased` with self-attention exposed (no fine-tuning)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to the backend.

## UX flow

1. Enter text and click **Analyze**
2. Watch tokens appear one by one
3. Split view: RNN hidden-state animation (left) vs transformer attention heatmap (right)
4. Trend proxy metrics (local / spread / long-range patterns) on each side — normalized visualization helpers, not linguistic scores

## Documentation

| File                                                           | Purpose                               |
| -------------------------------------------------------------- | ------------------------------------- |
| [README.md](README.md)                                         | Setup and quick start (this file)     |
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)                   | Code walkthrough, data flow, file map |
| [frontend/public/examples.json](frontend/public/examples.json) | Sample sentences for **Load example** |
| [frontend/src/locales/](frontend/src/locales/)                 | UI translations (en, zh-CN)           |
