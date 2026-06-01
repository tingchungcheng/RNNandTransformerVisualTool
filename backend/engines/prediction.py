"""Shared next-token prediction helpers."""

from __future__ import annotations

import json

import torch
import torch.nn.functional as F

from engines.tokenizer import get_tokenizer
from models.constants import METRICS_FILE
from models.schemas import ModelPrediction, TokenPrediction

TOP_K = 5


def load_training_metrics() -> dict | None:
    if not METRICS_FILE.is_file():
        return None
    return json.loads(METRICS_FILE.read_text(encoding="utf-8"))


def last_content_index(input_ids: torch.Tensor) -> int:
    """
    Index of the last non-[SEP] token — logits here predict the next token.
    input_ids shape: (1, seq_len)
    """
    tokenizer = get_tokenizer()
    sep_id = tokenizer.sep_token_id
    ids = input_ids[0].tolist()
    for idx in range(len(ids) - 1, -1, -1):
        if ids[idx] != sep_id:
            return idx
    return len(ids) - 1


def predict_next(
    model: torch.nn.Module,
    input_ids: torch.Tensor,
    *,
    is_transformer: bool,
    training_perplexity: float | None = None,
) -> ModelPrediction:
    tokenizer = get_tokenizer()
    pos = last_content_index(input_ids)

    with torch.no_grad():
        if is_transformer:
            logits, _ = model(input_ids, store_attention=False)
        else:
            logits = model(input_ids)
        step_logits = logits[0, pos]

    probs = F.softmax(step_logits, dim=-1)
    top_probs, top_ids = torch.topk(probs, TOP_K)

    top_k = [
        TokenPrediction(
            token=tokenizer.convert_ids_to_tokens([token_id.item()])[0],
            id=token_id.item(),
            probability=prob.item(),
        )
        for token_id, prob in zip(top_ids, top_probs, strict=True)
    ]

    return ModelPrediction(top_k=top_k, val_perplexity=training_perplexity)
