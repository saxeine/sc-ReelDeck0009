// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdvertLayer } from "../src/components/ledStudio/components/advert/AdvertLayer";
import type { AdvertEngine } from "../src/components/ledStudio/engine/useAdvertEngine";

function stubElementFromPoint(element: Element) {
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => element,
  });
}

function makeEngine() {
  const cue = {
    id: "cue-1",
    name: "Scene",
    formation: "troupe",
    motion: "orbit",
    transition: "glide",
    direction: 1,
    durationBeats: 8,
    speed: 1,
    intensity: 0.7,
    transitionMs: 1200,
    accent: "#8b5cf6",
    assetUrls: ["a", "b"],
    castSlots: [1, 2],
  };
  const updateCue = vi.fn();
  const notify = vi.fn();
  const engine = {
    cols: 4,
    layer: {
      radius: 4,
      inset: 1,
      opacity: 1,
      blend: "normal",
      mode: "all",
      seqFlash: false,
      seqColor: "#ff8a1f",
      showRoute: false,
    },
    panels: {},
    active: false,
    playing: false,
    behavior: "reveal",
    path: [],
    leaderSlot: null,
    stepIndexOf: () => -1,
    controllerMode: "show",
    boardPaintArmed: false,
    selectedSlot: 0,
    revealed: [],
    revealedSet: new Set<number>(),
    revealCount: 0,
    cursor: 0,
    displayFrame: () => null,
    paintSlot: vi.fn(),
    setSelectedSlot: vi.fn(),
    notify,
    choreography: {
      frame: null,
      previewFrame: null,
      selectedCue: cue,
      updateCue,
    },
  };
  return { engine: engine as unknown as AdvertEngine, updateCue, notify };
}

describe("moving cast artwork on the wall preview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(engine: AdvertEngine) {
    act(() => {
      root.render(<AdvertLayer engine={engine} size={100} gap={2} onInspect={() => {}} onOpenLink={() => {}} previewChoreography />);
    });
  }

  it("moves a cast member to the panel it is dropped on", async () => {
    const { engine, updateCue, notify } = makeEngine();
    render(engine);
    expect(container.textContent).toContain("drag a cast tile");

    const cell = (slot: number) => container.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
    const from = cell(1);
    const to = cell(5);
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();

    // jsdom has no layout, so resolve drops through a stubbed hit test.
    stubElementFromPoint(to);

    await act(async () => {
      from.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: 200 }));
    });
    expect(container.textContent).toContain("move cast → panel 05");

    await act(async () => {
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 200, clientY: 200 }));
    });
    expect(updateCue).toHaveBeenCalledWith("cue-1", { castSlots: [5, 2] });
    expect(notify).toHaveBeenCalledWith("Cast moved to panel 05", "success");
    expect(container.textContent).toContain("drag a cast tile");
  });

  it("leaves the cast alone when dropped on its own panel", async () => {
    const { engine, updateCue } = makeEngine();
    render(engine);
    const from = container.querySelector<HTMLElement>('[data-slot="1"]')!;
    stubElementFromPoint(from);

    await act(async () => {
      from.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 10, clientY: 10 }));
    });
    expect(updateCue).not.toHaveBeenCalled();
  });
});
