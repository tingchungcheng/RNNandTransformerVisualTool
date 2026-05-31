import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import type { AppPhase } from '../types'
import './PipelineSteps.css'

const STEP_KEYS = ['input', 'analyze', 'tokenize', 'visualize'] as const

function stepIndex(phase: AppPhase): number {
  if (phase === 'input') return 0
  if (phase === 'loading') return 1
  if (phase === 'tokenizing') return 2
  return 3
}

export function PipelineSteps() {
  const { phase } = useApp()
  const { t } = useI18n()
  const current = stepIndex(phase)

  return (
    <nav className="pipeline" aria-label={t('pipeline.ariaLabel')}>
      {STEP_KEYS.map((key, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={key} className={`pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="pipeline-dot-wrap">
              <span className="pipeline-dot">{done ? '✓' : i + 1}</span>
              {i < STEP_KEYS.length - 1 && <span className="pipeline-line" />}
            </div>
            <span className="pipeline-label">{t(`pipeline.${key}`)}</span>
          </div>
        )
      })}
    </nav>
  )
}
