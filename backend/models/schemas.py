"""API request/response contracts shared with the frontend (see frontend/src/types)."""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=512)


class TokenInfo(BaseModel):
    id: int
    text: str  # e.g. "[CLS]", "the", "##ing"


class Metrics(BaseModel):
    syntax: float      # UI: local structure probe (0–1, not a linguistic score)
    semantics: float   # UI: spread / focus probe
    long_range: float  # UI: distant linkage / reach probe


class TokenPrediction(BaseModel):
    token: str
    id: int
    probability: float


class ModelPrediction(BaseModel):
    top_k: list[TokenPrediction]
    val_perplexity: float | None = None


class RNNResult(BaseModel):
    hidden_states: list[list[float]]  # [timestep][128 floats]
    metrics: Metrics
    prediction: ModelPrediction


class TransformerResult(BaseModel):
    attention: list[list[float]]  # [query_token][key_token], rows sum ≈ 1
    metrics: Metrics
    prediction: ModelPrediction


class AnalyzeResponse(BaseModel):
    tokens: list[TokenInfo]
    rnn: RNNResult
    transformer: TransformerResult
