import { useState } from 'react'
import { Landing } from '../pages/Landing'
import { Upload } from '../capture/Upload'
import './App.css'

/*
 * Top-level shell and the only routing the app needs: the landing spread and the
 * survey table. No router library, no route transitions — a yardage book doesn't
 * fade between pages. Real state (pose, metrics) arrives in later milestones and
 * lives below this in context; there's nothing to hold yet.
 */

type View = 'landing' | 'upload'

export function App() {
  const [view, setView] = useState<View>('landing')

  return (
    <div className="app">
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
          <span className="label">Swing survey</span>
          <span className="masthead__stamp data">M0</span>
        </div>
      </header>

      <main className="app__main">
        {view === 'landing' ? (
          <Landing onStart={() => setView('upload')} />
        ) : (
          <Upload onBack={() => setView('landing')} />
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
