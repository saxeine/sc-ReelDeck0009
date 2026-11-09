import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPsd, writePsd } from 'ag-psd';
import { saveAs } from 'file-saver';
import { renderCanvasToContext } from '../src/components/neo1-app/utils/canvasRender';
import { exportNeo1ToPsd, importPsdFile } from '../src/utils/psdExportImport';
import type { CanvasState, Layer } from '../src/components/neo1-app/types';

vi.mock('ag-psd', () => ({ readPsd: vi.fn(), writePsd: vi.fn(() => new ArrayBuffer(8)) }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('../src/components/neo1-app/utils/canvasRender', () => ({
  preloadCanvasAssets: vi.fn(async () => {}), renderCanvasToContext: vi.fn(),
}));
vi.mock('../src/components/neo1-app/utils/googleFonts', () => ({ preloadTextFonts: vi.fn(async () => {}) }));

const canvas = { width: 101, height: 51, background: { type: 'color', color: 'transparent' } } as CanvasState;
const layer = (name: string, visible: boolean, opacity: number) => ({
  type: 'text', name, text: name, visible, opacity, blendMode: 'multiply',
} as Layer);
const fakeCanvas = (width = 101, height = 51) => ({
  width, height, getContext: () => ({ save: vi.fn(), restore: vi.fn() }),
  toDataURL: () => 'data:image/png;base64,AA==',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('document', { createElement: () => fakeCanvas() });
});

afterEach(() => vi.unstubAllGlobals());

describe('Neo1 PSD layers', () => {
  it('exports in Photoshop order with independent opacity and hidden pixels', async () => {
    await exportNeo1ToPsd(canvas, [layer('Bottom', true, .5), layer('Hidden top', false, .6)], 'design');
    const psd = vi.mocked(writePsd).mock.calls[0][0];
    expect(psd.children?.map((item) => item.name)).toEqual(['Hidden top', 'Bottom', 'Background']);
    expect(psd.children?.[0].hidden).toBe(true);
    expect(psd.children?.[1].opacity).toBe(.5);
    const isolated = vi.mocked(renderCanvasToContext).mock.calls
      .map((call) => call[2])
      .filter((layers) => layers.length === 1);
    expect(isolated).toHaveLength(2);
    for (const [item] of isolated) {
      expect(item.visible).toBe(true);
      expect(item.opacity).toBe(1);
      expect(item.blendMode).toBe('normal');
    }
    expect(saveAs).toHaveBeenCalledOnce();
  });

  it('imports Photoshop order bottom-up and preserves odd-sized layer centers', async () => {
    vi.mocked(readPsd).mockReturnValue({
      width: 101, height: 51,
      children: [
        { name: 'Top', canvas: fakeCanvas(5, 7) as unknown as HTMLCanvasElement, left: 3, top: 4, hidden: true, opacity: .6 },
        { name: 'Bottom', canvas: fakeCanvas(9, 11) as unknown as HTMLCanvasElement, left: 0, top: 0, opacity: .5 },
      ],
    });
    const file = { name: 'layers.psd', arrayBuffer: async () => new ArrayBuffer(0) } as File;
    const result = await importPsdFile(file);
    expect(result.layers.map((item) => item.name)).toEqual(['Bottom', 'Top']);
    expect([result.layers[0].x, result.layers[0].y]).toEqual([4.5, 5.5]);
    expect([result.layers[1].x, result.layers[1].y]).toEqual([5.5, 7.5]);
    expect(result.layers[1].visible).toBe(false);
    expect(result.layers[0].opacity).toBe(.5);
  });
});
