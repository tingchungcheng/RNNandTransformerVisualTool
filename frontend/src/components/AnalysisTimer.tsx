import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { formatMs } from '../utils/formatTime'
import './AnalysisTimer.css'

export function AnalysisTimer() {
  const { phase, timing } = useApp()
  const { t } = useI18n()

  if (phase === 'input') return null

  const { apiMs, elapsedMs, totalMs } = timing
  const running = totalMs === null

  return (
    <div className={`analysis-timer ${running ? 'analysis-timer--live' : 'analysis-timer--done'}`}>
      <span className="analysis-timer-icon" aria-hidden>
        {running ? '◷' : '✓'}
      </span>
      <div className="analysis-timer-stats">
        {apiMs !== null && (
          <span className="analysis-timer-stat">
            {t('timing.api', { time: formatMs(apiMs) })}
          </span>
        )}
        <span className="analysis-timer-stat analysis-timer-stat--primary">
          {running
            ? t('timing.elapsed', { time: formatMs(elapsedMs) })
            : t('timing.total', { time: formatMs(totalMs!) })}
        </span>
      </div>
      {running && <span className="analysis-timer-pulse" aria-hidden />}
    </div>
  )
}
