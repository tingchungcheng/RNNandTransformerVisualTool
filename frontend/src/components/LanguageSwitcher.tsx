import { useI18n } from '../context/I18nContext'
import type { Locale } from '../i18n'
import './LanguageSwitcher.css'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="lang-switcher" role="group" aria-label={t('lang.label')}>
      {(['en', 'zh-CN'] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-switcher-btn ${locale === code ? 'active' : ''}`}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  )
}
