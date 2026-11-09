import { describe, expect, it } from 'vitest';
import { pngDimensions } from '../src/lib/imaging';
import { initHistory, reducer } from '../src/lib/store';
import { DEFAULT_SHEET, type Doc, type Frame, type StudioProject } from '../src/types';

const project: StudioProject = { kind: 'bubble', baseSrc: 'base.png', displayWidth: 400, displayHeight: 200, layers: [] };
const frame: Frame = {
  id: 'frame-1', name: 'Shot', caption: '', src: 'edited.png', w: 400, h: 200,
  shot: 'WS', status: 'draft', duration: 2, tags: [], comments: [], annotated: true,
  createdAt: 1, studioProject: project,
};
const doc: Doc = { title: 'Demo', logline: '', frames: [frame], sheet: DEFAULT_SHEET };

describe('Studio frame handoff', () => {
  it('invalidates a stale editable project on image replacement and restores it on undo', () => {
    const replaced = reducer(initHistory(doc), { type: 'UPDATE_FRAME', id: frame.id, patch: { src: 'other.png' } });
    expect(replaced.present.frames[0].studioProject).toBeUndefined();
    const undone = reducer(replaced, { type: 'UNDO' });
    expect(undone.present.frames[0].src).toBe('edited.png');
    expect(undone.present.frames[0].studioProject).toEqual(project);
    expect(reducer(undone, { type: 'REDO' }).present.frames[0].studioProject).toBeUndefined();
  });

  it('stores a fresh studio project with a new flattened frame', () => {
    const fresh: StudioProject = { ...project, baseSrc: 'next-base.png' };
    const updated = reducer(initHistory(doc), {
      type: 'UPDATE_FRAME', id: frame.id, patch: { src: 'next.png', studioProject: fresh },
    });
    expect(updated.present.frames[0].studioProject).toEqual(fresh);
    expect(reducer(updated, { type: 'UNDO' }).present.frames[0].studioProject).toEqual(project);
  });

  it('keeps editable metadata on duplicate frames without coupling later replacements', () => {
    const duplicated = reducer(initHistory(doc), { type: 'DUPLICATE', ids: [frame.id] });
    const copy = duplicated.present.frames[1];
    expect(copy.id).not.toBe(frame.id);
    expect(copy.studioProject).toEqual(project);
    const replaced = reducer(duplicated, { type: 'UPDATE_FRAME', id: copy.id, patch: { src: 'other.png' } });
    expect(replaced.present.frames[0].studioProject).toEqual(project);
    expect(replaced.present.frames[1].studioProject).toBeUndefined();
  });
});

describe('PNG dimensions', () => {
  it('reads big-endian IHDR dimensions and rejects invalid data', () => {
    const header = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
    header.writeUInt32BE(1672, 16);
    header.writeUInt32BE(941, 20);
    expect(pngDimensions(`data:image/png;base64,${header.toString('base64')}`)).toEqual({ w: 1672, h: 941 });
    expect(pngDimensions('data:image/png;base64,AAAA')).toBeNull();
    expect(pngDimensions('data:image/jpeg;base64,AAAA')).toBeNull();
  });
});
