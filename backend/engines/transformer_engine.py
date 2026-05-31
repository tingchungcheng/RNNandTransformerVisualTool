"""
Transformer attention geometry metrics (stable version)
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
        _model = BertModel.from_pretrained(
            MODEL_NAME,
            attn_implementation="eager"
        )
        _model.eval()
    return _model


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _compute_metrics(attention: torch.Tensor) -> Metrics:
    """
    attention: (seq_len, seq_len)
    """

    seq_len = attention.shape[0]
    if seq_len < 2:
        return Metrics(0.0, 0.0, 0.0)

    # -------------------------------------------------
    # 1. Locality (vectorized)
    # -------------------------------------------------
    i_idx = torch.arange(seq_len).unsqueeze(1)
    j_idx = torch.arange(seq_len).unsqueeze(0)

    local_mask = (torch.abs(i_idx - j_idx) <= 1).float()
    locality = (attention * local_mask).sum() / (local_mask.sum() + 1e-9)

    # -------------------------------------------------
    # 2. Attention focus (entropy-based, stable)
    # -------------------------------------------------
    entropy = -(attention * (attention + 1e-9).log()).sum(dim=1)
    entropy_norm = entropy.mean() / torch.log(torch.tensor(float(seq_len)))

    attention_focus = 1.0 - entropy_norm.item()

    # -------------------------------------------------
    # 3. Distance dependency (SOFT weighting, FIXED)
    # -------------------------------------------------
    dist = torch.abs(i_idx - j_idx).float()
    dist = dist / (seq_len - 1 + 1e-9)

    # soft weighting instead of hard threshold
    distance_dependency = (attention * dist).sum() / (attention.sum() + 1e-9)

    return Metrics(
        syntax=_clamp(locality.item()),
        semantics=_clamp(attention_focus),
        long_range=_clamp(distance_dependency.item()),
    )


def run_transformer(input_ids: torch.Tensor):
    model = _get_model()

    with torch.no_grad():
        outputs = model(input_ids, output_attentions=True)

        last_layer = outputs.attentions[-1]
        attention = last_layer.mean(dim=1).squeeze(0)

    metrics = _compute_metrics(attention)

    return attention.tolist(), metrics