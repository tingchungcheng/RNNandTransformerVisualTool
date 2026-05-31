import type { Metrics } from '../types'
import { useI18n } from '../context/I18nContext'
import './MetricsPanel.css'

interface MetricsPanelProps {
  title: string
  metrics: Metrics
  accent: 'rnn' | 'transformer'
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span>{label}</span>
        <span className="metric-value">{pct}%</span>
      </div>
      <div className="metric-track">
        <div className="metric-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function MetricsPanel({ title, metrics, accent }: MetricsPanelProps) {
  const { t } = useI18n()
  const color = accent === 'rnn' ? 'var(--rnn)' : 'var(--transformer)'

  return (
    <div className="metrics-panel">
      <h3>{title}</h3>
      <MetricBar label={t('metrics.syntax')} value={metrics.syntax} color={color} />
      <MetricBar label={t('metrics.semantics')} value={metrics.semantics} color={color} />
      <MetricBar label={t('metrics.longRange')} value={metrics.long_range} color={color} />
    </div>
  )
}
