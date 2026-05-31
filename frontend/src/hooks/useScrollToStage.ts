import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

/** Smooth-scroll to a section when analysis reaches a new stage. */
export function useScrollToStage(
  phase: 'loading' | 'tokenizing' | 'results',
  active: boolean,
) {
  const ref = useRef<HTMLElement>(null)
  const { phase: appPhase } = useApp()
  const scrolledRef = useRef(false)

  useEffect(() => {
    if (!active) {
      scrolledRef.current = false
      return
    }
    if (appPhase !== phase || scrolledRef.current) return

    scrolledRef.current = true
    const delay = phase === 'results' ? 400 : 80

    const timer = window.setTimeout(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ref.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      ref.current?.classList.add('scroll-highlight')
      window.setTimeout(() => ref.current?.classList.remove('scroll-highlight'), 1200)
    }, delay)

    return () => clearTimeout(timer)
  }, [appPhase, phase, active])

  return ref
}
