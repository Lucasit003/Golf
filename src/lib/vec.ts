/*
 * Vector math — pure, no domain knowledge, the base everything else stands on.
 *
 * Per the swing-metrics skill: test these first. A sign error here surfaces as a
 * mysterious biomechanics bug three layers up, so every function is small and
 * separately verifiable. Operates on plain {x,y,z}; never mutates its inputs.
 */

export type Vec3 = { x: number; y: number; z: number }

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })

export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

export const scale = (v: Vec3, k: number): Vec3 => ({ x: v.x * k, y: v.y * k, z: v.z * k })

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

export const length = (v: Vec3): number => Math.sqrt(dot(v, v))

export const midpoint = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5)

export const degrees = (rad: number): number => (rad * 180) / Math.PI

export const radians = (deg: number): number => (deg * Math.PI) / 180

/** Unit vector. Returns a zero vector for a zero-length input rather than NaNs. */
export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  return len === 0 ? { x: 0, y: 0, z: 0 } : scale(v, 1 / len)
}

/** Unsigned angle between two vectors, in radians (0…π). Order-independent. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const la = length(a)
  const lb = length(b)
  if (la === 0 || lb === 0) return 0
  // clamp guards against float drift pushing the ratio just past ±1
  const cos = Math.min(1, Math.max(-1, dot(a, b) / (la * lb)))
  return Math.acos(cos)
}

/**
 * Signed angle from a to b measured about normal n, in radians (−π…π).
 * Positive follows the right-hand rule around n. This is what X-factor needs —
 * the sign tells you which way the separation runs, and it's easy to get wrong.
 */
export function signedAngle(a: Vec3, b: Vec3, n: Vec3): number {
  const unsigned = angleBetween(a, b)
  const sign = dot(cross(a, b), n)
  return sign < 0 ? -unsigned : unsigned
}

/** Drop the component of v along n, leaving v's projection into the plane ⊥ n. */
export function projectOntoPlane(v: Vec3, n: Vec3): Vec3 {
  const un = normalize(n)
  return sub(v, scale(un, dot(v, un)))
}
