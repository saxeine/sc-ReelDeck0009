// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChoreography, type ChoreographyEngine } from "../src/components/ledStudio/engine/useChoreography";
import type { AdvertAsset } from "../src/components/ledStudio/types";
import { resetChoreoTemplatesForTests } from "../src/services/choreoTemplates";

const POOL: AdvertAsset[] = [
  { id: "a", name: "Ad A", url: "data:image/png;base64,AAAA", source: "url" },
  { id: "b", name: "Ad B", url: "data:image/png;base64,BBBB", source: "url" },
  { id: "c", name: "Ad C", url: "data:image/png;base64,CCCC", source: "url" },
  { id: "d", name: "Ad D", url: "data:image/png;base64,DDDD", source: "url" },
];

let latest: ChoreographyEngine | null = null;

function Harness() {
  const engine = useChoreography({ pool: POOL, cols: 4, notify: () => {} });
  latest = engine;
  return <div>{engine.templates.length}</div>;
}

describe("choreographer show templates", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await resetChoreoTemplatesForTests();
    latest = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function mount() {
    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {});
    expect(latest).toBeTruthy();
    return () => latest!;
  }

  it("saves the current show, tracks edits, and overwrites the template", async () => {
    const engine = await mount();
    expect(engine().templates).toHaveLength(0);

    let created: Awaited<ReturnType<ChoreographyEngine["saveTemplate"]>> = null;
    await act(async () => {
      created = await engine().saveTemplate("Night run", "Perimeter show");
    });
    expect(created).toBeTruthy();
    expect(engine().templates).toHaveLength(1);
    expect(engine().activeTemplate?.name).toBe("Night run");
    expect(engine().templateDirty).toBe(false);
    expect(engine().templates[0].cues.length).toBe(engine().cues.length);

    const cueId = engine().cues[0].id;
    await act(async () => {
      engine().updateCue(cueId, { motion: "bloom" });
    });
    expect(engine().templateDirty).toBe(true);

    await act(async () => {
      await engine().overwriteTemplate(created!.id);
    });
    expect(engine().templateDirty).toBe(false);
    expect(engine().templates[0].cues[0].motion).toBe("bloom");

    await act(async () => {
      engine().setBpm(150);
    });
    expect(engine().templateDirty).toBe(true);

    await act(async () => {
      engine().loadTemplate(created!.id);
    });
    expect(engine().bpm).toBe(120);
    expect(engine().templateDirty).toBe(false);

    await act(async () => {
      await engine().renameTemplate(created!.id, "Renamed show", "New description");
    });
    expect(engine().templates[0].name).toBe("Renamed show");
    expect(engine().templates[0].description).toBe("New description");

    await act(async () => {
      await engine().deleteTemplate(created!.id);
    });
    expect(engine().templates).toHaveLength(0);
    expect(engine().activeTemplateId).toBe("");
  });

  it("turns a built-in show into an editable copy", async () => {
    const engine = await mount();
    await act(async () => {
      await engine().editPresetAsTemplate("stadium-takeover");
    });
    expect(engine().templates).toHaveLength(1);
    expect(engine().activeTemplate?.name).toContain("Stadium takeover");
    expect(engine().activeTemplate?.cues.length).toBe(3);
    expect(engine().activeTemplateId).not.toBe("");
    expect(engine().templateDirty).toBe(false);
  });

  it("persists saved templates across a module reload", async () => {
    const engine = await mount();
    await act(async () => {
      await engine().saveTemplate("Durable show");
    });
    vi.resetModules();
    const fresh = await import("../src/services/choreoTemplates");
    const stored = await fresh.loadChoreoTemplates();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Durable show");
  });
});
