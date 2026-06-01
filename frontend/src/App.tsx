import { TextInput } from './components/TextInput'
import { TokenAnimation } from './components/TokenAnimation'
import { InfoFlowCompare } from './components/InfoFlowCompare'
import { PredictionCompare } from './components/PredictionCompare'
import { VisualizationDisclaimer } from './components/VisualizationDisclaimer'
import { SplitView } from './components/SplitView'
import { PipelineSteps } from './components/PipelineSteps'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { AnalysisTimer } from './components/AnalysisTimer'
import { useApp } from './context/AppContext'
import { useI18n } from './context/I18nContext'
import './App.css'

export default function App() {
  const { phase, reset } = useApp()
  const { t } = useI18n()
  const showReset = phase === 'tokenizing' || phase === 'results'

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-main">
          <p className="eyebrow">{t('header.eyebrow')}</p>
          <h1>{t('header.title')}</h1>
          <p className="subtitle">{t('header.subtitle')}</p>
        </div>
        <div className="app-header-actions">
          <LanguageSwitcher />
          {showReset && (
            <button type="button" className="btn ghost" onClick={reset}>
              {t('header.newAnalysis')}
            </button>
          )}
        </div>
      </header>

      <PipelineSteps />
      <AnalysisTimer />

      <main className="app-main">
        <TextInput />
        <TokenAnimation />
        <VisualizationDisclaimer />
        <InfoFlowCompare />
        <PredictionCompare />
        <SplitView />
      </main>
    </div>
  )
}
