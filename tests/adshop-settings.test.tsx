// @vitest-environment jsdom
import { act, StrictMode, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdShopHandoff } from "../src/types";
import { AdShop } from "../src/components/AdShop";

// The original editors have their own integration tests. These stubs let us
// exercise the transition out of a native settings dialog without mounting the
// much larger studios in a DOM-only test environment.
vi.mock("../src/components/AdShopSequencer", () => ({
  AdShopSequencer: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Sequencer"><button onClick={onClose}>Close sequencer</button></div>
  ),
}));
vi.mock("../src/components/GridConfigurationStudio", () => ({
  GridConfigurationStudio: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Panel arrangement"><button onClick={onClose}>Close arrangement</button></div>
  ),
}));
vi.mock("../src/components/ledStudio/LedStudioModal", () => ({
  LedStudioModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Choreographer"><button onClick={onClose}>Close choreographer</button></div>
  ),
}));

const images = [
  { id: "one", name: "First frame", src: "data:image/png;base64,Zmlyc3Q=" },
  { id: "two", name: "Second frame", src: "data:image/png;base64,c2Vjb25k" },
];

function Harness() {
  const [handoff, setHandoff] = useState<AdShopHandoff | null>(null);
  const stage = useRef<HTMLElement>(null);
  const commit = useRef<HTMLButtonElement>(null);
  return <AdShop stageRef={stage} commitButtonRef={commit} handoff={handoff} reelDeckCount={images.length}
    onLoadReelDeck={() => setHandoff({ images, returnTo: "adshop" })}
    onOpenSlice={() => {}} onOpenReelDeck={() => {}} onCommitAndReturn={() => {}} onOpenLibrary={() => {}} />;
}

let container: HTMLDivElement;
let root: Root;
let animationFrames: FrameRequestCallback[];
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;
const originalScrollTo = HTMLElement.prototype.scrollTo;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function element<T extends Element = HTMLElement>(selector: string): T {
  const result = container.querySelector<T>(selector);
  if (!result) throw new Error(`Missing element: ${selector}`);
  return result;
}
function click(selector: string) {
  act(() => element<HTMLElement>(selector).click());
}
function flushFrames() {
  act(() => {
    const callbacks = animationFrames.splice(0);
    callbacks.forEach((callback) => callback(performance.now()));
  });
}
function openSettings(section: "image" | "display" | "deck" | "appearance") {
  click(".as-header-settings");
  const index = { image: 1, display: 2, deck: 3, appearance: 5 }[section];
  click(`.as-settings-menu-item:nth-of-type(${index})`);
  expect(element<HTMLDialogElement>(".as-settings-dialog").open).toBe(true);
}
function closeSettings() {
  click(".as-settings-close");
  flushFrames();
}

