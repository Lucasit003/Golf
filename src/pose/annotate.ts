import type { PoseFrame } from './types'
import { Landmark } from './landmarks'
import { spineAngleDeg, kneeFlexDeg, shoulderTiltDeg } from '../metrics/geometry'

/*
 * Live per-frame angle readouts drawn on (and beside) the skeleton, so scrubbing
 * the swing shows exactly where the body breaks down — the frame a golfer loses
 * their spine angle, flattens a knee, and so on. Angles come from `world`
 * (metric) landmarks; positions to draw at come from `landmarks` (image space).
 */

export type FrameAngles = {
  /** Spine tilt from vertical, degrees. */
  spine: number
  /** Knee flex (0 = straight), degrees, by the golfer's own side. */
  leftKnee: number
  rightKnee: number
  /** Shoulder-line tilt out of horizontal, degrees. */
  shoulderTilt: number
}

/** Every angle we surface for a single frame. Pure — testable without a canvas. */
export function frameAngles(f: PoseFrame): FrameAngles {
  return {
    spine: spineAngleDeg(f.world),
    leftKnee: kneeFlexDeg(f.world, 'left'),
    rightKnee: kneeFlexDeg(f.world, 'right'),
    shoulderTilt: shoulderTiltDeg(f.world),
  }
}

export type AngleColors = { chalk: string; flag: string; ink: string; paper: string }

type P = { x: number; y: number }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * A callout: a small labelled box parked off the body in the gutter, a thin
 * leader line back to the point it measures, and a dot on that point. `side`
 * says which gutter the box lives in; the leader leaves the box's inner edge.
 */
function callout(
  ctx: CanvasRenderingContext2D,
  anchor: P,
  boxCenterX: number,
  boxCenterY: number,
  lines: string[],
  fill: string,
  textColor: string,
  font: number,
  side: 'left' | 'right',
  canvasW: number,
) {
  ctx.font = `600 ${font}px system-ui, sans-serif`
  const padX = font * 0.55
  const padY = font * 0.4
  const lineH = font * 1.22
  const textW = Math.max(...lines.map((t) => ctx.measureText(t).width))
  const boxW = textW + padX * 2
  const boxH = (lines.length - 1) * lineH + font + padY * 2
  // Box grows away from the body; keep it fully on-canvas.
  let bx = side === 'right' ? boxCenterX : boxCenterX - boxW
  bx = Math.max(font * 0.3, Math.min(bx, canvasW - boxW - font * 0.3))
  const by = boxCenterY - boxH / 2
  const connX = side === 'right' ? bx : bx + boxW
  const connY = boxCenterY

  // Leader line + anchor dot.
  ctx.strokeStyle = fill
  ctx.lineWidth = Math.max(1.5, font / 11)
  ctx.beginPath()
  ctx.moveTo(anchor.x, anchor.y)
  ctx.lineTo(connX, connY)
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(anchor.x, anchor.y, Math.max(3, font / 5), 0, Math.PI * 2)
  ctx.fill()

  // Box + text.
  roundRect(ctx, bx, by, boxW, boxH, font * 0.32)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  lines.forEach((t, i) => ctx.fillText(t, bx + padX, by + padY + font / 2 + lineH * i))
}

/**
 * Draw the live angle overlay for one frame. `refSpine` is the spine angle at
 * address; when the current frame drifts more than 2° from it the spine line and
 * label go red — the "you lost your posture here" cue. Uses the full canvas 2D
 * context (text + dashed lines), unlike the stub-friendly skeleton draw.
 */
export function drawAngles(
  ctx: CanvasRenderingContext2D,
  f: PoseFrame,
  refSpine: number | null,
  w: number,
  h: number,
  colors: AngleColors,
): void {
  const lm = f.landmarks
  if (!lm || lm.length === 0) return
  const px = (i: Landmark): P => ({ x: lm[i].x * w, y: lm[i].y * h })
  const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  const a = frameAngles(f)
  const hipMid = mid(px(Landmark.LEFT_HIP), px(Landmark.RIGHT_HIP))
  const shMid = mid(px(Landmark.LEFT_SHOULDER), px(Landmark.RIGHT_SHOULDER))
  const spineMid = mid(hipMid, shMid)
  const font = Math.max(14, w / 34)

  const drift = refSpine == null ? 0 : Math.abs(a.spine - refSpine)
  const postureLost = drift > 2
  const spineColor = postureLost ? colors.flag : colors.chalk

  // Plumb reference from the hips (dashed) + the spine, highlighted, on the body.
  ctx.save()
  ctx.strokeStyle = colors.chalk
  ctx.globalAlpha = 0.4
  ctx.lineWidth = Math.max(1.5, w / 500)
  ctx.setLineDash([w / 90, w / 90])
  const spineLen = Math.hypot(shMid.x - hipMid.x, shMid.y - hipMid.y)
  ctx.beginPath()
  ctx.moveTo(hipMid.x, hipMid.y)
  ctx.lineTo(hipMid.x, hipMid.y - spineLen)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = spineColor
  ctx.lineWidth = Math.max(3, w / 160)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hipMid.x, hipMid.y)
  ctx.lineTo(shMid.x, shMid.y)
  ctx.stroke()
  ctx.restore()

  // Park the callout boxes in whichever gutter has more room, stacked down the
  // side, each tied back to its point by a leader line — off the body, legible.
  const joints = [11, 12, 23, 24, 25, 26, 27, 28, 15, 16] as Landmark[]
  const xs = joints.map((i) => px(i).x)
  const bodyMinX = Math.min(...xs)
  const bodyMaxX = Math.max(...xs)
  const side: 'left' | 'right' = w - bodyMaxX >= bodyMinX ? 'right' : 'left'
  const boxX = side === 'right' ? bodyMaxX + w * 0.05 : bodyMinX - w * 0.05

  const rows: { anchor: P; lines: string[]; fill: string; text: string }[] = [
    {
      anchor: spineMid,
      lines: postureLost ? [`SPINE ${a.spine.toFixed(0)}°`, `−${drift.toFixed(0)}° posture`] : [`SPINE ${a.spine.toFixed(0)}°`],
      fill: spineColor,
      text: colors.paper,
    },
    { anchor: px(Landmark.LEFT_KNEE), lines: [`L KNEE ${a.leftKnee.toFixed(0)}°`], fill: colors.ink, text: colors.paper },
    { anchor: px(Landmark.RIGHT_KNEE), lines: [`R KNEE ${a.rightKnee.toFixed(0)}°`], fill: colors.ink, text: colors.paper },
  ]

  let y = h * 0.2
  const rowGap = font * 3.4
  for (const r of rows) {
    callout(ctx, r.anchor, boxX, y, r.lines, r.fill, r.text, font, side, w)
    y += rowGap
  }
}
