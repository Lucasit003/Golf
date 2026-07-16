import { useEffect, useState } from 'react'

/*
 * Count a number up to its target once `active` turns true — used so measured
 * ranges tick into place as they scroll in, like a gauge settling. Reduced
 * motion jumps straight to the final value.
 */
export function useCountUp(target: number, active: boolean, opts?: { duration?: number; decimals?: number }) {
  const duration = opts?.duration ?? 900
  const decimals = opts?.decimals ?? 0
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [value, setValue] = useState(active && !prefersReduced ? 0 : target)

  useEffect(() => {
    if (!active) return
    if (prefersReduced) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Number((target * eased).toFixed(decimals)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration, decimals, prefersReduced])

  return value.toFixed(decimals)
}
