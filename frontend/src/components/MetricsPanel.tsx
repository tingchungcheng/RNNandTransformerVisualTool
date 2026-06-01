import type { Metrics } from '../types'
import { useI18n } from '../context/I18nContext'
import './MetricsPanel.css'

interface MetricsPanelProps {
  title: string
  metrics: Metrics
  accent: 'rnn' | 'transformer'
}

function MetricBar({
  label,
  hint,
  value,
  color,
  proxyTag,
}: {
  label: string
  hint: string
  value: number
  color: string
  proxyTag: string
}) {
  const pct = Math.round(value * 100)
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span title={hint}>{label}</span>
        <span className="metric-value">
          {pct} <span className="metric-proxy-tag">{proxyTag}</span>
        </span>
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
  const prefix = accent === 'rnn' ? 'metrics.rnn' : 'metrics.transformer'

  return (
    <div className="metrics-panel">
      <h3>{title}</h3>
      <p className="metrics-note">{t('metrics.note')}</p>
      <MetricBar
        label={t(`${prefix}.local`)}
        hint={t(`${prefix}.localHint`)}
        value={metrics.syntax}
        color={color}
        proxyTag={t('metrics.probeTag')}
      />
      <MetricBar
        label={t(`${prefix}.spread`)}
        hint={t(`${prefix}.spreadHint`)}
        value={metrics.semantics}
        color={color}
        proxyTag={t('metrics.probeTag')}
      />
      <MetricBar
        label={t(`${prefix}.longRange`)}
        hint={t(`${prefix}.longRangeHint`)}
        value={metrics.long_range}
        color={color}
        proxyTag={t('metrics.probeTag')}
      />
    </div>
  )
}
