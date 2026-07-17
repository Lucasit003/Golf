import { useEffect, useRef, useState } from 'react'
import { Landing } from '../pages/Landing'
import { Upload } from '../capture/Upload'
import { CompareStudio } from '../capture/CompareStudio'
import { ScrollRule } from '../components/ScrollRule'
import './App.css'

/*
 * Top-level shell and the only routing the app needs: the landing spread and the
 * survey table. No router library, no route transitions — a yardage book doesn't
 * fade between pages. Real state (pose, metrics) arrives in later milestones and
 * lives below this in context; there's nothing to hold yet.
 */

type View = 'landing' | 'upload' | 'compare'

const TITLES: Record<View, string> = {
  landing: 'Contour — swing survey',
  upload: 'Survey · Contour',
  compare: 'Compare · Contour',
}

export function App() {
  const [view, setView] = useState<View>('landing')
  const mounted = useRef(false)

  // Per-view page title, and move focus to the main region when the view
  // changes (not on first load) so keyboard and screen-reader users land in the
  // new content instead of back at the top.
  useEffect(() => {
    document.title = TITLES[view]
    if (mounted.current) {
      document.getElementById('main')?.focus()
    } else {
      mounted.current = true
    }
  }, [view])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {view === 'landing' ? <ScrollRule /> : null}
      <header className="masthead">
        <button
          className="masthead__mark"
          onClick={() => setView('landing')}
          aria-label="Contour — home"
        >
          <span className="masthead__wordmark">Contour</span>
          <span className="masthead__glyph data" aria-hidden="true">
            ⌇
          </span>
        </button>
        <div className="masthead__meta">
          <nav className="masthead__nav" aria-label="Views">
            <button
              className={`masthead__link${view === 'upload' ? ' is-active' : ''}`}
              onClick={() => setView('upload')}
              aria-current={view === 'upload' ? 'page' : undefined}
            >
              Survey
            </button>
            <button
              className={`masthead__link${view === 'compare' ? ' is-active' : ''}`}
              onClick={() => setView('compare')}
              aria-current={view === 'compare' ? 'page' : undefined}
            >
              Compare
            </button>
          </nav>
          <span className="masthead__stamp data">M0</span>
        </div>
      </header>

      <main className="app__main" id="main" tabIndex={-1}>
        {view === 'landing' ? (
          <Landing onStart={() => setView('upload')} onCompare={() => setView('compare')} />
        ) : view === 'compare' ? (
          <CompareStudio onBack={() => setView('upload')} />
        ) : (
          <Upload onBack={() => setView('landing')} onCompare={() => setView('compare')} />
        )}
      </main>

      <footer className="colophon">
        <span className="label">Contour · a swing, surveyed</span>
        <span className="label colophon__note">
          Client-side · your footage stays on your device
        </span>
      </footer>
    </div>
  )
}
