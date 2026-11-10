// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewDock } from "../src/components/PreviewDock";

function renderDock(overrides: Partial<Parameters<typeof PreviewDock>[0]> = {}) {
  const onToggle = vi.fn();
  const props = {
    preview: null,
    width: 1200,
    height: 800,
    frames: 3,
    themeLabel: "Darkroom",
    rendering: false,
    renderMs: 42,
    locked: false,
    hidden: true,
    onToggle,
    onOpenSheet: () => {},
    onExport: () => {},
    onCopy: () => {},
    onHandoff: () => {},
    ...overrides,
  };
  return { onToggle, props };
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

describe("live preview dock visibility", () => {
  it("is hidden by default with only a thin Show handle", async () => {
    const { onToggle, props } = renderDock({ hidden: true });
    await act(async () => { root.render(<PreviewDock {...props} />); });

    expect(container.textContent).toContain("HIDDEN");
    const show = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("Show"))!;
    expect(show).toBeTruthy();
    expect(container.textContent).not.toContain("Hide");

    await act(async () => { show.click(); });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows the full dock with a Hide control when visible", async () => {
    const { onToggle, props } = renderDock({ hidden: false });
    await act(async () => { root.render(<PreviewDock {...props} />); });

    expect(container.textContent).toContain("Live preview");
    expect(container.textContent).toContain("Hand off");
    const hide = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("Hide"))!;
    expect(hide).toBeTruthy();

    await act(async () => { hide.click(); });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
