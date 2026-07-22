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

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  at: P,
  font: number,
  fg: string,
  bg: string,
) {
  ctx.font = `600 ${font}px system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  const padX = font * 0.4
  const padY = font * 0.28
  const wText = ctx.measureText(text).width
  const x = at.x + font * 0.5
  const y = at.y
  ctx.fillStyle = bg
  const r = font * 0.35
  const bx = x - padX
  const by = y - font / 2 - padY
  const bw = wText + padX * 2
  const bh = font + padY * 2
  ctx.beginPath()
  ctx.moveTo(bx + r, by)
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r)
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, r)
  ctx.arcTo(bx, by + bh, bx, by, r)
  ctx.arcTo(bx, by, bx + bw, by, r)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.fillText(text, x, y)
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
  const font = Math.max(15, w / 30)

  const drift = refSpine == null ? 0 : Math.abs(a.spine - refSpine)
  const postureLost = drift > 2
  const spineColor = postureLost ? colors.flag : colors.chalk

  // Vertical reference from the hips (dashed) — the plumb line the spine leans off.
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

  // The spine itself, highlighted.
  ctx.save()
  ctx.strokeStyle = spineColor
  ctx.lineWidth = Math.max(3, w / 150)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hipMid.x, hipMid.y)
  ctx.lineTo(shMid.x, shMid.y)
  ctx.stroke()
  ctx.restore()

  label(ctx, `spine ${a.spine.toFixed(0)}°`, shMid, font, colors.paper, spineColor)
  if (postureLost) {
    label(ctx, `posture −${drift.toFixed(0)}°`, { x: shMid.x, y: shMid.y + font * 1.5 }, font, colors.paper, colors.flag)
  }

  // Knee flex, at each knee.
  label(ctx, `${a.leftKnee.toFixed(0)}°`, px(Landmark.LEFT_KNEE), font, colors.ink, colors.paper)
  label(ctx, `${a.rightKnee.toFixed(0)}°`, px(Landmark.RIGHT_KNEE), font, colors.ink, colors.paper)
}
