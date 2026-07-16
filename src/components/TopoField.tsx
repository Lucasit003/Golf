import './TopoField.css'

/*
 * Topographic contour field — the elevation lines a caddie draws on a green,
 * here as an ambient backdrop. Concentric closed contours that drift slowly, so
 * the ground feels surveyed and alive without pulling focus. Decorative only.
 */

// A handful of nested, slightly irregular closed contours around a shared high
// point — like the rings around a green's crown.
const RINGS = [
  'M300 90 C430 96 520 190 512 320 C505 440 410 540 296 536 C176 532 92 430 96 306 C100 188 186 84 300 90 Z',
  'M300 150 C400 156 468 226 462 322 C456 410 384 484 298 480 C204 476 142 402 146 310 C150 220 214 144 300 150 Z',
  'M300 208 C372 214 420 262 416 326 C412 384 356 434 298 430 C236 426 196 376 200 316 C204 254 244 202 300 208 Z',
  'M300 264 C346 268 378 300 375 340 C372 378 336 408 298 405 C262 402 238 372 241 334 C244 296 266 260 300 264 Z',
  'M300 314 C326 316 344 336 342 360 C340 382 320 400 298 398 C278 396 264 378 266 356 C268 334 282 312 300 314 Z',
]

export function TopoField({ tone = 'light', className }: { tone?: 'light' | 'ink'; className?: string }) {
  return (
    <svg
      className={`topo topo--${tone}${className ? ` ${className}` : ''}`}
      viewBox="0 0 600 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      fill="none"
    >
      <g className="topo__drift">
        {RINGS.map((d, i) => (
          <path key={i} d={d} className="topo__ring" />
        ))}
        {/* The crown mark — the high point of the green. */}
        <circle cx="300" cy="356" r="3" className="topo__peak" />
      </g>
    </svg>
  )
}
