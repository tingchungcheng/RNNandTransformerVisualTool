import { useApp } from '../context/AppContext'
import { RNNPanel } from './RNNPanel'
import { TransformerPanel } from './TransformerPanel'
import './SplitView.css'

export function SplitView() {
  const { phase } = useApp()

  if (phase !== 'results') return null

  return (
    <section className="split-view">
      <RNNPanel />
      <div className="split-divider" aria-hidden />
      <TransformerPanel />
    </section>
  )
}
