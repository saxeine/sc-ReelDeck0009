// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The panel body needs a full animation engine; only the desk chrome (title and
// header actions) is under test here.
vi.mock("../src/components/SequencerPanel", () => ({
  SequencerPanel: () => <div data-testid="sequencer-panel" />,
}));

import { AdShopSequencer } from "../src/components/AdShopSequencer";
import type { useAdShopAnimation } from "../src/components/useAdShopAnimation";

const animation = {
  sequence: { playing: false, bypassed: false, locked: false },
  toggleRoute: () => {},
  setSequence: () => {},
  onActiveSlotsChange: () => {},
  regions: [],
} as unknown as ReturnType<typeof useAdShopAnimation>;

function renderSequencer(root: Root, onOpenLibrary: () => void) {
  act(() => {
    root.render(
      <AdShopSequencer
        animation={animation}
        sources={[]}
        boxImages={{}}
        onAddSource={() => {}}
        onDeleteSource={() => {}}
        onClose={() => {}}
        onOpenPainter={() => {}}
        onOpenChoreographer={() => {}}
        onOpenGrid={() => {}}
        onOpenLibrary={onOpenLibrary}
      />
    );
  });
}

describe("Route sequencer panel", () => {
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

  it("is titled the Route sequencer", () => {
    renderSequencer(root, () => {});
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-label")).toBe("Route Sequencer");
    expect(container.querySelector("h2")?.textContent).toBe("Route sequencer");
  });

  it("links to the library so images can be inserted there", () => {
    const onOpenLibrary = vi.fn();
    renderSequencer(root, onOpenLibrary);
    const button = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.trim() === "Library"
    );
    expect(button).toBeTruthy();
    expect(button!.getAttribute("title")).toBe("Open the library to insert images");
    act(() => {
      (button as HTMLButtonElement).click();
    });
    expect(onOpenLibrary).toHaveBeenCalledTimes(1);
  });
});
