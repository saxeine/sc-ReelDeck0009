import { describe, expect, it } from 'vitest';
import type { BubbleLayer } from '../src/components/Bubba1StudioModal';
import { positionFirstBubble, scaleBubbleLayers, starburstPoints, wrapBubbleText } from '../src/components/bubble-studio/geometry';

const bubble = {
  id: 'bubble-1', name: 'Speech', type: 'speech', text: 'Hi',
  x: 20, y: 30, width: 200, height: 100,
  tailType: 'bezier', tailX: -30, tailY: 80, tailBaseX: 5, tailBaseY: 10,
  tailBaseWidth: 20, tailCurveOffset: 6, tailTipRadius: 2,
  tailDotCount: 3, tailDotScaleRatio: .65, tailUseCustomColors: false,
  tailFillColor: '#fff', tailBorderColor: '#000',
  fontSize: 18, fontFamily: 'sans-serif', textColor: '#000', fillColor: '#fff',
  borderColor: '#000', borderWidth: 2, borderStyle: 'solid', padding: 10,
  borderRadius: 20, textAlign: 'center', isBold: false, isItalic: false,
  rotation: 0, opacity: 1, flipX: false, flipY: false, visible: true, locked: false,
} satisfies BubbleLayer;

describe('Bubble preview geometry', () => {
  it('scales positions, tails and typography without mutating the project', () => {
    const [scaled] = scaleBubbleLayers([bubble], .5, .5);
    expect([scaled.x, scaled.y, scaled.width, scaled.height]).toEqual([10, 15, 100, 50]);
    expect([scaled.tailX, scaled.tailY, scaled.tailBaseX, scaled.tailBaseY]).toEqual([-15, 40, 2.5, 5]);
    expect([scaled.fontSize, scaled.padding, scaled.borderWidth, scaled.borderRadius]).toEqual([9, 5, 1, 10]);
    expect(bubble.width).toBe(200);
    const [roundTrip] = scaleBubbleLayers([scaled], 2, 2);
    expect(roundTrip).toEqual(bubble);
  });

  it('fits and centers a first bubble on a small preview', () => {
    const [fitted] = positionFirstBubble([bubble], 116, 66);
    expect(fitted.width).toBe(100);
    expect(fitted.height).toBe(50);
    expect(fitted.x).toBe(8);
    expect(fitted.y).toBeCloseTo(16 / 3);
    expect(fitted.fontSize).toBe(9);
  });

  it('uses the same 24-point burst geometry for preview and export', () => {
    const points = starburstPoints(200, 100);
    expect(points).toHaveLength(24);
    expect(points[0]).toEqual([200, 50]);
    expect(points[6][0]).toBeCloseTo(100);
    expect(points[6][1]).toBeCloseTo(100);
  });

  it('wraps long words and preserves explicit blank lines', () => {
    const context = { measureText: (text: string) => ({ width: [...text].length }) } as CanvasRenderingContext2D;
    expect(wrapBubbleText(context, 'hello world', 6)).toEqual(['hello', 'world']);
    expect(wrapBubbleText(context, 'abcdefgh', 3)).toEqual(['abc', 'def', 'gh']);
    expect(wrapBubbleText(context, 'one\n\ntwo', 5)).toEqual(['one', '', 'two']);
  });
});
