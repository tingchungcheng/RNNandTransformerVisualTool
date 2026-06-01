"""
Tiny LSTM engine — trained on WikiText-2 for next-token prediction.

Pipeline: token ID → Embedding → LSTM → hidden states + next-token logits.
"""

from __future__ import annotations

import torch

from engines.device import inference_device
from engines.prediction import load_training_metrics, predict_next
from models.constants import LSTM_CHECKPOINT
from models.lstm_model import TinyLSTM
from models.schemas import Metrics, ModelPrediction

_engine: TinyLSTM | None = None
_device: torch.device | None = None
_training_ppl: float | None = None


def _get_engine() -> tuple[TinyLSTM, torch.device]:
    """Lazy singleton — loads trained checkpoint on first call."""
    global _engine, _device, _training_ppl
    if _engine is not None and _device is not None:
        return _engine, _device

    from engines.tokenizer import get_tokenizer

    device = inference_device()
    vocab_size = get_tokenizer().vocab_size
    engine = TinyLSTM(vocab_size)

    if LSTM_CHECKPOINT.is_file():
        ckpt = torch.load(LSTM_CHECKPOINT, map_location=device, weights_only=True)
        engine.load_state_dict(ckpt["state_dict"])
    else:
        torch.manual_seed(42)

    metrics = load_training_metrics()
    if metrics and "lstm" in metrics:
        _training_ppl = metrics["lstm"].get("val_perplexity")

    engine.to(device).eval()
    _engine = engine
    _device = device
    return engine, device


def _cosine(a: torch.Tensor, b: torch.Tensor) -> float:
    denom = a.norm() * b.norm()
    if denom.item() == 0:
        return 0.0
    return float(torch.dot(a, b) / denom)


def _compute_rnn_metrics(hidden: torch.Tensor) -> Metrics:
    """
    Structure probes for the UI bars — not linguistic scores.
    hidden shape: (seq_len, hidden_size)
    """
    seq_len = hidden.shape[0]
    if seq_len < 2:
        return Metrics(syntax=0.0, semantics=0.0, long_range=0.0)

    # Local: average step-to-step hidden-state change (normalized).
    deltas = hidden[1:] - hidden[:-1]
    syntax = float(deltas.norm(dim=1).mean() / (hidden.norm(dim=1).mean() + 1e-6))

    # Spread: consecutive hidden-state similarity (smooth sequential states).
    sims = [_cosine(hidden[i], hidden[i + 1]) for i in range(seq_len - 1)]
    semantics = float(sum(abs(s) for s in sims) / len(sims))

    # Long-range: late hidden states vs the initial state (sequential path decay).
    third = max(1, seq_len // 3)
    late_to_start = [abs(_cosine(hidden[i], hidden[0])) for i in range(2 * third, seq_len)]
    long_range = min(1.0, sum(late_to_start) / len(late_to_start)) if late_to_start else 0.0

    return Metrics(
        syntax=min(1.0, syntax),
        semantics=min(1.0, semantics),
        long_range=long_range,
    )


def run_rnn(input_ids: torch.Tensor) -> tuple[list[list[float]], Metrics, ModelPrediction]:
    engine, device = _get_engine()
    ids = input_ids.to(device)

    with torch.no_grad():
        hidden = engine.hidden_states(ids).squeeze(0).cpu()
        prediction = predict_next(
            engine,
            ids,
            is_transformer=False,
            training_perplexity=_training_ppl,
        )

    return hidden.tolist(), _compute_rnn_metrics(hidden), prediction
