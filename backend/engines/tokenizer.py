"""
Shared BERT tokenizer for both engines.

Both RNN and Transformer must tokenize identically so the split-screen
heatmap rows/columns match the LSTM timestep labels.
"""

from functools import lru_cache

import torch
from transformers import BertTokenizerFast

MODEL_NAME = "bert-base-uncased"
MAX_SEQ_LEN = 64  # keep small — heatmap is seq_len² cells in the browser


@lru_cache(maxsize=1)
def get_tokenizer() -> BertTokenizerFast:
    return BertTokenizerFast.from_pretrained(MODEL_NAME)


def encode_text(text: str) -> dict[str, torch.Tensor]:
    """Returns {"input_ids": Tensor(1, seq_len), "attention_mask": ...}."""
    return get_tokenizer()(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_SEQ_LEN,
        add_special_tokens=True,  # adds [CLS] at start, [SEP] at end
    )
