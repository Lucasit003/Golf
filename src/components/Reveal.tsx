import type { ReactNode } from 'react'
import { useReveal } from '../lib/useReveal'
import './Reveal.css'

/*
 * Wraps content so it rises into place the first time it scrolls into view.
 * `delay` staggers siblings. Purely presentational — content is in the DOM and
 * readable regardless, and reduced motion shows it immediately.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode
  delay?: number
  as?: 'div' | 'li' | 'section'
  className?: string
}) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <Tag
      ref={ref as never}
      className={`reveal${shown ? ' reveal--in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
