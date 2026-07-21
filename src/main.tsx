import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './design/tokens.css'
import './styles/global.css'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import { PrefsProvider } from './app/prefs'
import { LockerProvider } from './locker/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PrefsProvider>
        <LockerProvider>
          <App />
        </LockerProvider>
      </PrefsProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Offline support in production builds only — keeps the dev server clean.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is a nice-to-have; never block the app on it */
    })
  })
}
