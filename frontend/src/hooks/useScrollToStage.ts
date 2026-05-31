import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import type { AppPhase } from '../types'

const TOKEN_PHASES: AppPhase[] = ['loading', 'tokenizing']
const RESULTS_PHASES: AppPhase[] = ['results']

function scrollToElement(el: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      el.classList.add('scroll-highlight')
      window.setTimeout(() => el.classList.remove('scroll-highlight'), 1200)
    })
  })
}

/**
 * Scroll once per analysis run when `appPhase` enters `targetPhases`.
 * Uses `stageId` so token / info-flow / etc. each fire independently.
 */
export function useScrollToStage(
  stageId: string,
  targetPhases: AppPhase[],
  enabled: boolean,
) {
  const ref = useRef<HTMLElement>(null)
  const { phase: appPhase, analysisRunId } = useApp()
  const doneForRun = useRef<Set<string>>(new Set())

  useEffect(() => {
    doneForRun.current.clear()
  }, [analysisRunId])

  useEffect(() => {
    if (!enabled || !targetPhases.includes(appPhase)) return

    const key = `${analysisRunId}:${stageId}`
    if (doneForRun.current.has(key)) return

    const delay = appPhase === 'results' ? 500 : 150
    const timer = window.setTimeout(() => {
      const el = ref.current
      if (!el || doneForRun.current.has(key)) return
      doneForRun.current.add(key)
      scrollToElement(el)
    }, delay)

    return () => clearTimeout(timer)
  }, [appPhase, enabled, analysisRunId, stageId, targetPhases])

  return ref
}

export { TOKEN_PHASES, RESULTS_PHASES }
