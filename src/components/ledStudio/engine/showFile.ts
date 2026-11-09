import type { ChoreoCue, ChoreoFormation, ChoreoMotion, ChoreoTransition } from '../types';
import { createChoreoCue, normalizeCastSlots } from './choreography';

const MOTIONS: ChoreoMotion[] = ['orbit', 'snake', 'wave', 'crossfire', 'bloom', 'pinwheel', 'roller', 'wipe', 'hold'];
const FORMATIONS: ChoreoFormation[] = ['solo', 'trail', 'troupe', 'wall', 'mosaic'];
const TRANSITIONS: ChoreoTransition[] = ['glide', 'dissolve', 'strobe', 'snap', 'flip'];
const SPEEDS = [0.125, 0.25, 0.5, 1, 2];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Parse the original show JSON format without dropping cast members beyond four. */
export function parseChoreographyShow(raw: string) {
  const parsed = JSON.parse(raw) as { schema?: unknown; bpm?: unknown; timeScale?: unknown; loop?: unknown; cues?: unknown };
  if (!parsed || (parsed.schema !== 'gridline.choreography/v1' && parsed.schema !== 'gridline.choreography/v2') || !Array.isArray(parsed.cues)) {
    throw new Error('Unsupported show file');
  }
  const cues: ChoreoCue[] = parsed.cues.slice(0, 64).map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid scene');
    const cue = value as Partial<ChoreoCue>;
    const assetUrls = Array.isArray(cue.assetUrls)
      ? cue.assetUrls.filter((url): url is string => typeof url === 'string').slice(0, 16) : [];
    return createChoreoCue(assetUrls, {
      assetUrls,
      name: typeof cue.name === 'string' ? cue.name.slice(0, 80) : `Scene ${index + 1}`,
      motion: MOTIONS.includes(cue.motion as ChoreoMotion) ? cue.motion : 'orbit',
      formation: FORMATIONS.includes(cue.formation as ChoreoFormation) ? cue.formation : 'troupe',
      transition: TRANSITIONS.includes(cue.transition as ChoreoTransition) ? cue.transition : 'glide',
      direction: cue.direction === -1 ? -1 : 1,
      durationBeats: clamp(Number(cue.durationBeats) || 8, 1, 64),
      speed: SPEEDS.includes(Number(cue.speed)) ? Number(cue.speed) : 1,
      intensity: clamp(Number(cue.intensity) || 0.7, 0, 1),
      transitionMs: clamp(Number(cue.transitionMs) || 1200, 80, 12_000),
      castSlots: normalizeCastSlots(Array.isArray(cue.castSlots) ? cue.castSlots.map(Number) : undefined, assetUrls.length),
      accent: typeof cue.accent === 'string' && /^#[0-9a-f]{6}$/i.test(cue.accent) ? cue.accent : '#22d3ee',
    });
  });
  if (!cues.length) throw new Error('The show has no scenes');
  return { cues, bpm: Number(parsed.bpm) || 120, timeScale: Number(parsed.timeScale) || 0.65, loop: parsed.loop !== false };
}
