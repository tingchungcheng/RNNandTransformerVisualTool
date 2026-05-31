from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from engines.rnn_engine import run_rnn
from engines.tokenizer import encode_text, get_tokenizer
from engines.transformer_engine import run_transformer
from models.schemas import AnalyzeRequest, AnalyzeResponse, RNNResult, TokenInfo, TransformerResult

app = FastAPI(title="RNN vs Transformer Demo API")

# CORS only needed if the frontend calls the API directly (not via Vite proxy).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    End-to-end analysis pipeline:
      text → tokenize (once) → LSTM hidden states + BERT attention → JSON
    Both engines share the same input_ids so visualizations stay aligned.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    tokenizer = get_tokenizer()
    encoded = encode_text(text)
    input_ids = encoded["input_ids"]  # shape: (1, seq_len)

    ids = input_ids[0].tolist()
    if not ids:
        raise HTTPException(status_code=400, detail="No tokens produced from input.")

    # Human-readable token strings for the frontend chip animation.
    tokens = [
        TokenInfo(id=token_id, text=tokenizer.convert_ids_to_tokens([token_id])[0])
        for token_id in ids
    ]

    try:
        hidden_states, rnn_metrics = run_rnn(input_ids)
        attention, transformer_metrics = run_transformer(input_ids)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc

    return AnalyzeResponse(
        tokens=tokens,
        rnn=RNNResult(hidden_states=hidden_states, metrics=rnn_metrics),
        transformer=TransformerResult(attention=attention, metrics=transformer_metrics),
    )
