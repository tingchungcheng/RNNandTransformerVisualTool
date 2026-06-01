"""Tiny causal Transformer for next-token prediction."""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from models.constants import EMBED_DIM, TF_FFN, TF_HEADS, TF_LAYERS, TRAIN_MAX_SEQ_LEN


class CausalSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int) -> None:
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.qkv = nn.Linear(d_model, d_model * 3)
        self.out = nn.Linear(d_model, d_model)

    def forward(
        self,
        x: torch.Tensor,
        attn_mask: torch.Tensor,
        store_weights: bool = False,
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        batch, seq_len, d_model = x.shape
        qkv = self.qkv(x).reshape(batch, seq_len, 3, self.n_heads, self.head_dim)
        qkv = qkv.permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        scores = scores.masked_fill(attn_mask.unsqueeze(0).unsqueeze(0), float("-inf"))
        weights = F.softmax(scores, dim=-1)
        context = torch.matmul(weights, v)
        context = context.transpose(1, 2).reshape(batch, seq_len, d_model)
        out = self.out(context)

        attn = weights.mean(dim=1) if store_weights else None
        return out, attn


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, ffn_dim: int) -> None:
        super().__init__()
        self.attn = CausalSelfAttention(d_model, n_heads)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, ffn_dim),
            nn.GELU(),
            nn.Linear(ffn_dim, d_model),
        )

    def forward(
        self,
        x: torch.Tensor,
        attn_mask: torch.Tensor,
        store_weights: bool = False,
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        attn_out, weights = self.attn(self.norm1(x), attn_mask, store_weights=store_weights)
        x = x + attn_out
        x = x + self.ffn(self.norm2(x))
        return x, weights


class TinyTransformer(nn.Module):
    def __init__(self, vocab_size: int, max_len: int = TRAIN_MAX_SEQ_LEN) -> None:
        super().__init__()
        self.max_len = max_len
        self.embedding = nn.Embedding(vocab_size, EMBED_DIM)
        self.pos = nn.Embedding(max_len, EMBED_DIM)
        self.blocks = nn.ModuleList(
            TransformerBlock(EMBED_DIM, TF_HEADS, TF_FFN) for _ in range(TF_LAYERS)
        )
        self.norm = nn.LayerNorm(EMBED_DIM)
        self.head = nn.Linear(EMBED_DIM, vocab_size)

    def _causal_mask(self, seq_len: int, device: torch.device) -> torch.Tensor:
        return torch.triu(torch.ones(seq_len, seq_len, device=device), diagonal=1).bool()

    def forward(
        self,
        input_ids: torch.Tensor,
        store_attention: bool = False,
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        batch, seq_len = input_ids.shape
        positions = torch.arange(seq_len, device=input_ids.device).unsqueeze(0)
        x = self.embedding(input_ids) + self.pos(positions)
        mask = self._causal_mask(seq_len, input_ids.device)

        last_attn: torch.Tensor | None = None
        for block in self.blocks:
            x, attn = block(x, mask, store_weights=store_attention)
            if attn is not None:
                last_attn = attn

        logits = self.head(self.norm(x))
        return logits, last_attn
