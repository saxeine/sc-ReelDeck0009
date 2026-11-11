import type { ChoreoCue } from '../types';
import { createChoreoCue } from './choreography';

export interface ChoreographyShowFile {
  schema: string;
  title?: string;
  exportedAt?: string;
  bpm: number;
  timeScale: number;
  loop: boolean;
  cues: ChoreoCue[];
}

export function parseChoreographyShow(raw: string): ChoreographyShowFile {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid show file structure');
  }
  if (data.schema !== 'gridline.choreography/v2') {
    throw new Error(`Unsupported choreography schema: ${data.schema}`);
  }
  if (!Array.isArray(data.cues) || data.cues.length === 0) {
    throw new Error('Show file contains no cues');
  }

  const cues: ChoreoCue[] = data.cues.map((cue: Partial<ChoreoCue> & { assetUrls?: string[] }) => {
    const assets = Array.isArray(cue.assetUrls) ? cue.assetUrls : [];
    return createChoreoCue(assets, {
      ...cue,
      assetUrls: assets,
    });
  });

  return {
    schema: data.schema,
    title: typeof data.title === 'string' ? data.title : undefined,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
    bpm: typeof data.bpm === 'number' ? data.bpm : 120,
    timeScale: typeof data.timeScale === 'number' ? data.timeScale : 0.65,
    loop: typeof data.loop === 'boolean' ? data.loop : true,
    cues,
  };
}
