/** Left panel: animates LSTM timesteps using rnnStep from AppContext. */
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { MetricsPanel } from './MetricsPanel'
import './RNNPanel.css'

function norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
}

export function RNNPanel() {
  const { result, rnnStep, phase } = useApp()
  const { t } = useI18n()

  if (!result || phase !== 'results') return null

  const states = result.rnn.hidden_states
  const current = rnnStep >= 0 ? states[rnnStep] : states[0]
  const magnitude = norm(current)
  const maxMag = Math.max(...states.map(norm), 1e-6)
  const fillPct = Math.min(100, (magnitude / maxMag) * 100)
  const step = Math.max(rnnStep, 0) + 1

  return (
    <div className="split-panel rnn-panel">
      <header>
        <h2>{t('rnn.title')}</h2>
        <span className="badge rnn-badge">{t('rnn.badge')}</span>
      </header>
      <p className="panel-desc">{t('rnn.description')}</p>

      <div className="rnn-viz">
        <div className="rnn-timeline">
          {result.tokens.map((token, i) => (
            <div
              key={`rnn-${i}`}
              className={`rnn-step ${i <= rnnStep ? 'done' : ''} ${i === rnnStep ? 'current' : ''}`}
            >
              <span className="step-num">{i + 1}</span>
              <span className="step-token">{token.text.replace(/\n/g, '\\n')}</span>
            </div>
          ))}
        </div>

        <div className="hidden-state-box">
          <div className="hidden-state-label">{t('rnn.hiddenState', { step })}</div>
          <div className="hidden-state-bar">
            <div className="hidden-state-fill rnn-fill" style={{ width: `${fillPct}%` }} />
          </div>
          <div className="hidden-state-meta">
            {t('rnn.l2Norm', { norm: magnitude.toFixed(3), dim: current.length })}
          </div>
          <div className="vector-preview">
            {current.slice(0, 24).map((v, i) => (
              <span
                key={i}
                className="vector-cell"
                style={{
                  background: `rgba(96, 165, 250, ${Math.min(1, Math.abs(v) * 2 + 0.1)})`,
                }}
                title={t('rnn.vectorTooltip', { value: v.toFixed(4) })}
              />
            ))}
          </div>
        </div>
      </div>

      <MetricsPanel title={t('rnn.metricsTitle')} metrics={result.rnn.metrics} accent="rnn" />
    </div>
  )
}
