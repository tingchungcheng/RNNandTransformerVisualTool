"""Tiny LSTM for next-token prediction."""

from __future__ import annotations

import torch
import torch.nn as nn

from models.constants import EMBED_DIM, LSTM_HIDDEN, LSTM_LAYERS


class TinyLSTM(nn.Module):
    def __init__(self, vocab_size: int) -> None:
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, EMBED_DIM)
        self.lstm = nn.LSTM(
            EMBED_DIM,
            LSTM_HIDDEN,
            num_layers=LSTM_LAYERS,
            batch_first=True,
        )
        self.head = nn.Linear(LSTM_HIDDEN, vocab_size)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        """Return logits for every timestep: (batch, seq, vocab)."""
        embedded = self.embedding(input_ids)
        hidden, _ = self.lstm(embedded)
        return self.head(hidden)

    def hidden_states(self, input_ids: torch.Tensor) -> torch.Tensor:
        """Return LSTM outputs for visualization: (batch, seq, hidden)."""
        embedded = self.embedding(input_ids)
        outputs, _ = self.lstm(embedded)
        return outputs
