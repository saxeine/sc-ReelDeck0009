// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addLibraryAssets as seedLibrary, resetLibraryForTests } from "../src/services/assetLibrary";
import { ChoreographyControls } from "../src/components/ledStudio/components/advert/ChoreographyControls";
import type { AdvertEngine } from "../src/components/ledStudio/engine/useAdvertEngine";

const A = "data:image/png;base64,AAAA";
const B = "data:image/png;base64,BBBB";

type Cue = {
  id: string;
  name: string;
  formation: string;
  assetUrls: string[];
  castSlots: number[];
  [key: string]: unknown;
};

function makeHarness(formation: string) {
  const cue: Cue = {
    id: "cue-1",
    name: "Opening",
    formation,
    motion: "orbit",
    transition: "cut",
    durationBeats: 8,
    speed: 1,
    intensity: 0.8,
    accent: "#8b5cf6",
    direction: 1,
    assetUrls: [],
    castSlots: [],
  };

  const updateCue = vi.fn((id: string, patch: Record<string, unknown>) => {
    if (id === cue.id) Object.assign(cue, patch);
  });

  const choreography = {
    cues: [cue],
    templates: [],
    activeTemplate: null,
    activeTemplateId: "",
    templateDirty: false,
    saveTemplate: vi.fn(),
    overwriteTemplate: vi.fn(),
    renameTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    loadTemplate: vi.fn(),
    editPresetAsTemplate: vi.fn(),
    selectedCueId: cue.id,
    selectedCue: cue,
    currentCue: cue,
    cueIndex: 0,
    presets: [],
    bpm: 120,
    timeScale: 1,
    loop: true,
    previewProgress: 0,
    totalDurationMs: 8000,
    playheadMs: 0,
    addCue: vi.fn(),
    removeCue: vi.fn(),
    duplicateCue: vi.fn(),
    moveCue: vi.fn(),
    selectCue: vi.fn(),
    updateCue,
    loadPreset: vi.fn(),
    setBpm: vi.fn(),
    setTimeScale: vi.fn(),
    setLoop: vi.fn(),
    exportShow: vi.fn(),
    importShow: vi.fn(),
    scrubCue: vi.fn(),
  };

  const addLibraryAssets = vi.fn();
  const engine = {
    pool: [],
    panelCount: 4,
    choreography,
    addLibraryAssets,
  } as unknown as AdvertEngine;

  return { engine, cue, updateCue, addLibraryAssets };
}

function renderControls(root: Root, engine: AdvertEngine) {
  act(() => {
    root.render(<ChoreographyControls engine={engine} />);
  });
}

function buttonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.includes(text),
  );
}

describe("choreographer library access", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await resetLibraryForTests();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("casts images picked from the asset library into the selected scene", async () => {
    await seedLibrary([
      { name: "Library one", origin: "upload", src: A },
      { name: "Library two", origin: "slice", src: B },
    ]);
    const { engine, updateCue, addLibraryAssets } = makeHarness("troupe");

    renderControls(root, engine);
    const open = buttonByText(container, "Add from library");
    expect(open).toBeTruthy();
    await act(async () => {
      open!.click();
    });
    await act(async () => {});

    for (const name of ["Library one", "Library two"]) {
      const card = Array.from(container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find(
        (button) => button.textContent?.includes(name),
      );
      expect(card).toBeTruthy();
      await act(async () => {
        card!.click();
      });
    }

    const send = buttonByText(container, "Add 2 to cast");
    expect(send).toBeTruthy();
    await act(async () => {
      send!.click();
    });

    // The picks are stocked in the pool and cast in the current scene.
    expect(addLibraryAssets).toHaveBeenCalledTimes(1);
    expect(addLibraryAssets.mock.calls[0][0]).toEqual([
      { name: "Library one", url: A },
      { name: "Library two", url: B },
    ]);
    expect(updateCue).toHaveBeenCalledWith("cue-1", {
      assetUrls: [A, B],
      castSlots: [1, 2],
    });
    // The picker closes once the cast is updated.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps solo scenes to a single library pick", async () => {
    await seedLibrary([
      { name: "Solo one", origin: "upload", src: A },
      { name: "Solo two", origin: "upload", src: B },
    ]);
    const { engine, updateCue } = makeHarness("solo");

    renderControls(root, engine);
    await act(async () => {
      buttonByText(container, "Add from library")!.click();
    });
    await act(async () => {});
    for (const name of ["Solo one", "Solo two"]) {
      const card = Array.from(container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find(
        (button) => button.textContent?.includes(name),
      );
      await act(async () => {
        card!.click();
      });
    }
    await act(async () => {
      buttonByText(container, "Add 2 to cast")!.click();
    });

    expect(updateCue).toHaveBeenCalledWith("cue-1", { assetUrls: [A], castSlots: [1] });
  });
});
