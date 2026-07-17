import { useEffect, useRef, useState } from 'react'
import { usePrefs } from './prefs'
import './Settings.css'

/*
 * A small settings popover in the masthead. Reduced-motion and the default
 * playback speed — the two preferences that actually change how the app feels.
 * Closes on outside click or Escape; nothing here touches the network.
 */

const SPEEDS = [1, 0.5, 0.25, 0.1]

export function Settings() {
  const { prefs, setPrefs } = usePrefs()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="settings" ref={ref}>
      <button
        className="settings__gear"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="settings__panel" role="dialog" aria-label="Settings">
          <div className="settings__row">
            <label className="settings__label" htmlFor="reduce-motion">
              Reduce motion
              <span className="settings__hint">Turn off the animations</span>
            </label>
            <button
              id="reduce-motion"
              role="switch"
              aria-checked={prefs.reduceMotion}
              className={`switch${prefs.reduceMotion ? ' switch--on' : ''}`}
              onClick={() => setPrefs({ reduceMotion: !prefs.reduceMotion })}
            >
              <span className="switch__dot" />
            </button>
          </div>

          <div className="settings__row settings__row--stack">
            <span className="settings__label">
              Default speed
              <span className="settings__hint">How the video tools open</span>
            </span>
            <div className="settings__speeds">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`settings__speed${prefs.defaultSpeed === s ? ' is-active' : ''}`}
                  onClick={() => setPrefs({ defaultSpeed: s })}
                  aria-pressed={prefs.defaultSpeed === s}
                >
                  {s === 1 ? '1×' : `${s}×`}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
