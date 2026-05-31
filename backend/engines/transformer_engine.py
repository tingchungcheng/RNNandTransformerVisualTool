"""
Transformer engine using bert-base-uncased self-attention.

Purpose: expose real attention weights from a pretrained encoder.
We only read attentions — no fine-tuning or downstream head.
"""

from __future__ import annotations

import torch
from transformers import BertModel

from models.schemas import Metrics

MODEL_NAME = "bert-base-uncased"

_model: BertModel | None = None


def _get_model() -> BertModel:
    global _model
    if _model is None:
        # "eager" required: SDPA/FlashAttention backends omit attention weights.
        _model = BertModel.from_pretrained(MODEL_NAME, attn_implementation="eager")
        _model.eval()
    return _model


def _compute_transformer_metrics(attention: torch.Tensor) -> Metrics:
    """
    Heuristic scores derived from the attention matrix.
    attention shape: (seq_len, seq_len), rows sum to ~1 after head averaging.
    """
    seq_len = attention.shape[0]
    if seq_len < 2:
        return Metrics(syntax=0.0, semantics=0.0, long_range=0.0)

    # syntax: mass on immediate neighbors (±1 position)
    local = 0.0
    count = 0
    for i in range(seq_len):
        for j in range(max(0, i - 1), min(seq_len, i + 2)):
            local += attention[i, j].item()
            count += 1
    syntax = local / count if count else 0.0

    # semantics: low entropy rows → focused "meaning"; high entropy → diffuse
    entropy_sum = 0.0
    for i in range(seq_len):
        row = attention[i].clamp(min=1e-9)
        entropy = -(row * row.log()).sum().item()
        entropy_sum += entropy
    max_entropy = torch.log(torch.tensor(float(seq_len))).item()
    semantics = 1.0 - (entropy_sum / seq_len) / (max_entropy + 1e-6)

    # long_range: last token looking back at the first half of the sequence
    mid = max(1, seq_len // 2)
    long_range = float(attention[-1, :mid].mean())

    return Metrics(
        syntax=min(1.0, max(0.0, syntax)),
        semantics=min(1.0, max(0.0, semantics)),
        long_range=min(1.0, max(0.0, long_range)),
    )


def run_transformer(input_ids: torch.Tensor) -> tuple[list[list[float]], Metrics]:
    model = _get_model()

    with torch.no_grad():
        outputs = model(input_ids, output_attentions=True)
        # attentions: tuple of (batch, heads, seq, seq) per layer
        # Take last layer, average heads → square matrix for the heatmap.
        last_layer = outputs.attentions[-1].squeeze(0).mean(dim=0)

    return last_layer.tolist(), _compute_transformer_metrics(last_layer)
