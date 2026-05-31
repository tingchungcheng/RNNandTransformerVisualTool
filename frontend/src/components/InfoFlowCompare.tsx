import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { useScrollToStage, RESULTS_PHASES } from '../hooks/useScrollToStage'
import { FlowTrackScaler } from './FlowTrackScaler'
import './InfoFlowCompare.css'

const MAX_MESH_TOKENS = 14

function formatTokenText(text: string): string {
  return text.replace(/\n/g, '\\n')
}

function nodeWidth(tokenCount: number): string {
  if (tokenCount > 14) return '4.75rem'
  if (tokenCount > 10) return '5.25rem'
  if (tokenCount > 6) return '5.75rem'
  return '6.25rem'
}

interface LinkSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function InfoFlowCompare() {
  const { result, phase, rnnStep, activeTokenIndex } = useApp()
  const { t } = useI18n()

  const visible = Boolean(result) && phase !== 'input' && phase !== 'loading'
  const tokens = result?.tokens ?? []
  const showMesh = tokens.length <= MAX_MESH_TOKENS
  const flowNodeW = nodeWidth(tokens.length)
  const measureKey = `${tokens.length}-${tokens.map((t) => t.text).join('|')}`

  const tfStageRef = useRef<HTMLDivElement>(null)
  const tfNodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [meshLinks, setMeshLinks] = useState<LinkSegment[]>([])

  const meshPairs = useMemo(() => {
    const pairs: [number, number][] = []
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        pairs.push([i, j])
      }
    }
    return pairs
  }, [tokens.length])

  const sectionRef = useScrollToStage('info-flow', RESULTS_PHASES, visible)

  const rnnActive = phase === 'results' ? rnnStep : activeTokenIndex
  const tfActive =
    phase === 'results' ? Math.min(rnnStep, tokens.length - 1) : activeTokenIndex

  useLayoutEffect(() => {
    if (!showMesh || !tfStageRef.current || tokens.length === 0) {
      setMeshLinks([])
      return
    }

    const measure = () => {
      const stage = tfStageRef.current
      if (!stage) return

      const stageRect = stage.getBoundingClientRect()
      const centers = tfNodeRefs.current.map((node) => {
        if (!node) return null
        const rect = node.getBoundingClientRect()
        return {
          x: rect.left + rect.width / 2 - stageRect.left,
          y: rect.top + rect.height / 2 - stageRect.top,
        }
      })

      if (centers.some((c) => c === null)) return

      setMeshLinks(
        meshPairs.map(([a, b]) => ({
          x1: centers[a]!.x,
          y1: centers[a]!.y,
          x2: centers[b]!.x,
          y2: centers[b]!.y,
        })),
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tfStageRef.current)
    return () => observer.disconnect()
  }, [showMesh, tokens.length, meshPairs, rnnActive, tfActive, phase, measureKey])

  if (!visible || !result) return null

  return (
    <section ref={sectionRef} className="info-flow panel scroll-stage">
      <div className="info-flow-header">
        <div>
          <h2>{t('flow.title')}</h2>
          <p className="panel-desc">{t('flow.description')}</p>
        </div>
      </div>

      <div
        className="info-flow-grid"
        style={{ '--flow-node-w': flowNodeW } as CSSProperties}
      >
        <div className="info-flow-col info-flow-col--rnn">
          <div className="info-flow-col-head">
            <span className="info-flow-model">RNN</span>
            <span className="info-flow-tag info-flow-tag--rnn">{t('flow.rnnCompress')}</span>
          </div>

          <FlowTrackScaler measureKey={measureKey}>
            <div className="rnn-flow-track">
              {tokens.map((token, i) => {
                const isToken = i === 0
                const isActive = i === rnnActive
                const isPast = i < rnnActive
                const compressScale = isToken ? 1 : Math.max(0.88, 1 - i * 0.02)

                return (
                  <div key={`rnn-${i}`} className="rnn-flow-step">
                    {i > 0 && (
                      <div className={`rnn-flow-arrow ${isPast || isActive ? 'rnn-flow-arrow--live' : ''}`}>
                        <span className="rnn-flow-arrow-line" />
                        <span className="rnn-flow-arrow-head">→</span>
                        <span className="rnn-flow-packet" />
                      </div>
                    )}
                    <div
                      className={[
                        'flow-node',
                        isToken ? 'flow-node--token' : 'flow-node--state',
                        isActive ? 'flow-node--active' : '',
                        isPast ? 'flow-node--past' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ transform: `scale(${compressScale})` }}
                      title={token.text}
                    >
                      <span className="flow-node-kind">
                        {isToken ? t('flow.token') : t('flow.state')}
                      </span>
                      <span className="flow-node-text">{formatTokenText(token.text)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </FlowTrackScaler>

          <p className="info-flow-caption">{t('flow.rnnCaption')}</p>
        </div>

        <div className="info-flow-col info-flow-col--tf">
          <div className="info-flow-col-head">
            <span className="info-flow-model">Transformer</span>
            <span className="info-flow-tag info-flow-tag--tf">{t('flow.transformerConnect')}</span>
          </div>

          <FlowTrackScaler measureKey={measureKey}>
            <div className="tf-flow-stage" ref={tfStageRef}>
              {showMesh && meshLinks.length > 0 && (
                <svg className="tf-flow-mesh" aria-hidden>
                  {meshLinks.map((link, idx) => {
                    const [a, b] = meshPairs[idx] ?? [0, 0]
                    const lit = a <= tfActive && b <= tfActive
                    return (
                      <line
                        key={`link-${a}-${b}`}
                        x1={link.x1}
                        y1={link.y1}
                        x2={link.x2}
                        y2={link.y2}
                        className={`tf-flow-link ${lit ? 'tf-flow-link--lit' : ''}`}
                        style={{ animationDelay: `${idx * 0.08}s` }}
                      />
                    )
                  })}
                </svg>
              )}

              <div className="tf-flow-track">
                {tokens.map((token, i) => {
                  const isActive = i === tfActive
                  const isLit = i <= tfActive
                  return (
                    <div key={`tf-${i}`} className="tf-flow-step">
                      {i > 0 && (
                        <span className={`tf-flow-bridge ${isLit ? 'tf-flow-bridge--lit' : ''}`}>↔</span>
                      )}
                      <div
                        ref={(el) => {
                          tfNodeRefs.current[i] = el
                        }}
                        className={[
                          'flow-node',
                          'flow-node--token',
                          isActive ? 'flow-node--active' : '',
                          isLit ? 'flow-node--past' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={token.text}
                      >
                        <span className="flow-node-kind">{t('flow.token')}</span>
                        <span className="flow-node-text">{formatTokenText(token.text)}</span>
                        {isActive && <span className="flow-node-ring" aria-hidden />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </FlowTrackScaler>

          <p className="info-flow-caption">{t('flow.transformerCaption')}</p>
        </div>
      </div>
    </section>
  )
}
