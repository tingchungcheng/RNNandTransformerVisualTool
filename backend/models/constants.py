"""Shared hyperparameters for tiny LSTM / Transformer models."""

from pathlib import Path

EMBED_DIM = 64
LSTM_HIDDEN = 128
LSTM_LAYERS = 1
TF_HEADS = 4
TF_LAYERS = 2
TF_FFN = 256

TRAIN_MAX_SEQ_LEN = 128
INFERENCE_MAX_SEQ_LEN = 64

# Local WikiText-2 raw files (no HuggingFace Hub needed when present).
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
WIKITEXT_SEARCH_DIRS = (
    REPO_ROOT,
    Path(__file__).resolve().parent.parent / "data",
)
WIKITEXT_TRAIN_FILE = "wiki.train.raw"
WIKITEXT_VALID_FILE = "wiki.valid.raw"

CHECKPOINT_DIR = Path(__file__).resolve().parent.parent / "checkpoints"
LSTM_CHECKPOINT = CHECKPOINT_DIR / "lstm.pt"
TRANSFORMER_CHECKPOINT = CHECKPOINT_DIR / "transformer.pt"
METRICS_FILE = CHECKPOINT_DIR / "metrics.json"
