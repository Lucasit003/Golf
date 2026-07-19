import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/*
 * User preferences, persisted to localStorage — a small settings surface that
 * makes the app feel like something you own, not a demo. Everything is local;
 * there's no account and nothing leaves the device.
 *
 * - reduceMotion: an explicit motion toggle, on top of the OS setting. When on,
 *   a data attribute on the root disables the app's animations (see global.css).
 * - defaultSpeed: the playback speed the video tools open at.
 */

export type Theme = 'system' | 'light' | 'dark'

export type Prefs = {
  reduceMotion: boolean
  defaultSpeed: number
  theme: Theme
}

const DEFAULTS: Prefs = { reduceMotion: false, defaultSpeed: 1, theme: 'system' }
const KEY = 'setjis.prefs'

function load(): Prefs {
  if (typeof localStorage === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

type Ctx = { prefs: Prefs; setPrefs: (patch: Partial<Prefs>) => void }
const PrefsContext = createContext<Ctx | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* private mode / storage full — preferences just won't persist */
    }
    document.documentElement.toggleAttribute('data-motion-off', prefs.reduceMotion)
    // theme: 'system' follows the OS (no attribute); light/dark force it.
    const root = document.documentElement
    if (prefs.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', prefs.theme)
  }, [prefs])

  const setPrefs = (patch: Partial<Prefs>) => setState((p) => ({ ...p, ...patch }))

  return <PrefsContext.Provider value={{ prefs, setPrefs }}>{children}</PrefsContext.Provider>
}

export function usePrefs(): Ctx {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>')
  return ctx
}
