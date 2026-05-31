/**
 * Right panel: BERT attention heatmap.
 * Row i, col j = how much token i attends to token j (last layer, mean over heads).
 */
import { Fragment } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { MetricsPanel } from './MetricsPanel'
import './TransformerPanel.css'

function attentionColor(value: number): string {
  const alpha = Math.min(1, value * 3 + 0.05)
  return `rgba(167, 139, 250, ${alpha})`
}

export function TransformerPanel() {
  const { result, phase } = useApp()
  const { t } = useI18n()

  if (!result || phase !== 'results') return null

  const { attention, metrics } = result.transformer
  const tokens = result.tokens
  const size = tokens.length

  return (
    <div className="split-panel transformer-panel">
      <header>
        <h2>{t('transformer.title')}</h2>
        <span className="badge transformer-badge">{t('transformer.badge')}</span>
      </header>
      <p className="panel-desc">{t('transformer.description')}</p>

      <div className="heatmap-wrap">
        <div
          className="heatmap"
          style={{
            gridTemplateColumns: `repeat(${size + 1}, minmax(28px, 1fr))`,
            gridTemplateRows: `repeat(${size + 1}, minmax(28px, 1fr))`,
          }}
        >
          <div className="heatmap-corner" />
          {tokens.map((tok, i) => (
            <div key={`col-${i}`} className="heatmap-label col-label" title={tok.text}>
              {tok.text.slice(0, 6)}
            </div>
          ))}
          {attention.map((row, rowIdx) => (
            <Fragment key={`row-${rowIdx}`}>
              <div className="heatmap-label row-label" title={tokens[rowIdx].text}>
                {tokens[rowIdx].text.slice(0, 6)}
              </div>
              {row.map((value, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="heatmap-cell"
                  style={{ background: attentionColor(value) }}
                  title={`${tokens[rowIdx].text} → ${tokens[colIdx].text}: ${value.toFixed(4)}`}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <MetricsPanel title={t('transformer.metricsTitle')} metrics={metrics} accent="transformer" />
    </div>
  )
}
