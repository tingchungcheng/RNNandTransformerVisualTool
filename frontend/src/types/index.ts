/** TypeScript mirrors of backend/models/schemas.py — keep in sync when changing the API. */

export interface TokenInfo {
  id: number
  text: string
}

export interface Metrics {
  syntax: number
  semantics: number
  long_range: number
}

export interface TokenPrediction {
  token: string
  id: number
  probability: number
}

export interface ModelPrediction {
  top_k: TokenPrediction[]
  val_perplexity: number | null
}

export interface AnalyzeResponse {
  tokens: TokenInfo[]
  rnn: {
    hidden_states: number[][]
    metrics: Metrics
    prediction: ModelPrediction
  }
  transformer: {
    attention: number[][]
    metrics: Metrics
    prediction: ModelPrediction
  }
}

/** Controls which UI sections are visible and animated. */
export type AppPhase = 'input' | 'loading' | 'tokenizing' | 'results'
