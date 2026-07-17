import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

/*
 * The MediaPipe PoseLandmarker, set up for VIDEO mode on a single person.
 *
 * Both the WASM runtime and the model are served from our own origin, not a CDN
 * — the WASM is copied into public/ at build time (tools/copy-wasm.mjs) and the
 * model is committed. Nothing here reaches out to the network at runtime, which
 * is what keeps a demo from dying on a flaky connection.
 *
 * This is M1 plumbing. It's written to be correct, but its exit test — does the
 * skeleton actually track a real body through the downswing — can only be run
 * against real footage. Don't trust it until it's been watched on a real swing.
 */

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/models/pose_landmarker_full.task'

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate: 'GPU', // falls back to CPU internally if GPU isn't available
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    // Segmentation isn't needed for landmarks and it's expensive — leave it off.
    outputSegmentationMasks: false,
  })
}
