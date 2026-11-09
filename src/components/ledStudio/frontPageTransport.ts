/**
 * Front-page LED show transport bookkeeping
 * =========================================
 *
 * The front page header owns a **single** stop/start control
 * (`header_load_advert_transport`). Everything that animates on the wall —
 * panel rotation series, the route sequencer and the submitted Choreograph
 * show — hangs off that one button:
 *
 *   stop  → every clock parks *and* the grid is cleared of overlays
 *   start → the run is armed again from the first beat / first step
 *
 * Keeping the maths in a pure module (instead of inside the 18k-line App
 * component) means the behaviour is covered by tests and the front page never
 * grows a second, competing transport.
 */

import type { LedStudioShowProgram } from "./integration";

export interface LedShowTransportState {
  /** The submitted program being aired over the grid (null = nothing to air). */
  program: LedStudioShowProgram | null;
  /** Mounted on the grid. Stopping clears this so the wall shows L1 only. */
  visible: boolean;
  /** The show clock runs while this is true. */
  playing: boolean;
  /** Bumped on every (re)start so the overlay remounts at beat one. */
  runId: number;
}

export const IDLE_LED_SHOW_TRANSPORT: LedShowTransportState = {
  program: null,
  visible: false,
  playing: false,
  runId: 0,
};

/** A transmitted show replaces whatever was airing and starts immediately. */
export function programTransmitted(
  state: LedShowTransportState,
  program: LedStudioShowProgram | null,
): LedShowTransportState {
  if (!program || program.cues.length === 0) {
    return { ...IDLE_LED_SHOW_TRANSPORT, runId: state.runId };
  }
  return { program, visible: true, playing: true, runId: state.runId + 1 };
}

/** Route submits / route mode hand the wall back to the drawn path. */
export function programCleared(state: LedShowTransportState): LedShowTransportState {
  return { ...IDLE_LED_SHOW_TRANSPORT, runId: state.runId + (state.program ? 1 : 0) };
}

/**
 * The header transport. `running` is the state the button was in when pressed:
 * a running wall stops (clearing every overlay), a stopped wall starts again.
 */
export function transportToggled(state: LedShowTransportState, running: boolean): LedShowTransportState {
  if (!state.program) return state;
  if (running) return { ...state, visible: false, playing: false };
  return { ...state, visible: true, playing: true, runId: state.runId + 1 };
}

/**
 * A one-shot program completes on its final beat: the last formation is held
 * (still visible) but its clock stops.
 */
export function programCompleted(state: LedShowTransportState): LedShowTransportState {
  return state.playing ? { ...state, playing: false } : state;
}

/** Removing the program entirely (Reset All) returns the transport to idle. */
export function transportReset(): LedShowTransportState {
  return { ...IDLE_LED_SHOW_TRANSPORT };
}

/** Human label for the wall chip: `scene 2/4 · Hero re-form`. */
export function describeAiringScene(
  program: LedStudioShowProgram | null,
  cueIndex: number,
  visible: boolean,
): string | null {
  if (!program || !visible || program.cues.length === 0) return null;
  const index = Math.min(Math.max(0, cueIndex), program.cues.length - 1);
  const cue = program.cues[index];
  return `scene ${index + 1}/${program.cues.length} · ${cue?.name ?? "show"}`;
}
