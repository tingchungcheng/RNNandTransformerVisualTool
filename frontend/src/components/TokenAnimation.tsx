import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { useScrollToStage, TOKEN_PHASES } from '../hooks/useScrollToStage'
import './TokenAnimation.css'

function tokenKind(text: string): 'special' | 'subword' | 'word' {
  if (text === '[CLS]' || text === '[SEP]') return 'special'
  if (text.startsWith('##')) return 'subword'
  return 'word'
}

function displayText(text: string): string {
  return text.replace(/\n/g, '\\n')
}

export function TokenAnimation() {
  const { result, activeTokenIndex, phase, inputText } = useApp()
  const { t } = useI18n()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const visible = phase === 'loading' || phase === 'tokenizing' || phase === 'results'
  const sectionRef = useScrollToStage('token', TOKEN_PHASES, visible)

  if (!visible) return null

  const tokens = result?.tokens ?? []
  const total = tokens.length || 8
  const progress =
    phase === 'loading'
      ? 0
      : phase === 'tokenizing'
        ? ((activeTokenIndex + 1) / total) * 100
        : 100

  const activeToken = selectedIndex !== null ? tokens[selectedIndex] : tokens[activeTokenIndex]

  return (
    <section
      ref={sectionRef}
      className={`token-panel panel scroll-stage ${phase === 'tokenizing' ? 'token-panel--scanning' : ''} ${phase === 'results' ? 'token-panel--complete' : ''}`}
    >
      <div className="token-panel-header">
        <div>
          <h2>{t('token.title')}</h2>
          <p className="panel-desc">{t('token.description')}</p>
        </div>
        <div className="token-progress-wrap">
          <div className="token-progress-track">
            <div className="token-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="token-progress-label">
            {phase === 'loading' && t('token.fetching')}
            {phase === 'tokenizing' && `${Math.max(activeTokenIndex + 1, 0)} / ${total}`}
            {phase === 'results' && t('token.tokenCount', { count: total })}
          </span>
        </div>
      </div>

      <div className="source-text-box">
        <span className="source-label">{t('token.sourceLabel')}</span>
        <div className="source-text-inner">
          <p className="source-text">{inputText || '…'}</p>
          {phase === 'loading' && <div className="scanner-beam" />}
        </div>
      </div>

      <div className="split-indicator" aria-hidden>
        <span className="split-line" />
        <span className="split-icon">⬇</span>
        <span className="split-label">
          {phase === 'loading' ? t('token.preparing') : t('token.splitting')}
        </span>
        <span className="split-line" />
      </div>

      <div className={`token-stream ${phase === 'tokenizing' ? 'token-stream--live' : ''}`}>
        {phase === 'loading' &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="token-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}

        {result?.tokens.map((token, i) => {
          const revealed = i <= activeTokenIndex || phase === 'results'
          if (phase === 'tokenizing' && i > activeTokenIndex) return null

          const isActive = i === activeTokenIndex && phase === 'tokenizing'
          const isEntering = isActive && phase === 'tokenizing'
          const isHovered = hoveredIndex === i
          const isSelected = selectedIndex === i
          const kind = tokenKind(token.text)
          const shown = displayText(token.text)

          return (
            <button
              key={`${token.id}-${i}`}
              type="button"
              className={[
                'token-chip',
                `token-chip--${kind}`,
                revealed ? 'token-chip--revealed' : '',
                isEntering ? 'token-chip--entering' : '',
                isActive ? 'token-chip--active' : '',
                isHovered ? 'token-chip--hover' : '',
                isSelected ? 'token-chip--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setSelectedIndex(i === selectedIndex ? null : i)}
              disabled={!revealed}
              title={t('token.tooltip', { id: token.id, text: shown })}
            >
              <span className="token-index">{i}</span>
              <span className="token-text">{shown}</span>
              <span className="token-id">#{token.id}</span>
              {isActive && <span className="token-ring" aria-hidden />}
            </button>
          )
        })}
      </div>

      {activeToken && (phase === 'tokenizing' || phase === 'results') && (
        <div className="token-detail" key={`detail-${selectedIndex ?? activeTokenIndex}`}>
          <span className="token-detail-label">{t('token.detailLabel')}</span>
          <code className="token-detail-value">
            {displayText(activeToken.text)}{' '}
            <span className="token-detail-meta">
              {t('token.detailMeta', { id: activeToken.id })}
            </span>
          </code>
        </div>
      )}

      {phase === 'tokenizing' && (
        <div className="token-status">
          <span className="token-status-dot" />
          {t('token.statusTokenizing', {
            current: activeTokenIndex + 1,
            total,
          })}
        </div>
      )}

      {phase === 'results' && (
        <div className="token-status token-status--done">
          <span className="token-status-check">✓</span>
          {t('token.statusComplete')}
        </div>
      )}
    </section>
  )
}
