import { describe, it, expect } from 'vitest'
import {
  vec,
  add,
  sub,
  scale,
  dot,
  cross,
  length,
  normalize,
  midpoint,
  degrees,
  radians,
  angleBetween,
  signedAngle,
  projectOntoPlane,
} from './vec'

const X = vec(1, 0, 0)
const Y = vec(0, 1, 0)
const Z = vec(0, 0, 1)
const deg = (v: number) => degrees(v)

describe('basic algebra', () => {
  it('adds and subtracts componentwise', () => {
    expect(add(vec(1, 2, 3), vec(4, 5, 6))).toEqual(vec(5, 7, 9))
    expect(sub(vec(4, 5, 6), vec(1, 2, 3))).toEqual(vec(3, 3, 3))
  })

  it('scales', () => {
    expect(scale(vec(1, -2, 3), 2)).toEqual(vec(2, -4, 6))
  })

  it('does not mutate inputs', () => {
    const a = vec(1, 1, 1)
    add(a, vec(1, 1, 1))
    expect(a).toEqual(vec(1, 1, 1))
  })

  it('dot and cross follow the right-hand rule', () => {
    expect(dot(X, Y)).toBe(0)
    expect(dot(X, X)).toBe(1)
    expect(cross(X, Y)).toEqual(Z)
    expect(cross(Y, X)).toEqual(vec(0, 0, -1))
  })

  it('length and midpoint', () => {
    expect(length(vec(3, 4, 0))).toBe(5)
    expect(midpoint(vec(0, 0, 0), vec(2, 4, 6))).toEqual(vec(1, 2, 3))
  })
})

describe('normalize', () => {
  it('returns a unit vector', () => {
    expect(length(normalize(vec(0, 3, 4)))).toBeCloseTo(1, 12)
  })
  it('returns zero for a zero vector instead of NaN', () => {
    expect(normalize(vec(0, 0, 0))).toEqual(vec(0, 0, 0))
  })
})

describe('degrees / radians round-trip', () => {
  it('converts both ways', () => {
    expect(deg(Math.PI)).toBeCloseTo(180)
    expect(radians(90)).toBeCloseTo(Math.PI / 2)
  })
})

describe('angleBetween (unsigned)', () => {
  it('is 90° for orthogonal vectors', () => {
    expect(deg(angleBetween(X, Y))).toBeCloseTo(90)
  })
  it('is 0° for parallel and 180° for opposite', () => {
    expect(deg(angleBetween(X, X))).toBeCloseTo(0)
    expect(deg(angleBetween(X, scale(X, -1)))).toBeCloseTo(180)
  })
  it('ignores magnitude', () => {
    expect(deg(angleBetween(scale(X, 9), Y))).toBeCloseTo(90)
  })
  it('is safe for zero-length input', () => {
    expect(angleBetween(vec(0, 0, 0), Y)).toBe(0)
  })
})

describe('signedAngle', () => {
  it('is positive going X→Y about +Z (right-hand rule)', () => {
    expect(deg(signedAngle(X, Y, Z))).toBeCloseTo(90)
  })
  it('is negative going X→Y about −Z', () => {
    expect(deg(signedAngle(X, Y, scale(Z, -1)))).toBeCloseTo(-90)
  })
  it('flips sign when the vectors swap', () => {
    expect(deg(signedAngle(Y, X, Z))).toBeCloseTo(-90)
  })
})

describe('projectOntoPlane', () => {
  it('drops the component along the normal', () => {
    // a vector tilted out of the XY plane, projected back into it (normal = Z)
    const v = vec(2, 0, 5)
    const p = projectOntoPlane(v, Z)
    expect(p.z).toBeCloseTo(0)
    expect(p.x).toBeCloseTo(2)
    expect(p.y).toBeCloseTo(0)
  })
  it('leaves an in-plane vector unchanged', () => {
    const v = vec(3, 4, 0)
    const p = projectOntoPlane(v, Z)
    expect(p.x).toBeCloseTo(3)
    expect(p.y).toBeCloseTo(4)
    expect(p.z).toBeCloseTo(0)
  })
})
