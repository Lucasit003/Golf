import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Landing } from '../pages/Landing'
import { Upload } from '../capture/Upload'
import { CompareStudio, type ReferenceSeed } from '../capture/CompareStudio'
import { ScrollRule } from '../components/ScrollRule'
import { useLocker } from '../locker/store'
import { Crest } from '../locker/Avatar'

// The library pulls in the Supabase client; load it only when opened so the
// landing and survey stay light. The locker is small but self-contained, so it
// splits out too.
const Community = lazy(() =>
  import('../community/Community').then((m) => ({ default: m.Community })),
)
const Locker = lazy(() => import('../locker/Locker').then((m) => ({ default: m.Locker })))
import { Settings } from './Settings'
import './App.css'

/*
 * Top-level shell and the only routing the app needs: the landing spread and the
 * survey table. No router library, no route transitions — a yardage book doesn't
 * fade between pages. Real state (pose, metrics) arrives in later milestones and
 * lives below this in context; there's nothing to hold yet.
 */

type View = 'landing' | 'upload' | 'compare' | 'library' | 'locker'

const TITLES: Record<View, string> = {
  landing: "Setji's Swings — swing survey",
  upload: "Survey · Setji's Swings",
  compare: "Compare · Setji's Swings",
  library: "Library · Setji's Swings",
  locker: "Locker · Setji's Swings",
}

export function App() {
  const [view, setView] = useState<View>('landing')
  // A reference clip carried into the compare studio (e.g. from the library).
  const [compareRef, setCompareRef] = useState<ReferenceSeed | null>(null)
  const mounted = useRef(false)

  // Enter the compare studio, optionally seeded with a reference swing. Opening
  // it any other way (nav, landing) clears a stale seed.
  function goCompare(ref: ReferenceSeed | null = null) {
    setCompareRef(ref)
    setView('compare')
  }

  // Per-view page title, and move focus to the main region when the view
  // changes (not on first load) so keyboard and screen-reader users land in the
  // new content instead of back at the top.
  useEffect(() => {
    document.title = TITLES[view]
    if (mounted.current) {
      // Start the new view at its top, and focus the main region WITHOUT
      // scrolling — a plain focus() would scroll main under the sticky masthead
      // and clip the heading.
      window.scrollTo(0, 0)
      document.getElementById('main')?.focus({ preventScroll: true })
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
          aria-label="Setji's Swings — home"
        >
          <img
            className="masthead__logo"
            src="/brand/logo-mark.png"
            alt=""
            width="46"
            height="37"
            aria-hidden="true"
          />
          <span className="masthead__wordmark">
            <span className="masthead__wordmark-set">Setji's</span>{' '}
            <span className="masthead__wordmark-swing">Swings</span>
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
              onClick={() => goCompare()}
              aria-current={view === 'compare' ? 'page' : undefined}
            >
              Compare
            </button>
            <button
              className={`masthead__link${view === 'library' ? ' is-active' : ''}`}
              onClick={() => setView('library')}
              aria-current={view === 'library' ? 'page' : undefined}
            >
              Library
            </button>
          </nav>
          <LockerChip active={view === 'locker'} onOpen={() => setView('locker')} />
          <Settings />
        </div>
      </header>

      <main className="app__main" id="main" tabIndex={-1}>
        {view === 'landing' ? (
          <Landing onStart={() => setView('upload')} onCompare={() => goCompare()} />
        ) : view === 'compare' ? (
          <CompareStudio onBack={() => setView('upload')} initialReference={compareRef} />
        ) : view === 'library' ? (
          <Suspense fallback={<p className="app__loading label">Loading the library…</p>}>
            <Community
              onBack={() => setView('landing')}
              onCompareWith={(ref) => goCompare(ref)}
            />
          </Suspense>
        ) : view === 'locker' ? (
          <Suspense fallback={<p className="app__loading label">Loading the locker…</p>}>
            <Locker onFilm={() => setView('upload')} />
          </Suspense>
        ) : (
          <Upload onBack={() => setView('landing')} onCompare={() => goCompare()} />
        )}
      </main>

      <footer className="colophon">
        <span className="label">Setji's Swings · a swing, surveyed</span>
        <span className="label colophon__note">
          Client-side · analysis runs on your device
        </span>
      </footer>
    </div>
  )
}

/*
 * The locker entry: your crest and key count in the masthead, the way a profile
 * chip sits in the corner of an app. Tapping it opens the locker. Kept out of
 * the main nav so the survey stays the front door.
 */
function LockerChip({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const { state } = useLocker()
  return (
    <button
      className={`masthead__locker${active ? ' is-active' : ''}`}
      onClick={onOpen}
      aria-label={`Your locker — ${state.keys} keys`}
      aria-current={active ? 'page' : undefined}
    >
      <Crest equip={state.equip} className="masthead__locker-crest" />
      <span className="masthead__locker-keys data">
        <span aria-hidden="true">🔑</span>
        {state.keys}
      </span>
    </button>
  )
}
