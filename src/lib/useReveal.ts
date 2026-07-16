import { useEffect, useRef, useState } from 'react'

/*
 * Reveal-on-scroll. Returns a ref to attach and a boolean that flips true the
 * first time the element enters the viewport, so content can rise into place as
 * the page is read. Fires once, then disconnects.
 *
 * Respects reduced motion by resolving to "shown" immediately — there's nothing
 * to reveal if there's nothing to animate.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState<boolean>(!!prefersReduced)

  useEffect(() => {
    if (shown) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { rootMargin, threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown, rootMargin])

  return { ref, shown }
}
