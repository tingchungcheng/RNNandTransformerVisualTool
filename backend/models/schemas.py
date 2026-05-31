"""API request/response contracts shared with the frontend (see frontend/src/types)."""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=512)


class TokenInfo(BaseModel):
    id: int
    text: str  # e.g. "[CLS]", "the", "##ing"


class Metrics(BaseModel):
    syntax: float      # 0–1 heuristic, not a linguistic benchmark
    semantics: float
    long_range: float


class RNNResult(BaseModel):
    hidden_states: list[list[float]]  # [timestep][128 floats]
    metrics: Metrics


class TransformerResult(BaseModel):
    attention: list[list[float]]  # [query_token][key_token], rows sum ≈ 1
    metrics: Metrics


class AnalyzeResponse(BaseModel):
    tokens: list[TokenInfo]
    rnn: RNNResult
    transformer: TransformerResult
