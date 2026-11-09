import type { BubbleLayer } from "../Bubba1StudioModal";

/** Bubble layers use preview-pixel coordinates. Keep their geometry (and undo
 * snapshots) tied to the image when its displayed size changes. */
export function scaleBubbleLayers(layers: BubbleLayer[], sx: number, sy: number): BubbleLayer[] {
  const uniform = Math.min(sx, sy);
  return layers.map((layer) => ({
    ...layer,
    x: layer.x * sx, y: layer.y * sy,
    width: layer.width * sx, height: layer.height * sy,
    tailX: layer.tailX * sx, tailY: layer.tailY * sy,
    tailBaseX: (layer.tailBaseX || 0) * sx,
    tailBaseY: (layer.tailBaseY || 0) * sy,
    tailBaseWidth: layer.tailBaseWidth * uniform,
    tailCurveOffset: layer.tailCurveOffset * uniform,
    tailTipRadius: layer.tailTipRadius * uniform,
    fontSize: layer.fontSize * uniform,
    borderWidth: layer.borderWidth * uniform,
    padding: layer.padding * uniform,
    borderRadius: layer.borderRadius * uniform,
  }));
}

export function positionFirstBubble(layers: BubbleLayer[], width: number, height: number): BubbleLayer[] {
  return layers.map((layer, index) => {
    if (index !== 0) return layer;
    const fit = Math.min(1, Math.max(1, width - 16) / layer.width, Math.max(1, height - 16) / layer.height);
    const fitted = scaleBubbleLayers([layer], fit, fit)[0];
    return {
      ...fitted,
      x: Math.max(0, (width - fitted.width) / 2),
      y: Math.max(0, (height - fitted.height) / 3),
    };
  });
}

export function starburstPoints(width: number, height: number): [number, number][] {
  const rx = width / 2, ry = height / 2;
  return Array.from({ length: 24 }, (_, i) => {
    const factor = i % 2 === 0 ? 1 : 0.82;
    const angle = i * Math.PI / 12;
    return [rx + rx * factor * Math.cos(angle), ry + ry * factor * Math.sin(angle)];
  });
}

/** Match the preview's wrapping, including explicit newlines and long words. */
export function wrapBubbleText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const token of paragraph.match(/\s+|\S+/gu) || []) {
      if (ctx.measureText(line + token).width <= width) {
        line += token;
        continue;
      }
      if (/^\s+$/u.test(token)) {
        if (line) lines.push(line.trimEnd());
        line = '';
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      // CSS overflow-wrap: break-word also wraps a word wider than its box.
      for (const character of Array.from(token)) {
        if (line && ctx.measureText(line + character).width > width) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}
