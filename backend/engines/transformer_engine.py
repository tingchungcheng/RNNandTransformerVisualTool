"""
Tiny causal Transformer — trained on WikiText-2 for next-token prediction.
"""

from __future__ import annotations

import torch

from engines.device import inference_device
from engines.prediction import load_training_metrics, predict_next
from models.constants import TRANSFORMER_CHECKPOINT
from models.schemas import Metrics, ModelPrediction
from models.transformer_model import TinyTransformer

_model: TinyTransformer | None = None
_device: torch.device | None = None
_training_ppl: float | None = None


def _get_model() -> tuple[TinyTransformer, torch.device]:
    global _model, _device, _training_ppl
    if _model is not None and _device is not None:
        return _model, _device

    from engines.tokenizer import get_tokenizer

    device = inference_device()
    vocab_size = get_tokenizer().vocab_size
    model = TinyTransformer(vocab_size)

    if TRANSFORMER_CHECKPOINT.is_file():
        ckpt = torch.load(TRANSFORMER_CHECKPOINT, map_location=device, weights_only=True)
        model.load_state_dict(ckpt["state_dict"])
    else:
        torch.manual_seed(42)

    metrics = load_training_metrics()
    if metrics and "transformer" in metrics:
        _training_ppl = metrics["transformer"].get("val_perplexity")

    model.to(device).eval()
    _model = model
    _device = device
    return model, device


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _compute_metrics(attention: torch.Tensor) -> Metrics:
    """
    Structure probes from the last-layer attention matrix.
    attention shape: (seq_len, seq_len), rows = query, cols = key
    """
    seq_len = attention.shape[0]
    if seq_len < 2:
        return Metrics(0.0, 0.0, 0.0)

    i_idx = torch.arange(seq_len).unsqueeze(1)
    j_idx = torch.arange(seq_len).unsqueeze(0)

    # Local: attention mass on adjacent token pairs (|i - j| <= 1).
    local_mask = (torch.abs(i_idx - j_idx) <= 1).float()
    locality = (attention * local_mask).sum() / (local_mask.sum() + 1e-9)

    # Spread: peaked vs diffuse attention (1 - normalized row entropy).
    entropy = -(attention * (attention + 1e-9).log()).sum(dim=1)
    entropy_norm = entropy.mean() / torch.log(torch.tensor(float(seq_len)))
    attention_focus = 1.0 - entropy_norm.item()

    # Long-range: mean look-back distance (how far each query attends on average).
    dist = torch.abs(i_idx - j_idx).float()
    row_reach = (attention * dist).sum(dim=1) / (attention.sum(dim=1) + 1e-9)
    long_range = _clamp((row_reach.mean() / (seq_len - 1 + 1e-9)).item())

    return Metrics(
        syntax=_clamp(locality.item()),
        semantics=_clamp(attention_focus),
        long_range=_clamp(long_range),
    )


def run_transformer(input_ids: torch.Tensor) -> tuple[list[list[float]], Metrics, ModelPrediction]:
    model, device = _get_model()
    ids = input_ids.to(device)

    with torch.no_grad():
        _, attention = model(ids, store_attention=True)
        if attention is None:
            raise RuntimeError("Transformer did not return attention weights.")
        attention = attention.squeeze(0).cpu()
        prediction = predict_next(
            model,
            ids,
            is_transformer=True,
            training_perplexity=_training_ppl,
        )

    metrics = _compute_metrics(attention)
    return attention.tolist(), metrics, prediction
