export interface RotationState {
  angleDeg: number
  velocityDegPerSec: number
}

const STOP_THRESHOLD_DEG_PER_SEC = 0.5

export function stepRotation(
  state: RotationState,
  dtSec: number,
  autoRotateDegPerSec: number,
  inertiaHalfLifeSec: number
): RotationState {
  const { angleDeg, velocityDegPerSec } = state

  if (Math.abs(velocityDegPerSec) < STOP_THRESHOLD_DEG_PER_SEC) {
    return {
      angleDeg: angleDeg + autoRotateDegPerSec * dtSec,
      velocityDegPerSec: 0,
    }
  }

  const decayed =
    velocityDegPerSec * Math.pow(0.5, dtSec / inertiaHalfLifeSec)

  return {
    angleDeg: angleDeg + velocityDegPerSec * dtSec,
    velocityDegPerSec:
      Math.abs(decayed) < STOP_THRESHOLD_DEG_PER_SEC ? 0 : decayed,
  }
}
