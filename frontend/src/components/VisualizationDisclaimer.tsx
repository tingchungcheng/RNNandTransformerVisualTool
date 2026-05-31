import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import './VisualizationDisclaimer.css'

export function VisualizationDisclaimer() {
  const { phase } = useApp()
  const { t } = useI18n()

  const visible =
    phase === 'tokenizing' || phase === 'results'

  if (!visible) return null

  return (
    <aside className="viz-disclaimer" role="note">
      <span className="viz-disclaimer-icon" aria-hidden>
        ⓘ
      </span>
      <div>
        <strong>{t('disclaimer.title')}</strong>
        <p>{t('disclaimer.body')}</p>
      </div>
    </aside>
  )
}
