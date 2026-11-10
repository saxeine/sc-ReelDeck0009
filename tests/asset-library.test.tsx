// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetPicker, AssetProvider } from "../src/components/assetProvider/AssetProvider";
import {
  addLibraryAssets,
  getLibrarySnapshot,
  libraryStorageMode,
  loadLibrary,
  removeLibraryAssets,
  resetLibraryForTests,
  updateLibraryAsset,
} from "../src/services/assetLibrary";

const A = "data:image/png;base64,AAAA";
const B = "data:image/png;base64,BBBB";

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await resetLibraryForTests();
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("asset library service", () => {
  it("stores assets in the database and survives a module reload", async () => {
    expect(libraryStorageMode()).toBe("indexeddb");
    const [created] = await addLibraryAssets([
      { name: "Sliced block", origin: "slice", src: A, w: 640, h: 360, tags: ["slice"] },
    ]);
    await updateLibraryAsset(created.id, { name: "Sliced block v2", favorite: true });

    // A fresh module instance proves the records live in the database,
    // not in the previous session's memory.
    vi.resetModules();
    const fresh = await import("../src/services/assetLibrary");
    const assets = await fresh.loadLibrary();
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      id: created.id,
      name: "Sliced block v2",
      origin: "slice",
      favorite: true,
      w: 640,
      h: 360,
      tags: ["slice"],
      src: A,
    });

    await fresh.removeLibraryAssets([created.id]);
    vi.resetModules();
    const third = await import("../src/services/assetLibrary");
    expect(await third.loadLibrary()).toHaveLength(0);
  });

  it("adds zoom creations and keeps the newest first", async () => {
    await addLibraryAssets([{ name: "Old", origin: "upload", src: A }]);
    const [zoom] = await addLibraryAssets([{ name: "Zoom A", origin: "zoom", src: B, tags: ["zoom-studio"] }]);
    const assets = await loadLibrary();
    expect(assets.map((asset) => asset.name)).toEqual(["Zoom A", "Old"]);
    expect(assets[0].id).toBe(zoom.id);
  });
});

describe("AssetProvider holding area", () => {
  it("edits name, tags, and favourites, and deletes assets", async () => {
    const [asset] = await addLibraryAssets([
      { name: "Wall piece", origin: "slice", src: A, w: 320, h: 180, tags: ["slice"] },
    ]);
    await act(async () => { root.render(<AssetProvider />); });
    await act(async () => {});

    const card = Array.from(container.querySelectorAll<HTMLElement>("[role='button']"))
      .find((el) => el.textContent?.includes("Wall piece"))!;
    expect(card).toBeTruthy();
    await act(async () => { card.click(); });

    // Rename through the inspector.
    const nameInput = container.querySelector<HTMLInputElement>("input[aria-label='Asset name']")!;
    nameInput.value = "Wall piece v2";
    await act(async () => {
      nameInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(getLibrarySnapshot()[0].name).toBe("Wall piece v2");

    // Tag through the inspector.
    const tagInput = container.querySelector<HTMLInputElement>("input[aria-label='Add tag']")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(tagInput, "hero");
      tagInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(getLibrarySnapshot()[0].tags).toContain("hero");

    // Favourite through the inspector.
    const favourite = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "Favourite")!;
    await act(async () => { favourite.click(); });
    expect(getLibrarySnapshot()[0].favorite).toBe(true);

    // Delete through the inspector.
    const remove = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("Delete asset"))!;
    await act(async () => { remove.click(); });
    expect(getLibrarySnapshot()).toHaveLength(0);
    expect(container.textContent).not.toContain("Wall piece v2");
  });
});

describe("AssetPicker consumer feed", () => {
  it("sends the chosen library assets to the consumer", async () => {
    const seeded = await addLibraryAssets([
      { name: "Source one", origin: "upload", src: A },
      { name: "Source two", origin: "zoom", src: B },
    ]);
    const onSend = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <AssetPicker open title="Add sources from library" onClose={onClose} onSend={onSend} />,
      );
    });
    await act(async () => {});

    for (const name of ["Source one", "Source two"]) {
      const card = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.getAttribute("aria-pressed") !== null && button.textContent?.includes(name))!;
      await act(async () => { card.click(); });
    }
    const add = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.startsWith("Add "))!;
    await act(async () => { add.click(); });

    expect(onSend).toHaveBeenCalledTimes(1);
    const sent = onSend.mock.calls[0][0] as Array<{ id: string }>;
    expect(sent.map((asset) => asset.id).sort()).toEqual(seeded.map((asset) => asset.id).sort());
    expect(onClose).not.toHaveBeenCalled();
  });
});
