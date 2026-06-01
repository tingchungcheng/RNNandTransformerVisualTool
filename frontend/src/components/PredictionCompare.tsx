import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { useScrollToStage, RESULTS_PHASES } from '../hooks/useScrollToStage'
import type { ModelPrediction } from '../types'
import './PredictionCompare.css'

function formatToken(text: string): string {
  return text.replace(/\n/g, '\\n')
}

function formatPct(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`
}

function formatPpl(ppl: number | null | undefined): string {
  if (ppl == null) return '—'
  return ppl.toFixed(1)
}

interface ModelColumnProps {
  name: string
  accent: 'rnn' | 'tf'
  prediction: ModelPrediction
  isWinner: boolean
}

function ModelColumn({ name, accent, prediction, isWinner }: ModelColumnProps) {
  const { t } = useI18n()
  const top = prediction.top_k[0]

  return (
    <div className={`pred-col pred-col--${accent}`}>
      <div className="pred-col-head">
        <span className="pred-model">{name}</span>
        {isWinner && <span className="pred-winner">{t('prediction.winner')}</span>}
      </div>

      <div className="pred-top">
        <span className="pred-top-label">{t('prediction.topGuess')}</span>
        <span className="pred-top-token">{top ? formatToken(top.token) : '—'}</span>
        {top && <span className="pred-top-prob">{formatPct(top.probability)}</span>}
      </div>

      <div className="pred-ppl">
        <span>{t('prediction.valPpl')}</span>
        <strong>{formatPpl(prediction.val_perplexity)}</strong>
      </div>

      <ul className="pred-list">
        {prediction.top_k.map((item, i) => (
          <li key={`${item.id}-${i}`} className="pred-row">
            <span className="pred-rank">{i + 1}</span>
            <span className="pred-token">{formatToken(item.token)}</span>
            <div className="pred-bar-wrap">
              <div
                className={`pred-bar pred-bar--${accent}`}
                style={{ width: `${Math.max(item.probability * 100, 2)}%` }}
              />
            </div>
            <span className="pred-prob">{formatPct(item.probability)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PredictionCompare() {
  const { result, phase } = useApp()
  const { t } = useI18n()

  const visible = Boolean(result) && phase === 'results'

  const sectionRef = useScrollToStage('prediction', RESULTS_PHASES, visible)

  const { rnnWins, tie } = useMemo(() => {
    if (!result) return { rnnWins: false, tie: true }
    const rnnPpl = result.rnn.prediction.val_perplexity
    const tfPpl = result.transformer.prediction.val_perplexity
    if (rnnPpl == null || tfPpl == null) return { rnnWins: false, tie: true }
    if (Math.abs(rnnPpl - tfPpl) < 0.05) return { rnnWins: false, tie: true }
    return { rnnWins: rnnPpl < tfPpl, tie: false }
  }, [result])

  if (!visible || !result) return null

  const prefix =
    result.tokens.length > 0
      ? result.tokens
          .slice(0, -1)
          .map((tok) => formatToken(tok.text))
          .join(' ')
      : ''

  return (
    <section ref={sectionRef} className="prediction panel scroll-stage">
      <div className="prediction-header">
        <div>
          <h2>{t('prediction.title')}</h2>
          <p className="panel-desc">{t('prediction.description')}</p>
        </div>
      </div>

      <div className="prediction-prompt">
        <span className="prediction-prompt-label">{t('prediction.inputLabel')}</span>
        <code className="prediction-prompt-text">{prefix || '…'}</code>
        <span className="prediction-prompt-arrow">→</span>
        <span className="prediction-prompt-next">?</span>
      </div>

      <div className="prediction-grid">
        <ModelColumn
          name="LSTM"
          accent="rnn"
          prediction={result.rnn.prediction}
          isWinner={!tie && rnnWins}
        />
        <ModelColumn
          name="Transformer"
          accent="tf"
          prediction={result.transformer.prediction}
          isWinner={!tie && !rnnWins}
        />
      </div>

      <p className="prediction-note">{t('prediction.note')}</p>
    </section>
  )
}
