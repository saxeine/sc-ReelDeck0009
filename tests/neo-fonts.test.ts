import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGoogleFont } from '../src/components/neo1-app/utils/googleFonts';

function mockFontDocument() {
  const links: Array<{ onload?: () => void; onerror?: () => void; href?: string; rel?: string }> = [];
  const face = {};
  const load = vi.fn(async () => [face]);
  const dispatchEvent = vi.fn();
  vi.stubGlobal('document', {
    createElement: () => ({}),
    head: { appendChild: (link: typeof links[number]) => links.push(link) },
    fonts: { load },
  });
  vi.stubGlobal('window', { dispatchEvent });
  return { links, load, dispatchEvent };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Neo1 web font loading', () => {
  it('waits for stylesheet rules, loads the requested face, and deduplicates requests', async () => {
    const mock = mockFontDocument();
    const first = loadGoogleFont('Unique Test Font', { weight: 700, style: 'italic', text: 'Hello' });
    const second = loadGoogleFont('Unique Test Font', { weight: 700, style: 'italic', text: 'Hello' });
    expect(mock.links).toHaveLength(1);
    expect(mock.load).not.toHaveBeenCalled();
    mock.links[0].onload?.();
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(mock.load).toHaveBeenCalledWith('italic 700 16px "Unique Test Font"', 'Hello');
    expect(mock.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('falls back after an unavailable stylesheet and does not hang', async () => {
    const mock = mockFontDocument();
    const result = loadGoogleFont('Offline Test Font');
    mock.links[0].onerror?.();
    expect(await result).toBe(false);
    expect(mock.load).not.toHaveBeenCalled();
  });

  it('times out offline but still redraws if the font eventually arrives', async () => {
    vi.useFakeTimers();
    const mock = mockFontDocument();
    const result = loadGoogleFont('Slow Test Font');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toBe(false);
    mock.links[0].onload?.();
    await vi.waitFor(() => expect(mock.dispatchEvent).toHaveBeenCalledOnce());
  });
});
