// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSequencerPanelState,
  SequencerPanel,
  type SequencerPanelState,
} from "../src/components/SequencerPanel";

function makeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    effectAllowed: "all",
    dropEffect: "none",
    types: [] as string[],
    setData(type: string, value: string) {
      store[type] = value;
      if (!this.types.includes(type)) this.types.push(type);
    },
    getData(type: string) {
      return store[type] ?? "";
    },
  };
}

function fireDnd(target: Element, type: string, dataTransfer: ReturnType<typeof makeDataTransfer>) {
  act(() => {
    target.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true, cancelable: true }), { dataTransfer })
    );
  });
}

function pointBadge(container: HTMLElement, step: number): HTMLElement {
  const badge = Array.from(container.querySelectorAll<HTMLElement>("span[draggable]")).find(
    (span) => span.textContent === `P${step}`
  );
  if (!badge) throw new Error(`Missing route point P${step}`);
  return badge;
}

function slotButton(container: HTMLElement, slot: number): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((b) =>
    b.getAttribute("title")?.startsWith(`Region #${slot} —`)
  );
  if (!button) throw new Error(`Missing matrix slot #${slot}`);
  return button as HTMLButtonElement;
}

function dragPoint(container: HTMLElement, step: number, toSlot: number) {
  const dataTransfer = makeDataTransfer();
  fireDnd(pointBadge(container, step), "dragstart", dataTransfer);
  fireDnd(slotButton(container, toSlot), "dragover", dataTransfer);
  fireDnd(slotButton(container, toSlot), "drop", dataTransfer);
}

function Harness({ onToast }: { onToast: (message: string) => void }) {
  const [state, setState] = useState<SequencerPanelState>(() => ({
    ...createSequencerPanelState(16),
    path: [1, 2, 3, 4],
    activeSlots: [1, 2, 3, 4, 5, 6, 7, 8],
    customPath: undefined,
  }));
  return (
    <>
      <span data-testid="path">{state.path.join(",")}</span>
      <span data-testid="active">{state.activeSlots.join(",")}</span>
      <SequencerPanel
        totalSlots={16}
        sources={[]}
        boxImages={{}}
        state={state}
        setState={setState}
        sourceUploadRef={{ current: null }}
        onAddSource={() => {}}
        onDeleteSource={() => {}}
        onToggleLock={() => {}}
        onRequestFill={() => {}}
        showToast={onToast}
      />
    </>
  );
}

describe("Route sequencer point dragging", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    const onToast = vi.fn();
    act(() => root.render(<Harness onToast={onToast} />));
    return onToast;
  }

  it("moves a route point to another panel by dragging its P badge", () => {
    const onToast = render();
    expect(container.querySelector('[data-testid="path"]')!.textContent).toBe("1,2,3,4");
    dragPoint(container, 2, 6);
    expect(container.querySelector('[data-testid="path"]')!.textContent).toBe("1,6,3,4");
    expect(onToast).toHaveBeenCalledWith("✓ Route point moved to slot #6");
  });

  it("swaps with a route point already on the target panel", () => {
    render();
    dragPoint(container, 1, 3);
    expect(container.querySelector('[data-testid="path"]')!.textContent).toBe("3,2,1,4");
  });

  it("activates an excluded target panel when a point lands on it", () => {
    render();
    dragPoint(container, 4, 10);
    expect(container.querySelector('[data-testid="path"]')!.textContent).toBe("1,2,3,10");
    expect(container.querySelector('[data-testid="active"]')!.textContent).toBe("1,2,3,4,5,6,7,8,10");
  });

  it("leaves the route unchanged when a point is dropped on its own panel", () => {
    const onToast = render();
    dragPoint(container, 2, 2);
    expect(container.querySelector('[data-testid="path"]')!.textContent).toBe("1,2,3,4");
    expect(onToast).not.toHaveBeenCalled();
  });
});
