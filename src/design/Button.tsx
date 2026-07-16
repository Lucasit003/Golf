import './Button.css'
import type { ButtonHTMLAttributes } from 'react'

/*
 * A button says what happens. "Upload a swing." "Measure." Never "Get started."
 * Two weights: solid (primary action) and line (secondary). Nearly square, like
 * a stamp on paper.
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'line'
}

export function Button({ variant = 'solid', className, children, ...rest }: Props) {
  return (
    <button className={`btn btn--${variant}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </button>
  )
}
