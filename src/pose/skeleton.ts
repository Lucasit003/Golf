import { Landmark } from './landmarks'

/*
 * Drawing the 2D skeleton over the video. Uses the normalized `landmarks`
 * (image space) — never `world` — because this is for the screen, not for
 * measurement. Kept free of the DOM (takes a 2D context and dimensions) so the
 * connection topology and the culling logic can be unit-tested with a stub.
 */

export type Pt = { x: number; y: number }

/** The bones we draw. Every index is in the enum in landmarks.ts. */
export const POSE_CONNECTIONS: [Landmark, Landmark][] = [
  // shoulders + arms
  [Landmark.LEFT_SHOULDER, Landmark.RIGHT_SHOULDER],
  [Landmark.LEFT_SHOULDER, Landmark.LEFT_ELBOW],
  [Landmark.LEFT_ELBOW, Landmark.LEFT_WRIST],
  [Landmark.RIGHT_SHOULDER, Landmark.RIGHT_ELBOW],
  [Landmark.RIGHT_ELBOW, Landmark.RIGHT_WRIST],
  // torso
  [Landmark.LEFT_SHOULDER, Landmark.LEFT_HIP],
  [Landmark.RIGHT_SHOULDER, Landmark.RIGHT_HIP],
  [Landmark.LEFT_HIP, Landmark.RIGHT_HIP],
  // left leg
  [Landmark.LEFT_HIP, Landmark.LEFT_KNEE],
  [Landmark.LEFT_KNEE, Landmark.LEFT_ANKLE],
  [Landmark.LEFT_ANKLE, Landmark.LEFT_HEEL],
  [Landmark.LEFT_HEEL, Landmark.LEFT_FOOT_INDEX],
  [Landmark.LEFT_ANKLE, Landmark.LEFT_FOOT_INDEX],
  // right leg
  [Landmark.RIGHT_HIP, Landmark.RIGHT_KNEE],
  [Landmark.RIGHT_KNEE, Landmark.RIGHT_ANKLE],
  [Landmark.RIGHT_ANKLE, Landmark.RIGHT_HEEL],
  [Landmark.RIGHT_HEEL, Landmark.RIGHT_FOOT_INDEX],
  [Landmark.RIGHT_ANKLE, Landmark.RIGHT_FOOT_INDEX],
]

/** The joints we dot. */
export const POSE_JOINTS: Landmark[] = [
  Landmark.LEFT_SHOULDER, Landmark.RIGHT_SHOULDER,
  Landmark.LEFT_ELBOW, Landmark.RIGHT_ELBOW,
  Landmark.LEFT_WRIST, Landmark.RIGHT_WRIST,
  Landmark.LEFT_HIP, Landmark.RIGHT_HIP,
  Landmark.LEFT_KNEE, Landmark.RIGHT_KNEE,
  Landmark.LEFT_ANKLE, Landmark.RIGHT_ANKLE,
]

export type SkeletonStyle = {
  line: string
  joint: string
  lineWidth: number
  jointRadius: number
  minVisibility: number
}

export const DEFAULT_SKELETON_STYLE: SkeletonStyle = {
  line: '#16211c',
  joint: '#2547c8',
  lineWidth: 2,
  jointRadius: 3,
  minVisibility: 0.5,
}

// Minimal 2D-context surface we rely on — lets us type a stub in tests.
export type Ctx2D = {
  clearRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  stroke(): void
  arc(x: number, y: number, r: number, s: number, e: number): void
  fill(): void
  lineWidth: number
  strokeStyle: string
  fillStyle: string
  lineCap: string
  lineJoin: string
}

/**
 * Draw one frame's skeleton. `landmarks` are normalized (0–1); `w`/`h` are the
 * canvas pixel size (use the video's intrinsic resolution and letterbox the
 * canvas to match the video). A bone is drawn only when both ends clear
 * `minVisibility`. Returns the number of bones actually drawn.
 */
export function drawSkeleton(
  ctx: Ctx2D,
  landmarks: Pt[],
  visibility: number[],
  w: number,
  h: number,
  style: SkeletonStyle = DEFAULT_SKELETON_STYLE,
): number {
  ctx.clearRect(0, 0, w, h)
  if (!landmarks || landmarks.length === 0) return 0

  const vis = (i: number) => (visibility[i] ?? 1) >= style.minVisibility
  const px = (i: number) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h })

  ctx.lineWidth = style.lineWidth
  ctx.strokeStyle = style.line
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  let drawn = 0
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!landmarks[a] || !landmarks[b] || !vis(a) || !vis(b)) continue
    const pa = px(a)
    const pb = px(b)
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
    drawn++
  }

  ctx.fillStyle = style.joint
  for (const j of POSE_JOINTS) {
    if (!landmarks[j] || !vis(j)) continue
    const p = px(j)
    ctx.beginPath()
    ctx.arc(p.x, p.y, style.jointRadius, 0, Math.PI * 2)
    ctx.fill()
  }
  return drawn
}

/**
 * Draw a normalized polyline (0–1 points) onto a `w`×`h` canvas — used for the
 * hand trace over the tracked swing. Returns the number of segments drawn.
 */
export function drawPolyline(
  ctx: Ctx2D,
  points: Pt[],
  w: number,
  h: number,
  color: string,
  width: number,
): number {
  if (points.length < 2) return 0
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x * w, p.y * h)
    else ctx.lineTo(p.x * w, p.y * h)
  })
  ctx.stroke()
  return points.length - 1
}
