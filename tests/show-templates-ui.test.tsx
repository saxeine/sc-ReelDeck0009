// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShowTemplates } from "../src/components/ledStudio/components/advert/ShowTemplates";
import type { ChoreographyEngine } from "../src/components/ledStudio/engine/useChoreography";

function makeShow() {
  const template = {
    id: "t1",
    name: "My show",
    description: "Saved perimeter show",
    cues: [],
    bpm: 120,
    timeScale: 1,
    loop: true,
    createdAt: 1,
    updatedAt: 1,
  };
  const preset = {
    id: "stadium-takeover",
    name: "Stadium takeover",
    description: "Built-in show",
    cues: [],
    bpm: 120,
    timeScale: 0.65,
    loop: true,
  };
  const show = {
    presets: [preset],
    templates: [template],
    activeTemplate: template,
    activeTemplateId: template.id,
    templateDirty: true,
    saveTemplate: vi.fn(async () => null),
    overwriteTemplate: vi.fn(async () => {}),
    renameTemplate: vi.fn(async () => {}),
    deleteTemplate: vi.fn(async () => {}),
    loadTemplate: vi.fn(),
    loadPreset: vi.fn(),
    editPresetAsTemplate: vi.fn(async () => {}),
  };
  return { show: show as unknown as ChoreographyEngine, spies: show };
}

function buttonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("show template editor UI", () => {
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

  it("saves the current show from the template form", async () => {
    const { show, spies } = makeShow();
    act(() => root.render(<ShowTemplates show={show} />));

    await act(async () => {
      buttonByText(container, "Save current show as template")!.click();
    });
    const name = container.querySelector<HTMLInputElement>("input[aria-label='Template name']")!;
    await act(async () => {
      setValue(name, "Fresh show");
    });
    await act(async () => {
      buttonByText(container, "Save show")!.click();
    });

    expect(spies.saveTemplate).toHaveBeenCalledWith("Fresh show", "");
  });

  it("saves dirty changes back to the active template", async () => {
    const { show, spies } = makeShow();
    act(() => root.render(<ShowTemplates show={show} />));

    expect(container.textContent).toContain("unsaved");
    await act(async () => {
      buttonByText(container, "Save changes to")!.click();
    });
    expect(spies.overwriteTemplate).toHaveBeenCalledWith("t1");
  });

  it("copies a built-in show into an editable template",() => {
    const { show, spies } = makeShow();
    act(() => root.render(<ShowTemplates show={show} />));

    act(() => {
      buttonByText(container, "Edit copy")!.click();
    });
    expect(spies.editPresetAsTemplate).toHaveBeenCalledWith("stadium-takeover");
  });

  it("asks for confirmation before deleting a template", async () => {
    const { show, spies } = makeShow();
    act(() => root.render(<ShowTemplates show={show} />));

    const trash = container.querySelector<HTMLButtonElement>("button[title='Delete template']")!;
    await act(async () => {
      trash.click();
    });
    expect(spies.deleteTemplate).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Delete “My show”?");

    await act(async () => {
      buttonByText(container, "Delete")!.click();
    });
    expect(spies.deleteTemplate).toHaveBeenCalledWith("t1");
  });

  it("renames a template from the inline form", async () => {
    const { show, spies } = makeShow();
    act(() => root.render(<ShowTemplates show={show} />));

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button[title='Rename template']")!.click();
    });
    const name = container.querySelector<HTMLInputElement>("input[aria-label='Template name']")!;
    await act(async () => {
      setValue(name, "Renamed show");
    });
    await act(async () => {
      buttonByText(container, "Save name")!.click();
    });
    expect(spies.renameTemplate).toHaveBeenCalledWith("t1", "Renamed show", "Saved perimeter show");
  });
});
