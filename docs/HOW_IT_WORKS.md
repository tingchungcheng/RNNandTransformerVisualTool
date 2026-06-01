# How the code works

Educational demo: same text → tokenize once → run tiny trained LSTM and Transformer in parallel → visualize internals and next-token predictions in the browser.

## Big picture

```
User text
    │
    ▼
┌─────────────────────────────────────┐
│  FastAPI  POST /api/analyze         │
│  1. BERT tokenizer → token IDs      │
│  2. LSTM engine   → hidden states   │
│  3. TF engine     → attention       │
│  4. Both          → next-token top-k│
└─────────────────────────────────────┘
    │
    ▼
JSON response → React animates tokens, predictions, LSTM steps, attention heatmap
```

Both engines receive the **same** `input_ids` tensor so the split-screen comparison is aligned token-for-token.

---

## Backend

### Entry point — `backend/main.py`

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Liveness check |
| `POST /api/analyze` | Tokenize + run both engines |

Flow inside `analyze()`:

1. `encode_text(text)` — BERT WordPiece tokenization, max 64 tokens, adds `[CLS]` / `[SEP]`
2. Build `TokenInfo` list for the UI
3. `run_rnn(input_ids)` — LSTM hidden states + structure probes + next-token prediction
4. `run_transformer(input_ids)` — self-attention matrix + structure probes + next-token prediction
5. Return one JSON object (see `models/schemas.py`)

Models load **lazily** on first request from `backend/checkpoints/`.

### Models — `backend/models/`

| File | Role |
|------|------|
| `lstm_model.py` | Tiny LSTM (embed 64, hidden 128, 1 layer) + LM head |
| `transformer_model.py` | Tiny causal Transformer (2 layers, 4 heads, FFN 256) + LM head |
| `constants.py` | Hyperparameters, checkpoint paths, WikiText file locations |
| `schemas.py` | API request/response types |

### Training — `backend/training/`

```bash
cd backend
python -m training.train --device cuda --epochs 15
```

- `dataset.py` — loads `wiki.train.raw` locally (or HuggingFace fallback), tokenizes with BERT vocab
- `train.py` — trains both models, saves best val checkpoint to `backend/checkpoints/`
- Metrics written to `checkpoints/metrics.json` (val loss, val perplexity)

### Tokenizer — `backend/engines/tokenizer.py`

- Uses `bert-base-uncased` vocab for both models (30522 tokens)
- Shared encoding so LSTM and Transformer always see identical tokens

### RNN engine — `backend/engines/rnn_engine.py`

```
token IDs  →  TinyLSTM  →  hidden states [seq_len, 128]
                         →  next-token logits
```

Loads `checkpoints/lstm.pt`. Returns hidden states, structure probes, and top-5 next-token predictions.

### Transformer engine — `backend/engines/transformer_engine.py`

```
token IDs  →  TinyTransformer  →  last-layer attention [seq_len, seq_len]
                                →  next-token logits
```

Loads `checkpoints/transformer.pt`. Causal self-attention from the final layer (mean over heads).

### Structure probes (both sides)

**Not linguistic scores.** Compare **val perplexity** (prediction panel) for model quality.

| Probe | LSTM source | Transformer source |
|-------|-------------|---------------------|
| Step change / Adjacent attention | Step-to-step hidden-state change | Attention mass on adjacent tokens |
| Adjacent similarity / Attention focus | Consecutive hidden-state similarity | 1 − normalized row entropy |
| Late ↔ start alignment / Mean look-back distance | Late hidden states vs initial state | Normalized mean attention distance per query |

Probes are **architecture-specific** — do not compare bars side-by-side across columns.

### API response shape — `backend/models/schemas.py`

```json
{
  "tokens": [{ "id": 101, "text": "[CLS]" }, ...],
  "rnn": {
    "hidden_states": [[0.1, -0.3, ...], ...],
    "metrics": { "syntax": 0.09, "semantics": 0.97, "long_range": 0.44 },
    "prediction": { "top_k": [...], "val_perplexity": 2419.0 }
  },
  "transformer": {
    "attention": [[0.12, 0.08, ...], ...],
    "metrics": { "syntax": 0.10, "semantics": 0.29, "long_range": 0.25 },
    "prediction": { "top_k": [...], "val_perplexity": 2009.0 }
  }
}
```

---

## Frontend

### Dev proxy — `frontend/vite.config.ts`

Browser calls `/api/analyze` → Vite proxies to `http://localhost:8000`.

### State machine — `frontend/src/context/AppContext.tsx`

```
input  →  loading  →  tokenizing  →  results
  ↑                                      │
  └──────────── reset ───────────────────┘
```

### UI components

| File | Role |
|------|------|
| `TextInput.tsx` | Textarea + Analyze / Load example |
| `TokenAnimation.tsx` | Highlights tokens as they appear |
| `PredictionCompare.tsx` | Side-by-side next-token top-k + val PPL |
| `InfoFlowCompare.tsx` | Schematic RNN chain vs Transformer mesh |
| `RNNPanel.tsx` | LSTM step timeline + hidden-state preview |
| `TransformerPanel.tsx` | Attention heatmap |
| `MetricsPanel.tsx` | Architecture-specific structure probes |
| `SplitView.tsx` | Side-by-side layout |

### Types — `frontend/src/types/index.ts`

Mirrors the backend Pydantic models. Keep in sync when changing the API.

---

## File map

```
backend/
  main.py
  checkpoints/          # lstm.pt, transformer.pt, metrics.json (committed)
  models/
    lstm_model.py
    transformer_model.py
    constants.py
    schemas.py
  engines/
    tokenizer.py
    rnn_engine.py
    transformer_engine.py
    prediction.py
    device.py
  training/
    train.py
    dataset.py

frontend/src/
  App.tsx
  context/AppContext.tsx
  api/client.ts
  types/index.ts
  components/
```

---

## Common changes

**Retrain models** — `python -m training.train` from `backend/`; restart uvicorn to reload checkpoints.

**GPU inference** — set `TORCH_DEVICE=cuda` before starting uvicorn.

**Longer sequences** — raise `MAX_SEQ_LEN` in `tokenizer.py`; heatmap grows as seq_len².

**Faster/slower animations** — change intervals in `AppContext.tsx`.