beforeEach(() => {
  // jsdom does not implement the native dialog top layer. Browsers are also
  // exercised separately for actual focus trapping, backdrop and layout.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.querySelector<HTMLElement>(".as-settings-close")?.focus();
  };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  HTMLElement.prototype.scrollTo = vi.fn();
  animationFrames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<StrictMode><Harness /></StrictMode>));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
  HTMLElement.prototype.scrollTo = originalScrollTo;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdShop settings", () => {
  it("keeps each control area in its own dismissible dialog and retains display changes", () => {
    expect(container.querySelector(".as-sources, .as-control-panel, .as-animation-panel")).toBeNull();
    click(".as-header-settings");
    expect(element(".as-header-settings").getAttribute("aria-expanded")).toBe("true");
    expect([...container.querySelectorAll(".as-settings-menu-item strong")].map((item) => item.textContent))
      .toEqual(["Your image", "Display controls", "Live Control Deck", "Sequencer", "Appearance & theme"]);
    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(container.querySelector(".as-settings-menu")).toBeNull();

    openSettings("display");
    expect(element(".as-settings-dialog").textContent).toContain("MAKE IT YOURS");
    click(".as-shape-options button:nth-child(2)");
    click(".as-quick-controls button:nth-child(2)");
    closeSettings();
    expect(document.activeElement).toBe(element(".as-header-settings"));
    expect(element(".as-grid-frame").classList.contains("as-grid-frame--landscape")).toBe(true);
    expect(container.querySelectorAll(".as-tile-number")).toHaveLength(16);

    openSettings("display");
    expect(element(".as-shape-options button:nth-child(2)").getAttribute("aria-pressed")).toBe("true");
    act(() => element(".as-settings-dialog").dispatchEvent(new Event("cancel", { cancelable: true })));
    flushFrames();
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(document.activeElement).toBe(element(".as-header-settings"));
  });

  it("wraps Tab and Shift+Tab inside a settings dialog", () => {
    // jsdom has no layout; make focusable controls report a visible rectangle.
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue({ length: 1 } as DOMRectList);
    openSettings("image");
    const first = element<HTMLElement>(".as-settings-close");
    const last = element<HTMLElement>(".as-deck-action");
    first.focus();
    const backwards = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    act(() => first.dispatchEvent(backwards));
    expect(backwards.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    const forwards = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => last.dispatchEvent(forwards));
    expect(forwards.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("shows image validation errors and keeps them visible when settings is closed", () => {
    openSettings("image");
    const dialogInput = element<HTMLInputElement>('.as-settings-dialog input[type="file"]');
    const clickDialogInput = vi.spyOn(dialogInput, "click");
    click(".as-upload-button");
    expect(clickDialogInput).toHaveBeenCalledOnce();
    Object.defineProperty(dialogInput, "files", { configurable: true, value: [new File(["bad"], "bad.txt", { type: "text/plain" })] });
    act(() => dialogInput.dispatchEvent(new Event("change", { bubbles: true })));
    expect(element(".as-settings-dialog [role=alert]").textContent).toContain("Please choose an image file");
    closeSettings();
    expect(element(".as-error-notice").textContent).toContain("Please choose an image file");
  });

  it("closes image settings for a ReelDeck preview, focuses its actions and preserves cancel semantics", () => {
    openSettings("image");
    click(".as-deck-action");
    flushFrames();
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(document.activeElement).toBe(element(".as-commit-primary"));
    expect(element(".as-grid").getAttribute("aria-label")).toContain("2 ReelDeck images");

    openSettings("image");
    expect(element(".as-deck-library").textContent).toContain("2 images received");
    click(".as-deck-modes button:first-child");
    click(".as-deck-thumbnail:nth-child(2)");
    closeSettings();
    expect(element(".as-grid").getAttribute("aria-label")).toContain("Second frame");
    click(".as-commit-cancel");
    expect(element(".as-grid").getAttribute("aria-label")).toContain("Demo campaign");
  });

  it("releases the settings top layer before opening each studio or panel arrangement", async () => {
    openSettings("deck");
    click(".as-tool-card:nth-of-type(3)");
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(element('[aria-label="Panel arrangement"]')).toBeTruthy();
    click('[aria-label="Panel arrangement"] button');
    flushFrames();
    expect(document.activeElement).toBe(element(".as-header-settings"));

    openSettings("deck");
    await act(async () => { element<HTMLElement>(".as-tool-card:nth-of-type(1)").click(); });
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(element('[aria-label="Sequencer"]')).toBeTruthy();
    click('[aria-label="Sequencer"] button');
    flushFrames();
    expect(document.activeElement).toBe(element(".as-header-settings"));

    openSettings("deck");
    await act(async () => { element<HTMLElement>(".as-tool-card:nth-of-type(2)").click(); });
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(element('[aria-label="Choreographer"]')).toBeTruthy();
  });

  it("opens the Route sequencer straight from the gear menu", async () => {
    click(".as-header-settings");
    expect(element("button.as-settings-menu-item:nth-of-type(4)").textContent).toContain("Route sequencer");
    await act(async () => { element<HTMLElement>(".as-settings-menu-item:nth-of-type(4)").click(); });
    expect(container.querySelector(".as-settings-menu")).toBeNull();
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(element('[aria-label="Sequencer"]')).toBeTruthy();
  });

  it("cancels a pending studio launch on dismissal and keeps settings open on preparation errors", async () => {
    let finishFetch: (response: { ok: boolean; blob: () => Promise<Blob> }) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { finishFetch = resolve; })));
    vi.stubGlobal("Image", class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });
    vi.stubGlobal("FileReader", class {
      result = "data:image/png;base64,YXJ0";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    });
    URL.createObjectURL = vi.fn(() => "blob:artwork");
    URL.revokeObjectURL = vi.fn();
    openSettings("image");
    const upload = element<HTMLInputElement>('.as-settings-dialog input[type="file"]');
    Object.defineProperty(upload, "files", { configurable: true, value: [new File(["art"], "art.png", { type: "image/png" })] });
    act(() => upload.dispatchEvent(new Event("change", { bubbles: true })));
    closeSettings();
    openSettings("deck");
    await act(async () => { element<HTMLElement>(".as-tool-card:nth-of-type(1)").click(); });
    expect(element(".as-animation-panel").textContent).toContain("Preparing artwork");
    closeSettings();
    await act(async () => { finishFetch({ ok: true, blob: async () => new Blob(["art"]) }); });
    expect(container.querySelector('[aria-label="Sequencer"]')).toBeNull();
    expect(container.querySelector(".as-settings-dialog")).toBeNull();
    expect(document.activeElement).toBe(element(".as-header-settings"));

    openSettings("deck");
    await act(async () => { element<HTMLElement>(".as-tool-card:nth-of-type(1)").click(); });
    await act(async () => { finishFetch({ ok: false, blob: async () => new Blob() }); });
    expect(element<HTMLDialogElement>(".as-settings-dialog").open).toBe(true);
    expect(element(".as-settings-dialog [role=alert]").textContent).toContain("The selected image is no longer available");
    expect(element<HTMLButtonElement>(".as-tool-card:nth-of-type(1)").disabled).toBe(false);
    expect(container.querySelector('[aria-label="Sequencer"]')).toBeNull();
  });

  it("allows switching theme from the appearance settings", () => {
    openSettings("appearance");
    expect(element(".as-settings-dialog").textContent).toContain("Look & feel");
    const themeButtons = container.querySelectorAll(".as-theme-option");
    expect(themeButtons.length).toBe(4);
    closeSettings();
    expect(document.activeElement).toBe(element(".as-header-settings"));
  });
});
