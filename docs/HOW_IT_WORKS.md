# How the code works

Educational demo: same text → tokenize once → run through an untrained LSTM and BERT in parallel → visualize internals in the browser.

## Big picture

```
User text
    │
    ▼
┌─────────────────────────────────────┐
│  FastAPI  POST /api/analyze         │
│  1. BERT tokenizer → token IDs      │
│  2. RNN engine  → hidden states     │
│  3. BERT model  → attention matrix  │
└─────────────────────────────────────┘
    │
    ▼
JSON response → React animates tokens, LSTM steps, attention heatmap
```

Both engines receive the **same** `input_ids` tensor so the split-screen comparison is aligned token-for-token.

---

## Backend

### Entry point — `backend/main.py`

Single analysis endpoint:

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Liveness check |
| `POST /api/analyze` | Tokenize + run both engines |

Flow inside `analyze()`:

1. `encode_text(text)` — BERT WordPiece tokenization, max 64 tokens, adds `[CLS]` / `[SEP]`
2. Build `TokenInfo` list for the UI (id + string like `the`, `##ing`, `[CLS]`)
3. `run_rnn(input_ids)` — LSTM hidden state per timestep
4. `run_transformer(input_ids)` — self-attention matrix
5. Return one JSON object (see `models/schemas.py`)

Models are loaded **lazily** on first request and cached in module globals.

### Tokenizer — `backend/engines/tokenizer.py`

- Uses `bert-base-uncased` for both engines
- `get_tokenizer()` — cached singleton (`@lru_cache`)
- `encode_text()` — shared encoding so RNN and Transformer always see identical tokens

### RNN engine — `backend/engines/rnn_engine.py`

**Not trained.** Goal is to show sequential computation, not accuracy.

```
token IDs  →  Embedding(30522, 64)  →  LSTM(64, 128)  →  hidden states
              (random init)              (random init)      shape: [seq_len, 128]
```

- `torch.manual_seed(42)` on first load so hidden states are reproducible across restarts
- `run_rnn()` returns:
  - `hidden_states`: list of 128-d vectors, one per token (including `[CLS]`/`[SEP]`)
  - `metrics`: heuristic scores derived from hidden-state dynamics (see below)

### Transformer engine — `backend/engines/transformer_engine.py`

Uses pretrained **BERT** (`bert-base-uncased`) only to expose real attention weights — no fine-tuning.

```
token IDs  →  BertModel  →  attentions (12 layers × 12 heads)
                              we take last layer, mean over heads
                              →  [seq_len, seq_len] matrix
```

- `attn_implementation="eager"` is required in Transformers v5+; SDPA backend does not return attention weights
- Cell `[i, j]` = how much token `i` attends to token `j`

### Metrics (both sides)

These are **visualization proxies**, not linguistic benchmarks:

| Metric | RNN intuition | Transformer intuition |
|--------|---------------|----------------------|
| **syntax** | How much hidden state changes step-to-step | Attention mass on adjacent tokens |
| **semantics** | Cosine similarity between consecutive hiddens | Inverse of attention entropy (peaked vs spread) |
| **long_range** | Final hidden vs mean of early hiddens | Last token attending to first half |

Values are clamped to `[0, 1]` for the progress bars in the UI.

### API response shape — `backend/models/schemas.py`

```json
{
  "tokens": [{ "id": 101, "text": "[CLS]" }, ...],
  "rnn": {
    "hidden_states": [[0.1, -0.3, ...], ...],
    "metrics": { "syntax": 0.65, "semantics": 0.79, "long_range": 0.74 }
  },
  "transformer": {
    "attention": [[0.12, 0.08, ...], ...],
    "metrics": { "syntax": 0.15, "semantics": 0.62, "long_range": 0.27 }
  }
}
```

---

## Frontend

### Dev proxy — `frontend/vite.config.ts`

Browser calls `/api/analyze` → Vite proxies to `http://localhost:8000`. No CORS setup needed during dev.

### State machine — `frontend/src/context/AppContext.tsx`

App phases:

```
input  →  tokenizing  →  results
  ↑                           │
  └──────── reset ────────────┘
```

On **submit**:

1. `POST /api/analyze` via `api/client.ts`
2. Store full response in `result`
3. **Token animation** — increment `activeTokenIndex` every 350ms
4. Switch to `results`, then **RNN animation** — increment `rnnStep` every 400ms

Components read from context; no prop drilling.

### UI components

| File | Role |
|------|------|
| `TextInput.tsx` | Textarea + Analyze / Load example |
| `TokenAnimation.tsx` | Highlights tokens as `activeTokenIndex` advances |
| `RNNPanel.tsx` | Timeline of LSTM steps + hidden-state norm bar + vector preview |
| `TransformerPanel.tsx` | Attention heatmap (rows/cols = tokens) |
| `MetricsPanel.tsx` | Shared bar chart for the three metrics |
| `SplitView.tsx` | Side-by-side layout |

### Types — `frontend/src/types/index.ts`

Mirrors the backend Pydantic models. Keep in sync if you change the API.

---

## File map

```
backend/
  main.py                 # FastAPI routes
  models/schemas.py       # Request/response types
  engines/
    tokenizer.py          # Shared BERT tokenizer
    rnn_engine.py         # Embedding + LSTM
    transformer_engine.py # BERT attention

frontend/src/
  main.tsx                # React entry, wraps AppProvider
  App.tsx                 # Layout shell
  context/AppContext.tsx  # Global state + animation timing
  api/client.ts           # fetch wrapper
  types/index.ts          # TS interfaces
  components/             # UI panels
```

---

## Common changes

**Use a different transformer** — edit `MODEL_NAME` in `transformer_engine.py` and `tokenizer.py` (must match).

**Longer sequences** — raise `MAX_SEQ_LEN` in `tokenizer.py`; heatmap gets large quickly in the browser.

**Faster/slower animations** — change the `350` / `400` ms intervals in `AppContext.tsx`.

**Add Q/K/V views** — hook BERT attention modules in `transformer_engine.py` and extend `AnalyzeResponse` + frontend heatmap tabs.
