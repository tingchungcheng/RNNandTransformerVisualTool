import { useApp } from '../context/AppContext'
import { useScrollToStage } from '../hooks/useScrollToStage'
import { RNNPanel } from './RNNPanel'
import { TransformerPanel } from './TransformerPanel'
import './SplitView.css'

export function SplitView() {
  const { phase } = useApp()
  const sectionRef = useScrollToStage('results', phase === 'results')

  if (phase !== 'results') return null

  return (
    <section ref={sectionRef} className="split-view scroll-stage">
      <RNNPanel />
      <div className="split-divider" aria-hidden />
      <TransformerPanel />
    </section>
  )
}
