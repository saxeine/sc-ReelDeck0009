// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IbcCustomizer } from "../src/components/ibc/IbcCustomizer";

function Harness() {
  const [label, setLabel] = useState("Launch");
  return (
    <div>
      <button id="launch-button" onClick={() => setLabel("Updated")}><span>{label} </span><em>sequence</em></button>
      <p id="status-label">Ready</p>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<IbcCustomizer><Harness /></IbcCustomizer>));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.getElementById("portal-control")?.remove();
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
  localStorage.clear();
  vi.unstubAllGlobals();
});

function rightClick(element: HTMLElement) {
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 90, clientY: 80 });
  act(() => element.dispatchEvent(event));
  return event;
}

function editSelectedText(value: string) {
  const dialog = container.querySelector<HTMLDialogElement>("dialog.ibc-dialog")!;
  const input = dialog.querySelector<HTMLInputElement>("input[aria-label='Selected element text or label']")!;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("IBC system customiser", () => {
  it("opens from a right-click and edits every text segment of the selected label", () => {
    const button = container.querySelector<HTMLButtonElement>("#launch-button")!;
    const event = rightClick(button);
    const dialog = container.querySelector<HTMLDialogElement>("dialog.ibc-dialog")!;
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".ibc-heading h2")?.textContent).toBe("SYSTEM CUSTOMISER");

    editSelectedText("Create Reel");
    expect(button.textContent).toBe("Create Reel");
    expect(JSON.parse(localStorage.getItem("reeldeck.ibc.config.v1") || "{}")["#root #launch-button"].config.text).toBe("Create Reel");
  });

  it("adds a visible label to an icon-only control", () => {
    const button = document.createElement("button");
    button.id = "icon-only";
    button.setAttribute("aria-label", "Dismiss");
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 10 10"><path d="M1 1L9 9" /></svg>';
    container.appendChild(button);
    rightClick(button);

    editSelectedText("Close panel");
    expect(button.getAttribute("aria-label")).toBe("Close panel");
    expect(button.getAttribute("data-ibc-visible-label")).toBe("Close panel");

    const reset = Array.from(container.querySelectorAll<HTMLButtonElement>(".ibc-actions button"))
      .find((action) => action.textContent?.includes("Reset"))!;
    act(() => reset.click());
    expect(button.getAttribute("aria-label")).toBe("Dismiss");
    expect(button.hasAttribute("data-ibc-visible-label")).toBe(false);
  });

  it("keeps the editor movable and also opens for body-portaled controls", () => {
    const button = container.querySelector<HTMLButtonElement>("#launch-button")!;
    rightClick(button);
    const dialog = container.querySelector<HTMLDialogElement>("dialog.ibc-dialog")!;
    const panel = dialog.querySelector<HTMLElement>(".ibc-window")!;
    const initialLeft = Number.parseFloat(panel.style.left);
    const header = dialog.querySelector<HTMLElement>(".ibc-header")!;
    act(() => header.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })));
    act(() => window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 145, clientY: 100 })));
    expect(Number.parseFloat(panel.style.left)).toBe(initialLeft + 45);
    act(() => window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })));

    act(() => dialog.querySelector<HTMLButtonElement>(".ibc-close")!.click());
    const portalButton = document.createElement("button");
    portalButton.id = "portal-control";
    portalButton.textContent = "Portal control";
    document.body.appendChild(portalButton);
    rightClick(portalButton);
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".ibc-status")?.textContent).toContain("PORTAL CONTROL");
    portalButton.remove();
  });

  it("applies an icon from the icon set dock and removes it on reset", () => {
    const button = container.querySelector<HTMLButtonElement>("#launch-button")!;
    rightClick(button);
    const dialog = container.querySelector<HTMLDialogElement>("dialog.ibc-dialog")!;

    // The icon set lives under the Icons tab and starts folded up.
    expect(dialog.querySelector(".ibc-icon-dock")).toBeNull();
    const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[role='tab']"));
    act(() => tabs.find((tab) => tab.textContent?.includes("Icons"))!.click());
    expect(dialog.querySelector(".ibc-icon-dock")).not.toBeNull();
    expect(dialog.querySelector(".ibc-dock-grid")).toBeNull();

    const foldToggle = dialog.querySelector<HTMLButtonElement>(".ibc-dock-head")!;
    expect(foldToggle.getAttribute("aria-expanded")).toBe("false");
    act(() => foldToggle.click());
    expect(foldToggle.getAttribute("aria-expanded")).toBe("true");
    expect(dialog.querySelector(".ibc-dock-grid")).not.toBeNull();

    const filmButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".ibc-icon-dock button"))
      .find((iconButton) => iconButton.getAttribute("aria-label") === "Apply film icon")!;
    act(() => filmButton.click());
    expect(button.getAttribute("data-ibc-icon")).toBe("film");
    expect(button.style.getPropertyValue("--ibc-icon-image")).toContain("url(");
    const stored = JSON.parse(localStorage.getItem("reeldeck.ibc.config.v1") || "{}");
    expect(stored["#root #launch-button"].config.icon).toBe("film");

    const remove = dialog.querySelector<HTMLButtonElement>(".ibc-icon-dock .ibc-dock-clear")!;
    act(() => remove.click());
    expect(button.hasAttribute("data-ibc-icon")).toBe(false);
    expect(button.style.getPropertyValue("--ibc-icon-image")).toBe("");

    act(() => filmButton.click());
    const reset = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".ibc-actions button"))
      .find((action) => action.textContent?.includes("Reset"))!;
    act(() => reset.click());
    expect(button.hasAttribute("data-ibc-icon")).toBe(false);
  });

  it("applies icon/text modes and resets the selected element", () => {
    const button = container.querySelector<HTMLButtonElement>("#launch-button")!;
    rightClick(button);
    const dialog = container.querySelector<HTMLDialogElement>("dialog.ibc-dialog")!;
    const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[role='tab']"));
    act(() => tabs.find((tab) => tab.textContent?.includes("Toggles"))!.click());
    const textMode = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".ibc-mode-button"))
      .find((mode) => mode.textContent?.includes("Text"))!;
    act(() => textMode.click());
    expect(button.getAttribute("data-ibc-show-icon")).toBe("false");

    const reset = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".ibc-actions button"))
      .find((action) => action.textContent?.includes("Reset"))!;
    act(() => reset.click());
    expect(button.textContent).toBe("Launch sequence");
    expect(button.hasAttribute("data-ibc-show-icon")).toBe(false);
    expect(localStorage.getItem("reeldeck.ibc.config.v1")).toBe("{}");
  });
});
