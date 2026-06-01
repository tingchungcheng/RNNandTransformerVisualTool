import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { useScrollToStage, RESULTS_PHASES } from '../hooks/useScrollToStage'
import './InfoFlowCompare.css'

const MAX_MESH_TOKENS = 16

function formatTokenText(text: string): string {
  return text.replace(/\n/g, '\\n')
}

interface LinkSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  d: string
}

function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const spread = Math.hypot(x2 - x1, y2 - y1)

  if (Math.abs(y2 - y1) < 10) {
    const lift = 14 + spread * 0.1
    const cy = Math.min(y1, y2) - lift
    return `M ${x1} ${y1} Q ${mx} ${cy} ${x2} ${y2}`
  }

  const bend = spread * 0.2
  const cy = my - bend
  return `M ${x1} ${y1} Q ${mx} ${cy} ${x2} ${y2}`
}

export function InfoFlowCompare() {
  const { result, phase, rnnStep, activeTokenIndex } = useApp()
  const { t } = useI18n()

  const visible = Boolean(result) && phase !== 'input' && phase !== 'loading'
  const tokens = result?.tokens ?? []
  const showMesh = tokens.length <= MAX_MESH_TOKENS
  const measureKey = `${tokens.length}-${tokens.map((tok) => tok.text).join('|')}-${phase}-${rnnStep}`

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

  const rnnVisibleThrough =
    phase === 'results' ? Math.min(rnnStep, tokens.length - 1) : activeTokenIndex
  const rnnActive =
    phase === 'results' ? Math.min(rnnStep, tokens.length - 1) : activeTokenIndex

  const tfMeshThrough =
    phase === 'results' ? tokens.length - 1 : activeTokenIndex

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
        meshPairs.map(([a, b]) => {
          const x1 = centers[a]!.x
          const y1 = centers[a]!.y
          const x2 = centers[b]!.x
          const y2 = centers[b]!.y
          return { x1, y1, x2, y2, d: arcPath(x1, y1, x2, y2) }
        }),
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tfStageRef.current)
    return () => observer.disconnect()
  }, [showMesh, tokens.length, meshPairs, tfMeshThrough, phase, measureKey])

  if (!visible || !result) return null

  return (
    <section ref={sectionRef} className="info-flow panel scroll-stage">
      <div className="info-flow-header">
        <div>
          <h2>{t('flow.title')}</h2>
          <p className="panel-desc">{t('flow.description')}</p>
        </div>
      </div>

      <div className="info-flow-grid">
        <div className="info-flow-col info-flow-col--rnn">
          <div className="info-flow-col-head">
            <span className="info-flow-model">RNN</span>
            <span className="info-flow-tag info-flow-tag--rnn">{t('flow.rnnSequential')}</span>
          </div>

          <div className="flow-stage">
            <div className="rnn-flow-track">
              {tokens.map((token, i) => {
                if (i > rnnVisibleThrough) return null

                const isToken = i === 0
                const isActive = i === rnnActive
                const isPast = i < rnnActive
                const stateStep = i

                return (
                  <div key={`rnn-${i}`} className="rnn-flow-step">
                    {i > 0 && (
                      <div className={`rnn-flow-arrow ${isPast || isActive ? 'rnn-flow-arrow--live' : ''}`}>
                        <span className="rnn-flow-arrow-line" />
                        <span className="rnn-flow-arrow-head" aria-hidden>→</span>
                        <span className="rnn-flow-packet" />
                      </div>
                    )}
                    <div
                      className={[
                        'flow-node',
                        isToken ? 'flow-node--rnn-token' : 'flow-node--rnn-state',
                        isActive ? 'flow-node--active' : '',
                        isPast ? 'flow-node--past' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={token.text}
                    >
                      <span className="flow-node-kind">
                        {isToken ? t('flow.token') : t('flow.stateStep', { step: stateStep })}
                      </span>
                      <span className="flow-node-text">{formatTokenText(token.text)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="info-flow-caption">{t('flow.rnnCaption')}</p>
        </div>

        <div className="info-flow-col info-flow-col--tf">
          <div className="info-flow-col-head">
            <span className="info-flow-model">Transformer</span>
            <span className="info-flow-tag info-flow-tag--tf">{t('flow.transformerParallel')}</span>
          </div>

          <div className="flow-stage">
            <div className="tf-flow-stage" ref={tfStageRef}>
              {showMesh && meshLinks.length > 0 && (
                <svg className="tf-flow-mesh" aria-hidden>
                  {meshLinks.map((link, idx) => {
                    const [a, b] = meshPairs[idx] ?? [0, 0]
                    const lit = a <= tfMeshThrough && b <= tfMeshThrough
                    return (
                      <path
                        key={`link-${a}-${b}`}
                        d={link.d}
                        fill="none"
                        className={`tf-flow-link ${lit ? 'tf-flow-link--lit' : ''}`}
                        style={{ animationDelay: `${idx * 0.06}s` }}
                      />
                    )
                  })}
                </svg>
              )}

              <div className="tf-flow-track">
                {tokens.map((token, i) => {
                  const inMesh = i <= tfMeshThrough
                  return (
                    <div key={`tf-${i}`} className="tf-flow-step">
                      <div
                        ref={(el) => {
                          tfNodeRefs.current[i] = el
                        }}
                        className={[
                          'flow-node',
                          'flow-node--tf-token',
                          inMesh ? 'flow-node--past' : '',
                          inMesh && phase === 'results' ? 'flow-node--tf-live' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={token.text}
                      >
                        <span className="flow-node-kind">{t('flow.token')}</span>
                        <span className="flow-node-text">{formatTokenText(token.text)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {!showMesh && (
                <p className="tf-flow-mesh-note">{t('flow.meshOmitted')}</p>
              )}
            </div>
          </div>

          <p className="info-flow-caption">{t('flow.transformerCaption')}</p>
        </div>
      </div>
    </section>
  )
}
