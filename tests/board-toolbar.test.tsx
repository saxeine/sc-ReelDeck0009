// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardView, type BoardApi } from "../src/components/BoardView";
import { seedDoc } from "../src/lib/seed";
import type { Doc, Filters } from "../src/types";

const filters: Filters = { query: "", shot: "ALL", status: "ALL", sort: "sequence" };

function makeApi(overrides: Partial<BoardApi> = {}): BoardApi {
  return {
    update: () => {},
    remove: () => {},
    duplicate: () => {},
    reorder: () => {},
    bake: () => {},
    setStatus: () => {},
    comment: () => {},
    deleteComment: () => {},
    importFiles: () => {},
    replaceImage: () => {},
    ...overrides,
  };
}

function renderBoard(root: Root, doc: Doc, api: BoardApi, selected: string[] = []) {
  act(() => {
    root.render(
      <BoardView
        doc={doc}
        visible={doc.frames}
        filters={filters}
        setFilters={() => {}}
        views={[]}
        activeView=""
        onApplyView={() => {}}
        onSaveView={() => {}}
        onDeleteView={() => {}}
        selected={selected}
        setSelected={() => {}}
        focusId={null}
        setFocusId={() => {}}
        density={268}
        setDensity={() => {}}
        slotText
        setSlotText={() => {}}
        api={api}
        onOpenEditor={() => {}}
        onOpenStudio={() => {}}
        onOpenZoomStudio={() => {}}
        onOpenAniPlayer={() => {}}
        onGoSheet={() => {}}
        onSendToAdShop={() => {}}
        onSlice={() => {}}
        starts={{}}
        searchRef={{ current: null }}
      />
    );
  });
}

describe("board toolbar", () => {
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

  it("shows All for an empty selection and a count when frames are selected", () => {
    const doc = seedDoc();
    renderBoard(root, doc, makeApi());
    const all = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.trim() === "All"
    );
    expect(all).toBeTruthy();
    expect(container.textContent).not.toContain("Select all");

    renderBoard(root, doc, makeApi(), doc.frames.slice(0, 2).map((f) => f.id));
    const counted = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("2 selected")
    );
    expect(counted).toBeTruthy();
  });

  it("clears every frame through api.remove", () => {
    const doc = seedDoc();
    const remove = vi.fn();
    renderBoard(root, doc, makeApi({ remove }));
    const clear = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.trim() === "Clear"
    );
    expect(clear).toBeTruthy();
    expect(clear!.getAttribute("aria-label")).toBe("Clear board");
    act(() => {
      (clear as HTMLButtonElement).click();
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(doc.frames.map((f) => f.id));
  });

  it("disables Clear when the board is empty", () => {
    const doc: Doc = { ...seedDoc(), frames: [] };
    renderBoard(root, doc, makeApi());
    const clear = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.trim() === "Clear"
    );
    expect(clear).toBeTruthy();
    expect((clear as HTMLButtonElement).disabled).toBe(true);
  });
});
