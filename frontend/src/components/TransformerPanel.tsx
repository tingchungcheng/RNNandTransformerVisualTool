/**
 * Right panel: BERT attention heatmap.
 * Row i, col j = normalized attention weight (last layer, mean over heads) — relative display only.
 */
import { Fragment, type CSSProperties } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { MetricsPanel } from './MetricsPanel'
import './TransformerPanel.css'

function attentionColor(value: number): string {
  const alpha = Math.min(1, value * 3 + 0.05)
  return `rgba(167, 139, 250, ${alpha})`
}

/** Fixed cell size so long sentences scroll instead of shrinking. */
function heatmapCellPx(tokenCount: number): number {
  if (tokenCount > 20) return 24
  if (tokenCount > 14) return 28
  if (tokenCount > 10) return 32
  return 36
}

function labelText(text: string, cellPx: number): string {
  const max = cellPx >= 36 ? 12 : cellPx >= 32 ? 10 : 8
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function TransformerPanel() {
  const { result, phase } = useApp()
  const { t } = useI18n()

  if (!result || phase !== 'results') return null

  const { attention, metrics } = result.transformer
  const tokens = result.tokens
  const size = tokens.length
  const cellPx = heatmapCellPx(size)

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
            '--heatmap-cell': `${cellPx}px`,
            gridTemplateColumns: `auto repeat(${size}, ${cellPx}px)`,
            gridTemplateRows: `auto repeat(${size}, ${cellPx}px)`,
          } as CSSProperties}
        >
          <div className="heatmap-corner" />
          {tokens.map((tok, i) => (
            <div key={`col-${i}`} className="heatmap-label col-label" title={tok.text}>
              {labelText(tok.text, cellPx)}
            </div>
          ))}
          {attention.map((row, rowIdx) => (
            <Fragment key={`row-${rowIdx}`}>
              <div className="heatmap-label row-label" title={tokens[rowIdx].text}>
                {labelText(tokens[rowIdx].text, cellPx)}
              </div>
              {row.map((value, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="heatmap-cell"
                  style={{ background: attentionColor(value) }}
                  title={t('transformer.cellTooltip', {
                    from: tokens[rowIdx].text,
                    to: tokens[colIdx].text,
                    value: value.toFixed(4),
                  })}
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
