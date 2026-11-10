// @vitest-environment jsdom
import { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardView, type BoardApi } from "../src/components/BoardView";
import { seedDoc } from "../src/lib/seed";
import type { Filters } from "../src/types";

const noopApi: BoardApi = {
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
};

const filters: Filters = { query: "", shot: "ALL", status: "ALL", sort: "sequence" };

function Harness() {
  const [density, setDensity] = useState(268);
  const [slotText, setSlotText] = useState(true);
  const doc = seedDoc();
  return (
    <>
      <span data-testid="density-value">{density}</span>
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
        selected={[]}
        setSelected={() => {}}
        focusId={null}
        setFocusId={() => {}}
        density={density}
        setDensity={setDensity}
        slotText={slotText}
        setSlotText={setSlotText}
        api={noopApi}
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
    </>
  );
}

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
});

function cycleButton() {
  return container.querySelector<HTMLButtonElement>("[data-testid='slot-size-cycle']")!;
}

function densityValue() {
  return container.querySelector("[data-testid='density-value']")!.textContent;
}

function hasSlotText() {
  return Boolean(container.querySelector("input[placeholder='Name this frame']"));
}

describe("board slot size cycle button", () => {
  it("cycles through sizes, the image-only state, and the thumbnail state", async () => {
    await act(async () => { root.render(<Harness />); });

    // Icon-only in every state: the state is reported via the tooltip, and the
    // button's shape never changes so it cannot bounce around the toolbar.
    const titles: string[] = [];
    const shapes: string[] = [];
    const record = () => {
      const button = cycleButton();
      expect(button.textContent?.trim()).toBe("");
      titles.push(button.getAttribute("title")!);
      shapes.push(button.className);
    };

    record();
    expect(titles.at(-1)).toContain("Board slots: Default");
    expect(densityValue()).toBe("268");
    expect(hasSlotText()).toBe(true);

    await act(async () => { cycleButton().click(); });
    record();
    expect(titles.at(-1)).toContain("Board slots: Small");
    expect(densityValue()).toBe("200");
    expect(hasSlotText()).toBe(true);

    await act(async () => { cycleButton().click(); });
    record();
    expect(titles.at(-1)).toContain("Board slots: Mini");
    expect(densityValue()).toBe("150");
    expect(hasSlotText()).toBe(true);

    // Image without text.
    await act(async () => { cycleButton().click(); });
    record();
    expect(titles.at(-1)).toContain("Board slots: Image only");
    expect(densityValue()).toBe("150");
    expect(hasSlotText()).toBe(false);

    // Thumbnail size (still text-free).
    await act(async () => { cycleButton().click(); });
    record();
    expect(titles.at(-1)).toContain("Board slots: Thumbnail");
    expect(densityValue()).toBe("110");
    expect(hasSlotText()).toBe(false);

    // Back to the start.
    await act(async () => { cycleButton().click(); });
    record();
    expect(titles.at(-1)).toContain("Board slots: Default");
    expect(densityValue()).toBe("268");
    expect(hasSlotText()).toBe(true);

    expect(new Set(shapes).size).toBe(1);
  });

  it("drives the board grid column width with the chosen size", async () => {
    await act(async () => { root.render(<Harness />); });
    await act(async () => { cycleButton().click(); });

    let grid = container.querySelector<HTMLElement>("[style*='grid-template-columns'], [style*='gridTemplateColumns']");
    expect(grid?.style.gridTemplateColumns).toContain("200px");

    // Reach the thumbnail state and check its width too.
    await act(async () => { cycleButton().click(); });
    await act(async () => { cycleButton().click(); });
    await act(async () => { cycleButton().click(); });
    grid = container.querySelector<HTMLElement>("[style*='grid-template-columns'], [style*='gridTemplateColumns']");
    expect(grid?.style.gridTemplateColumns).toContain("110px");
  });
});
