"""WikiText-2 dataset helpers for next-token prediction training."""

from __future__ import annotations

from pathlib import Path

import torch
from torch.utils.data import DataLoader, Dataset

from engines.tokenizer import get_tokenizer
from models.constants import (
    TRAIN_MAX_SEQ_LEN,
    WIKITEXT_SEARCH_DIRS,
    WIKITEXT_TRAIN_FILE,
    WIKITEXT_VALID_FILE,
)


def _find_wikitext_file(name: str) -> Path | None:
    for directory in WIKITEXT_SEARCH_DIRS:
        path = directory / name
        if path.is_file():
            return path
    return None


def _read_lines(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _tokenize_lines(lines: list[str], label: str) -> list[int]:
    tokenizer = get_tokenizer()
    print(f"  Tokenizing {label} ({len(lines)} lines)...")
    batch_size = 256
    tokens: list[int] = []
    for start in range(0, len(lines), batch_size):
        chunk = lines[start : start + batch_size]
        encoded = tokenizer(
            chunk,
            add_special_tokens=False,
            truncation=True,
            max_length=512,
        )
        for ids in encoded["input_ids"]:
            tokens.extend(ids)
            tokens.append(tokenizer.sep_token_id)
    return tokens


def _load_local_wikitext() -> tuple[list[int], list[int]] | None:
    train_path = _find_wikitext_file(WIKITEXT_TRAIN_FILE)
    if train_path is None:
        return None

    print(f"Loading local WikiText from {train_path}")
    train_lines = _read_lines(train_path)
    valid_path = _find_wikitext_file(WIKITEXT_VALID_FILE)

    if valid_path is not None:
        print(f"Loading local validation from {valid_path}")
        val_lines = _read_lines(valid_path)
    else:
        # Hold out ~10% of lines when wiki.valid.raw is not provided.
        split_at = max(1, int(len(train_lines) * 0.9))
        val_lines = train_lines[split_at:]
        train_lines = train_lines[:split_at]
        print(
            f"No {WIKITEXT_VALID_FILE} found — using last {len(val_lines)} "
            f"train lines as validation."
        )

    print("Building token stream...")
    return _tokenize_lines(train_lines, "train"), _tokenize_lines(val_lines, "validation")


def _load_hub_wikitext() -> tuple[list[int], list[int]]:
    from datasets import load_dataset

    print("Local WikiText not found — downloading from HuggingFace Hub...")
    tokenizer = get_tokenizer()
    dataset = load_dataset("Salesforce/wikitext", "wikitext-2-raw-v1")

    def tokenize_split(split: str) -> list[int]:
        lines = [row.strip() for row in dataset[split]["text"] if row.strip()]
        return _tokenize_lines(lines, split)

    print("Building token stream...")
    return tokenize_split("train"), tokenize_split("validation")


def load_wikitext_blocks(
    max_train_blocks: int | None = None,
    max_val_blocks: int | None = None,
) -> tuple[list[list[int]], list[list[int]]]:
    """Tokenize WikiText-2 and split into train / validation blocks."""
    local = _load_local_wikitext()
    if local is not None:
        train_ids, val_ids = local
    else:
        train_ids, val_ids = _load_hub_wikitext()

    def to_blocks(all_ids: list[int], cap: int | None) -> list[list[int]]:
        blocks: list[list[int]] = []
        for start in range(0, len(all_ids) - TRAIN_MAX_SEQ_LEN, TRAIN_MAX_SEQ_LEN):
            block = all_ids[start : start + TRAIN_MAX_SEQ_LEN]
            if len(block) == TRAIN_MAX_SEQ_LEN:
                blocks.append(block)
                if cap is not None and len(blocks) >= cap:
                    break
        return blocks

    train_blocks = to_blocks(train_ids, max_train_blocks)
    val_blocks = to_blocks(val_ids, max_val_blocks)
    return train_blocks, val_blocks


class NextTokenDataset(Dataset):
    def __init__(self, blocks: list[list[int]]) -> None:
        self.blocks = blocks

    def __len__(self) -> int:
        return len(self.blocks)

    def __getitem__(self, idx: int) -> torch.Tensor:
        return torch.tensor(self.blocks[idx], dtype=torch.long)


def make_dataloader(
    blocks: list[list[int]],
    batch_size: int,
    shuffle: bool,
    *,
    pin_memory: bool = False,
) -> DataLoader:
    return DataLoader(
        NextTokenDataset(blocks),
        batch_size=batch_size,
        shuffle=shuffle,
        drop_last=True,
        pin_memory=pin_memory,
    )
