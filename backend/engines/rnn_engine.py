"""
Simple LSTM engine — random init, no pretraining.

Purpose: expose sequential hidden-state evolution, not prediction accuracy.
Pipeline: token ID → Embedding → LSTM → one hidden vector per timestep.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from models.schemas import Metrics

INPUT_SIZE = 64   # embedding dim fed into LSTM
HIDDEN_SIZE = 128 # LSTM hidden dim returned to the frontend


class LSTMEngine(nn.Module):
    def __init__(self, vocab_size: int) -> None:
        super().__init__()
        # Embedding maps discrete token IDs to continuous vectors LSTM can consume.
        self.embedding = nn.Embedding(vocab_size, INPUT_SIZE)
        self.lstm = nn.LSTM(INPUT_SIZE, HIDDEN_SIZE, batch_first=True)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        embedded = self.embedding(input_ids)  # (batch, seq, input_size)
        outputs, _ = self.lstm(embedded)      # outputs: (batch, seq, hidden_size)
        return outputs


_engine: LSTMEngine | None = None


def _get_engine() -> LSTMEngine:
    """Lazy singleton — model loads on first /api/analyze call."""
    global _engine
    if _engine is None:
        from engines.tokenizer import get_tokenizer

        torch.manual_seed(42)  # reproducible random weights for demos
        _engine = LSTMEngine(get_tokenizer().vocab_size)
        _engine.eval()
    return _engine


def _cosine(a: torch.Tensor, b: torch.Tensor) -> float:
    denom = a.norm() * b.norm()
    if denom.item() == 0:
        return 0.0
    return float(torch.dot(a, b) / denom)


def _compute_rnn_metrics(hidden: torch.Tensor) -> Metrics:
    """
    Heuristic scores for the UI bars — not trained classifiers.
    hidden shape: (seq_len, hidden_size)
    """
    seq_len = hidden.shape[0]
    if seq_len < 2:
        return Metrics(syntax=0.0, semantics=0.0, long_range=0.0)

    # syntax: average step-to-step change magnitude (local dynamics)
    deltas = hidden[1:] - hidden[:-1]
    syntax = float(deltas.norm(dim=1).mean() / (hidden.norm(dim=1).mean() + 1e-6))

    # semantics: how similar consecutive hidden states are
    sims = [_cosine(hidden[i], hidden[i + 1]) for i in range(seq_len - 1)]
    semantics = float(sum(abs(s) for s in sims) / len(sims))

    # long_range: does the final state still relate to early context?
    mid = max(1, seq_len // 2)
    early = hidden[:mid].mean(dim=0)
    long_range = abs(_cosine(hidden[-1], early))

    return Metrics(
        syntax=min(1.0, syntax),
        semantics=min(1.0, semantics),
        long_range=min(1.0, long_range),
    )


def run_rnn(input_ids: torch.Tensor) -> tuple[list[list[float]], Metrics]:
    engine = _get_engine()

    with torch.no_grad():
        hidden = engine(input_ids).squeeze(0)  # (seq_len, hidden_size)

    return hidden.tolist(), _compute_rnn_metrics(hidden)
