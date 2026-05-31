import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { loadRandomExample } from '../utils/examples'
import './TextInput.css'

export function TextInput() {
  const { inputText, setInputText, submit, error, phase } = useApp()
  const { t } = useI18n()
  const busy = phase === 'loading' || phase === 'tokenizing'
  const [loadingExample, setLoadingExample] = useState(false)

  useEffect(() => {
    loadRandomExample().catch(() => {})
  }, [])

  const handleLoadExample = useCallback(async () => {
    setLoadingExample(true)
    try {
      const sentence = await loadRandomExample(inputText)
      setInputText(sentence)
    } catch {
      setInputText('The cat sat on the mat.')
    } finally {
      setLoadingExample(false)
    }
  }, [inputText, setInputText])

  return (
    <section className="panel input-panel">
      <div className="input-panel-top">
        <div>
          <h2>{t('input.title')}</h2>
          <p className="panel-desc">{t('input.description')}</p>
        </div>
        <div className="char-count">{t('input.chars', { count: inputText.length })}</div>
      </div>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={t('input.placeholder')}
        rows={3}
        disabled={busy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
      />
      <p className="input-hint">{t('input.hint')}</p>
      <div className="input-actions">
        <button type="button" className="btn primary" onClick={submit} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" />
              {t('input.analyzing')}
            </>
          ) : (
            <>{t('input.analyze')}</>
          )}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={handleLoadExample}
          disabled={busy || loadingExample}
        >
          {loadingExample ? t('input.loadingExample') : t('input.loadExample')}
        </button>
      </div>
      {error && <p className="error-msg">{t(error)}</p>}
    </section>
  )
}
