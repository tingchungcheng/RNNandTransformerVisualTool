"""Shared CPU/CUDA device selection for training and inference."""

from __future__ import annotations

import os

import torch

_VALID_CHOICES = frozenset({"auto", "cuda", "cpu"})


def resolve_device(choice: str = "auto") -> torch.device:
    """
    Pick a torch device.

    choice:
      - auto: CUDA if available, else CPU
      - cuda: require CUDA (raises if unavailable)
      - cpu:  force CPU
    """
    normalized = choice.lower().strip()
    if normalized not in _VALID_CHOICES:
        raise ValueError(f"device must be one of {sorted(_VALID_CHOICES)}, got {choice!r}")

    if normalized == "cpu":
        return torch.device("cpu")

    if normalized == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was requested but is not available. "
                "Install a CUDA-enabled PyTorch build, e.g.:\n"
                "  pip install torch --index-url https://download.pytorch.org/whl/cu124"
            )
        return torch.device("cuda")

    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def inference_device() -> torch.device:
    """Device for FastAPI inference; override with TORCH_DEVICE=cuda|cpu|auto."""
    return resolve_device(os.environ.get("TORCH_DEVICE", "auto"))


def describe_device(device: torch.device) -> str:
    if device.type == "cuda":
        idx = device.index if device.index is not None else torch.cuda.current_device()
        name = torch.cuda.get_device_name(idx)
        return f"cuda ({name})"
    return "cpu"
