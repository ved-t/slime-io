/**
 * Fixed-timestep driver: all game logic is tuned per 1/60 s step (px/step velocities, step-count
 * timers), so it must run at exactly SIM_HZ regardless of the display's refresh rate. Rendering
 * happens once per browser frame and interpolates between the last two logic states via `alpha`.
 */
export const SIM_HZ = 60;
export const STEP_MS = 1000 / SIM_HZ;
// Spiral-of-death guard: never run more than this many logic steps in one rendered frame.
export const MAX_STEPS_PER_FRAME = 5;
// Ignore absurd frame gaps (tab switch, debugger pause) instead of fast-forwarding through them.
const MAX_FRAME_MS = 250;

export class FixedTimestep {
  private accumulator: number = 0;
  /** Fraction (0..1) of a step elapsed since the last logic step; use it to interpolate rendering. */
  public alpha: number = 1;
  /** Deterministic simulation clock: advances STEP_MS per step, pauses when steps don't run. */
  public simTimeMs: number = 0;

  /**
   * Feed a real frame delta (use `game.loop.rawDelta`, not Phaser's smoothed delta) and run
   * however many fixed steps it covers. Returns the number of steps run.
   */
  public advance(frameMs: number, step: (simTimeMs: number) => void): number {
    this.accumulator += Math.min(Math.max(0, frameMs), MAX_FRAME_MS);

    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.simTimeMs += STEP_MS;
      step(this.simTimeMs);
      this.accumulator -= STEP_MS;
      steps++;
    }

    // Still behind after the cap: drop the backlog (brief slow-motion) rather than snowballing.
    if (this.accumulator >= STEP_MS) {
      this.accumulator %= STEP_MS;
    }

    this.alpha = this.accumulator / STEP_MS;
    return steps;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolates angles along the shortest arc. */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/**
 * Converts a per-step easing factor (e.g. `x += (target - x) * 0.08` tuned at 60 FPS) into the
 * equivalent factor for an arbitrary frame duration. Identical to `perStep` at exactly 60 Hz.
 */
export function perStepToFrameFactor(perStep: number, frameMs: number): number {
  return 1 - Math.pow(1 - perStep, frameMs / STEP_MS);
}
