import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { analyzeText } from '../api/client'
import type { AnalyzeResponse, AppPhase } from '../types'

export interface AnalysisTiming {
  apiMs: number | null
  elapsedMs: number
  totalMs: number | null
}

interface AppContextValue {
  phase: AppPhase
  inputText: string
  setInputText: (text: string) => void
  result: AnalyzeResponse | null
  error: string | null
  activeTokenIndex: number
  rnnStep: number
  timing: AnalysisTiming
  submit: () => Promise<void>
  reset: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const TOKEN_MS = 320
const RNN_MS = 380
const TOKEN_PAUSE_MS = 500

const initialTiming: AnalysisTiming = { apiMs: null, elapsedMs: 0, totalMs: null }

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AppPhase>('input')
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTokenIndex, setActiveTokenIndex] = useState(-1)
  const [rnnStep, setRnnStep] = useState(-1)
  const [timing, setTiming] = useState<AnalysisTiming>(initialTiming)

  const timersRef = useRef<Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>>>([])
  const startTimeRef = useRef<number | null>(null)
  const elapsedTickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      clearInterval(id)
      clearTimeout(id)
    })
    timersRef.current = []
  }, [])

  const stopElapsedTicker = useCallback(() => {
    if (elapsedTickerRef.current) {
      clearInterval(elapsedTickerRef.current)
      elapsedTickerRef.current = null
    }
  }, [])

  const startElapsedTicker = useCallback(() => {
    stopElapsedTicker()
    elapsedTickerRef.current = setInterval(() => {
      if (startTimeRef.current === null) return
      setTiming((prev) => ({
        ...prev,
        elapsedMs: Date.now() - startTimeRef.current!,
      }))
    }, 100)
  }, [stopElapsedTicker])

  const markComplete = useCallback(() => {
    if (startTimeRef.current === null) return
    const totalMs = Date.now() - startTimeRef.current
    stopElapsedTicker()
    setTiming((prev) => ({ ...prev, elapsedMs: totalMs, totalMs }))
  }, [stopElapsedTicker])

  const runAnimations = useCallback(
    (data: AnalyzeResponse) => {
      clearTimers()
      const tokenCount = data.tokens.length
      let tokenIdx = 0
      setActiveTokenIndex(0)
      setPhase('tokenizing')

      const tokenInterval = window.setInterval(() => {
        tokenIdx += 1
        if (tokenIdx >= tokenCount) {
          clearInterval(tokenInterval)
          const pause = window.setTimeout(() => {
            setPhase('results')
            setActiveTokenIndex(tokenCount - 1)

            let step = 0
            setRnnStep(0)
            const rnnInterval = window.setInterval(() => {
              step += 1
              if (step >= data.rnn.hidden_states.length) {
                clearInterval(rnnInterval)
                setRnnStep(data.rnn.hidden_states.length - 1)
                markComplete()
                return
              }
              setRnnStep(step)
            }, RNN_MS)
            timersRef.current.push(rnnInterval)
          }, TOKEN_PAUSE_MS)
          timersRef.current.push(pause)
          return
        }
        setActiveTokenIndex(tokenIdx)
      }, TOKEN_MS)
      timersRef.current.push(tokenInterval)
    },
    [clearTimers, markComplete],
  )

  const submit = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed) {
      setError('errors.emptyText')
      return
    }

    clearTimers()
    stopElapsedTicker()
    setError(null)
    setResult(null)
    setActiveTokenIndex(-1)
    setRnnStep(-1)
    startTimeRef.current = Date.now()
    setTiming({ apiMs: null, elapsedMs: 0, totalMs: null })
    setPhase('loading')
    startElapsedTicker()

    try {
      const data = await analyzeText(trimmed)
      const apiMs = Date.now() - (startTimeRef.current ?? Date.now())
      setTiming((prev) => ({ ...prev, apiMs, elapsedMs: apiMs }))
      setResult(data)
      runAnimations(data)
    } catch {
      stopElapsedTicker()
      startTimeRef.current = null
      setTiming(initialTiming)
      setPhase('input')
      setError('errors.backendFailed')
    }
  }, [inputText, runAnimations, clearTimers, startElapsedTicker, stopElapsedTicker])

  const reset = useCallback(() => {
    clearTimers()
    stopElapsedTicker()
    startTimeRef.current = null
    setPhase('input')
    setResult(null)
    setError(null)
    setActiveTokenIndex(-1)
    setRnnStep(-1)
    setTiming(initialTiming)
  }, [clearTimers, stopElapsedTicker])

  useEffect(() => () => {
    clearTimers()
    stopElapsedTicker()
  }, [clearTimers, stopElapsedTicker])

  return (
    <AppContext.Provider
      value={{
        phase,
        inputText,
        setInputText,
        result,
        error,
        activeTokenIndex,
        rnnStep,
        timing,
        submit,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
