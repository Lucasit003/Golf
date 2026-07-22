import { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'

/*
 * Catches a render-time crash and shows a calm, honest fallback instead of a
 * white screen. In the spirit of the app's error voice: name what happened and
 * the way out, no apology theatre. Everything is on-device, so "reload" really
 * does start clean.
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // No backend to report to — surface it in the console for local debugging.
    console.error("Setjis Swing hit an unexpected error:", error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash" role="alert">
        <div className="crash__card">
          <p className="label crash__eyebrow">Something broke</p>
          <h1 className="crash__title">The survey stopped.</h1>
          <p className="crash__body">
            Setjis Swing hit an error it didn't expect. Nothing left your device, and reloading
            starts clean.
          </p>
          <button className="crash__btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          {this.state.error.message ? (
            <pre className="crash__detail data">{this.state.error.message}</pre>
          ) : null}
        </div>
      </div>
    )
  }
}
