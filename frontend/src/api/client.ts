/**
 * API client. Calls /api/analyze which Vite proxies to FastAPI :8000.
 * See backend/models/schemas.py for the response shape.
 */
import type { AnalyzeResponse } from '../types'

export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }

  return response.json()
}
