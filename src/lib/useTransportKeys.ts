import { useEffect } from 'react'

/*
 * Keyboard transport for the video tools: Space toggles play, ←/→ step a frame.
 * The reflex of anyone who studies video. Ignored while a form control has focus
 * (including the scrub range and the speed buttons) so it never double-fires or
 * hijacks typing.
 */
export function useTransportKeys({
  enabled,
  onToggle,
  onStep,
}: {
  enabled: boolean
  onToggle: () => void
  onStep: (dir: 1 | -1) => void
}) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      if (el?.isContentEditable) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onToggle()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onStep(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onStep(1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onToggle, onStep])
}
