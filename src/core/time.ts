/**
 * The simulation clock (DESIGN.md section 10.4).
 *
 * Simulated time advances in fixed steps of one millisecond, shared by the
 * neurons and (with optional substeps) the physics. Time is counted in whole
 * steps so it never accumulates floating-point error.
 */

/** Length of one simulation step, in milliseconds. */
export const STEP_MS = 1;

/** Length of one simulation step, in seconds (SI units everywhere else). */
export const STEP_S = STEP_MS / 1000;

/** Steps in one simulated second. */
export const STEPS_PER_SECOND = 1000 / STEP_MS;

export function secondsToSteps(seconds: number): number {
  return Math.round(seconds * STEPS_PER_SECOND);
}

export function stepsToSeconds(steps: number): number {
  return steps / STEPS_PER_SECOND;
}
