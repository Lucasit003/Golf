import './ScrollRule.css'

/*
 * A surveyor's measuring tape pinned to the left margin that draws itself as you
 * scroll the page — a fill that grows top-to-bottom and a station dot that rides
 * the current scroll position. Built on CSS scroll-driven animations
 * (animation-timeline: scroll()), so it's tied to scroll progress, not time.
 *
 * Purely decorative and progressively enhanced: where scroll timelines aren't
 * supported, or reduced motion is set, it simply stays a quiet static rule.
 */
export function ScrollRule() {
  return (
    <div className="srule" aria-hidden="true">
      <div className="srule__track" />
      <div className="srule__fill" />
      <div className="srule__station" />
      <div className="srule__ticks">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="srule__tick" style={{ top: `${(i / 8) * 100}%` }} />
        ))}
      </div>
    </div>
  )
}
