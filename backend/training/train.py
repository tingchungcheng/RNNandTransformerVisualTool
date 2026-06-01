"""
Train tiny LSTM and Transformer on WikiText-2 for next-token prediction.

Usage (from backend/):
  python -m training.train
  python -m training.train --device cuda --epochs 5 --batch-size 64
"""

from __future__ import annotations

import argparse
import json
import math

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from engines.device import describe_device, resolve_device
from engines.tokenizer import get_tokenizer
from models.constants import (
    CHECKPOINT_DIR,
    LSTM_CHECKPOINT,
    METRICS_FILE,
    TRANSFORMER_CHECKPOINT,
)
from models.lstm_model import TinyLSTM
from models.transformer_model import TinyTransformer
from training.dataset import load_wikitext_blocks, make_dataloader


def _run_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    is_transformer: bool,
) -> float:
    model.train() if optimizer else model.eval()
    total_loss = 0.0
    total_tokens = 0
    criterion = nn.CrossEntropyLoss()

    for batch in loader:
        batch = batch.to(device, non_blocking=device.type == "cuda")
        inputs = batch[:, :-1]
        targets = batch[:, 1:]

        if optimizer:
            optimizer.zero_grad(set_to_none=True)

        with torch.set_grad_enabled(optimizer is not None):
            if is_transformer:
                logits, _ = model(inputs)
            else:
                logits = model(inputs)
            loss = criterion(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))

            if optimizer:
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()

        total_loss += loss.item() * targets.numel()
        total_tokens += targets.numel()

    return total_loss / max(total_tokens, 1)


def _train_model(
    name: str,
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int,
    lr: float,
    is_transformer: bool,
) -> dict[str, float]:
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    best_val = float("inf")
    best_state: dict | None = None

    for epoch in range(1, epochs + 1):
        train_loss = _run_epoch(model, train_loader, optimizer, device, is_transformer)
        val_loss = _run_epoch(model, val_loader, None, device, is_transformer)
        val_ppl = math.exp(min(val_loss, 20))

        print(
            f"[{name}] epoch {epoch}/{epochs}  "
            f"train_loss={train_loss:.4f}  val_loss={val_loss:.4f}  val_ppl={val_ppl:.2f}"
        )

        if val_loss < best_val:
            best_val = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    if best_state:
        model.load_state_dict(best_state)

    return {
        "val_loss": best_val,
        "val_perplexity": math.exp(min(best_val, 20)),
        "epochs": epochs,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train tiny LSTM + Transformer on WikiText-2")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--max-train-blocks", type=int, default=800)
    parser.add_argument("--max-val-blocks", type=int, default=120)
    parser.add_argument(
        "--device",
        choices=("auto", "cuda", "cpu"),
        default="auto",
        help="auto = CUDA if available, else CPU",
    )
    args = parser.parse_args()

    device = resolve_device(args.device)
    use_cuda = device.type == "cuda"
    print(f"Device: {describe_device(device)}")
    if args.device == "auto" and not use_cuda:
        print(
            "Tip: CUDA not detected. For GPU training install a CUDA PyTorch wheel, e.g.:\n"
            "  pip install torch --index-url https://download.pytorch.org/whl/cu124"
        )

    vocab_size = get_tokenizer().vocab_size
    print("Loading WikiText-2...")
    train_blocks, val_blocks = load_wikitext_blocks(args.max_train_blocks, args.max_val_blocks)
    print(f"Train blocks: {len(train_blocks)}, val blocks: {len(val_blocks)}")

    train_loader = make_dataloader(
        train_blocks, args.batch_size, shuffle=True, pin_memory=use_cuda
    )
    val_loader = make_dataloader(
        val_blocks, args.batch_size, shuffle=False, pin_memory=use_cuda
    )

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    lstm = TinyLSTM(vocab_size).to(device)
    lstm_metrics = _train_model(
        "LSTM",
        lstm,
        train_loader,
        val_loader,
        device,
        args.epochs,
        args.lr,
        is_transformer=False,
    )
    torch.save({"state_dict": lstm.cpu().state_dict(), "vocab_size": vocab_size}, LSTM_CHECKPOINT)
    print(f"Saved LSTM checkpoint -> {LSTM_CHECKPOINT}")

    transformer = TinyTransformer(vocab_size).to(device)
    tf_metrics = _train_model(
        "Transformer",
        transformer,
        train_loader,
        val_loader,
        device,
        args.epochs,
        args.lr,
        is_transformer=True,
    )
    torch.save(
        {"state_dict": transformer.cpu().state_dict(), "vocab_size": vocab_size},
        TRANSFORMER_CHECKPOINT,
    )
    print(f"Saved Transformer checkpoint -> {TRANSFORMER_CHECKPOINT}")

    metrics = {"lstm": lstm_metrics, "transformer": tf_metrics, "device": describe_device(device)}
    METRICS_FILE.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Metrics -> {METRICS_FILE}")
    print(
        f"\nValidation perplexity - LSTM: {lstm_metrics['val_perplexity']:.2f}, "
        f"Transformer: {tf_metrics['val_perplexity']:.2f}"
    )


if __name__ == "__main__":
    main()
