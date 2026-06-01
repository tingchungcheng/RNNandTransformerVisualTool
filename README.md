# RNN vs Transformer Demo

> **Note:** Attention weights and hidden states are normalized visualization projections. Structure probes and heatmaps illustrate internal geometry — not semantic ground truth. Use **val perplexity** for model quality.

## Architecture

- **Frontend** — React + Vite + Context API (`frontend/`)
- **Backend** — FastAPI + PyTorch + tiny trained LSTM / Transformer (`backend/`)

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

First run downloads the BERT **tokenizer** only (~few MB). Trained model weights are included in `backend/checkpoints/`.

## Models

Both models are **trained on WikiText-2** for next-token prediction (BERT tokenizer vocab):

| Model | Architecture | Training |
|-------|-------------|----------|
| **LSTM** | Embedding 64, Hidden 128, 1 layer | `python -m training.train` |
| **Transformer** | Embedding 64, 4 heads, 2 layers, FFN 256 | same script |

Pre-trained checkpoints are included in `backend/checkpoints/` (~38 MB). Re-run training to fine-tune or replace them.

### Training data (local, no Hub required)

Place WikiText-2 raw files in the repo root or `backend/data/`:

| File | Required |
|------|----------|
| `wiki.train.raw` | Yes |
| `wiki.valid.raw` | Optional (if missing, last 10% of train lines is used for validation) |

Then train locally:

```bash
python -m training.train                  # auto: GPU if available
python -m training.train --device cuda    # force GPU
python -m training.train --device cpu     # force CPU
```

### GPU / CUDA

Training uses CUDA automatically when available (`--device auto`, the default). Your venv must have a **CUDA-enabled PyTorch** build — the default `pip install torch` often installs CPU-only wheels.

```bash
# Example: CUDA 12.4 (pick the wheel that matches your driver — see pytorch.org)
pip install torch --index-url https://download.pytorch.org/whl/cu124
```

Verify GPU is visible:

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

For API inference on GPU, set `TORCH_DEVICE=cuda` before starting uvicorn.

The BERT tokenizer (`bert-base-uncased`) is still downloaded once on first run unless already cached.

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
4. Next-token predictions (val PPL comparison) and structure probes on each side

## Documentation

| File                                                           | Purpose                               |
| -------------------------------------------------------------- | ------------------------------------- |
| [README.md](README.md)                                         | Setup and quick start (this file)     |
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)                   | Code walkthrough, data flow, file map |
| [frontend/public/examples.json](frontend/public/examples.json) | Sample sentences for **Load example** |
| [frontend/src/locales/](frontend/src/locales/)                 | UI translations (en, zh-CN)           |
