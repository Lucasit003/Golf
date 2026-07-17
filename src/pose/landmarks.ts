/*
 * BlazePose GHUM landmark indices — the named enum the whole codebase measures
 * against. Per SWING_SPEC: never write a bare `[11]` in metric code; reference
 * `Landmark.LEFT_SHOULDER` so a wrong index is a compile error, not a silent bug.
 *
 * Left/right are the SUBJECT's own, mirrored from the camera's view. Getting this
 * backwards inverts the X-factor sign quietly — the tests exist to catch it.
 */
export enum Landmark {
  NOSE = 0,

  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,

  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

/** Total landmarks in the BlazePose GHUM topology. */
export const LANDMARK_COUNT = 33

/** Human-readable names, for debug overlays and confidence readouts. */
export const LANDMARK_NAME: Partial<Record<Landmark, string>> = {
  [Landmark.NOSE]: 'nose',
  [Landmark.LEFT_SHOULDER]: 'left shoulder',
  [Landmark.RIGHT_SHOULDER]: 'right shoulder',
  [Landmark.LEFT_ELBOW]: 'left elbow',
  [Landmark.RIGHT_ELBOW]: 'right elbow',
  [Landmark.LEFT_WRIST]: 'left wrist',
  [Landmark.RIGHT_WRIST]: 'right wrist',
  [Landmark.LEFT_HIP]: 'left hip',
  [Landmark.RIGHT_HIP]: 'right hip',
  [Landmark.LEFT_KNEE]: 'left knee',
  [Landmark.RIGHT_KNEE]: 'right knee',
  [Landmark.LEFT_ANKLE]: 'left ankle',
  [Landmark.RIGHT_ANKLE]: 'right ankle',
  [Landmark.LEFT_HEEL]: 'left heel',
  [Landmark.RIGHT_HEEL]: 'right heel',
  [Landmark.LEFT_FOOT_INDEX]: 'left foot index',
  [Landmark.RIGHT_FOOT_INDEX]: 'right foot index',
}
