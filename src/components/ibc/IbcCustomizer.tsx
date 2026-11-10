import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "../Icon";
import "./ibc.css";

const CONFIG_KEY = "reeldeck.ibc.config.v1";
const DEFAULT_KEY = "reeldeck.ibc.defaults.v1";
const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 560;

// Icons offered by the picker dock below the editing tabs.
const ICON_SET = [
  "film", "grid", "sheet", "spark", "plus", "search", "pencil",
  "trash", "copy", "scissors", "crop", "expand", "cursor", "arrow",
  "square", "text", "undo", "redo", "check", "x", "filter",
  "palette", "image", "layers", "send", "save", "refresh", "download",
  "upload", "play", "pause", "bolt", "eye", "tag", "clock", "link",
];

type TextKind = "text" | "placeholder" | "aria-label" | "title" | "accessible";
type IbcTab = "styles" | "icons" | "toggles";

interface IbcConfig {
  text?: string;
  icon?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontWeight?: number;
  borderRadius?: number;
  showIcon?: boolean;
  showText?: boolean;
  iconSize?: number;
  iconColor?: string;
  disabled?: boolean;
}

interface IbcRecord {
  selector: string;
  label: string;
  originalText: string;
  originalTextSegments: string[];
  textKind: TextKind;
  originalAriaLabel: string | null;
  originalAriaDisabled: string | null;
  originalTitle: string | null;
  originalPlaceholder: string | null;
  config: IbcConfig;
}

interface IbcTarget extends IbcRecord {
  key: string;
  element: HTMLElement;
}

interface Position {
  x: number;
  y: number;
}

const PALETTES = [
  { name: "Mint", color: "#62f4bc", background: "#071e1a", border: "#176c55" },
  { name: "Cyan", color: "#67e8f9", background: "#071b25", border: "#12617a" },
  { name: "Violet", color: "#d7a3ff", background: "#1c0c30", border: "#6d2ca2" },
  { name: "Slate", color: "#cbd5e1", background: "#101827", border: "#334155" },
];

const STYLE_VARIABLES: Array<[keyof IbcConfig, string, string]> = [
  ["textColor", "--ibc-text-color", "data-ibc-text-color"],
  ["backgroundColor", "--ibc-background-color", "data-ibc-background-color"],
  ["borderColor", "--ibc-border-color", "data-ibc-border-color"],
  ["fontSize", "--ibc-font-size", "data-ibc-font-size"],
  ["fontWeight", "--ibc-font-weight", "data-ibc-font-weight"],
  ["borderRadius", "--ibc-border-radius", "data-ibc-border-radius"],
  ["iconSize", "--ibc-icon-size", "data-ibc-icon-size"],
  ["iconColor", "--ibc-icon-color", "data-ibc-icon-color"],
];

function readMap<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The editor remains usable when storage is blocked or full.
  }
}

const iconUrlCache = new Map<string, string>();

// The chosen icon is painted with a CSS mask so its colour can follow the
// icon-colour control without rewriting the element's SVG.
function iconImageUrl(name: string) {
  const cached = iconUrlCache.get(name);
  if (cached) return cached;
  const markup = renderToStaticMarkup(<Icon name={name} size={24} strokeWidth={2} />);
  const url = `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
  iconUrlCache.set(name, url);
  return url;
}

function escapeId(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function escapeAttribute(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function createSelector(element: HTMLElement, appRoot: HTMLElement) {
  // Some studios render through a React portal directly under document.body.
  const scope = appRoot.contains(element) ? appRoot : document.body;
  const scopeSelector = scope === appRoot ? `#${escapeId(appRoot.id || "root")}` : "body";
  if (element === scope) return scopeSelector;
  for (const attribute of ["data-editor-control", "data-editor-label", "data-editor-container", "data-testid"]) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const selector = `[${attribute}="${escapeAttribute(value)}"]`;
    if (scope.querySelectorAll(selector).length === 1) return `${scopeSelector} ${selector}`;
  }

  if (element.id && scope.querySelectorAll(`#${escapeId(element.id)}`).length === 1) {
    return `${scopeSelector} #${escapeId(element.id)}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== scope) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    if (current.id && scope.querySelectorAll(`#${escapeId(current.id)}`).length === 1) {
      path.unshift(`#${escapeId(current.id)}`);
      break;
    }
    const siblings = Array.from(parent.children).filter((child) => child.tagName === current!.tagName);
    path.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = parent;
  }
  return `${scopeSelector} > ${path.join(" > ")}`;
}

function textNodes(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const result: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    if (
      text.nodeValue !== null && text.nodeValue !== "" &&
      !text.parentElement?.closest("svg, [aria-hidden='true']")
    ) result.push(text);
    node = walker.nextNode();
  }
  return result;
}

function readText(element: HTMLElement): { value: string; kind: TextKind } {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.hasAttribute("placeholder")) return { value: element.getAttribute("placeholder") ?? "", kind: "placeholder" };
    if (element.hasAttribute("aria-label")) return { value: element.getAttribute("aria-label") ?? "", kind: "aria-label" };
    if (element.hasAttribute("title")) return { value: element.getAttribute("title") ?? "", kind: "title" };
    return { value: "", kind: "placeholder" };
  }
  const nodes = textNodes(element);
  const hasVisibleText = nodes.some((node) => Boolean(node.nodeValue?.trim()));
  if (element.hasAttribute("aria-label") && !hasVisibleText) {
    return { value: element.getAttribute("aria-label") ?? "", kind: "aria-label" };
  }
  if (element.hasAttribute("title") && !hasVisibleText) {
    return { value: element.getAttribute("title") ?? "", kind: "title" };
  }
  return {
    value: hasVisibleText ? nodes.map((node) => node.nodeValue ?? "").join("") : "",
    kind: hasVisibleText ? "text" : "accessible",
  };
}

function targetLabel(element: HTMLElement, text: string) {
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    text.trim() ||
    element.getAttribute("data-editor-control") ||
    element.getAttribute("data-editor-label") ||
    `${element.tagName.toLowerCase()} element`
  );
}

function makeRecord(element: HTMLElement, root: HTMLElement): IbcTarget {
  const selector = createSelector(element, root);
  const { value: originalText, kind: textKind } = readText(element);
  const originalTextSegments = textKind === "text" ? textNodes(element).map((node) => node.nodeValue ?? "") : [];
  return {
    key: selector,
    selector,
    element,
    label: targetLabel(element, originalText),
    originalText,
    originalTextSegments,
    textKind,
    originalAriaLabel: element.getAttribute("aria-label"),
    originalAriaDisabled: element.getAttribute("aria-disabled"),
    originalTitle: element.getAttribute("title"),
    originalPlaceholder: element.getAttribute("placeholder"),
    config: {},
  };
}

function recordFromTarget(target: IbcTarget): IbcRecord {
  return {
    selector: target.selector,
    label: target.label,
    originalText: target.originalText,
    originalTextSegments: target.originalTextSegments,
    textKind: target.textKind,
    originalAriaLabel: target.originalAriaLabel,
    originalAriaDisabled: target.originalAriaDisabled,
    originalTitle: target.originalTitle,
    originalPlaceholder: target.originalPlaceholder,
    config: target.config,
  };
}

function chooseTarget(node: EventTarget | null) {
  if (!(node instanceof Element) || !document.body.contains(node) || node.closest("[data-ibc-ui]")) return null;
  const preferred = node.closest(
    "[data-editor-control], [data-editor-label], [data-editor-container], button, input, textarea, select, [role='button'], a, label"
  );
  let candidate: Element | null = preferred ?? node;
  while (candidate && !(candidate instanceof HTMLElement)) candidate = candidate.parentElement;
  return candidate instanceof HTMLElement && document.body.contains(candidate) ? candidate : null;
}

function setStyleFlag(element: HTMLElement, attribute: string, value: string | undefined) {
  if (value === undefined || value === "") {
    element.removeAttribute(attribute);
    return;
  }
  element.setAttribute(attribute, "true");
}

function setCssVariable(element: HTMLElement, property: string, value: string | number | undefined, unit = "") {
  if (value === undefined || value === "") element.style.removeProperty(property);
  else element.style.setProperty(property, `${value}${unit}`);
}

const managedAttributes = [
  "data-ibc-text-color", "data-ibc-background-color", "data-ibc-border-color",
  "data-ibc-font-size", "data-ibc-font-weight", "data-ibc-border-radius",
  "data-ibc-icon-size", "data-ibc-icon-color", "data-ibc-show-icon",
  "data-ibc-show-text", "data-ibc-disabled", "data-ibc-visible-label",
  "data-ibc-icon",
];

function applyText(element: HTMLElement, value: string, record: IbcRecord, textNodeRef: WeakMap<HTMLElement, Text[]>) {
  if (record.textKind === "placeholder") {
    element.setAttribute("placeholder", value);
    return;
  }
  if (record.textKind === "aria-label") {
    element.setAttribute("aria-label", value);
    if (!record.originalTextSegments.length) element.setAttribute("data-ibc-visible-label", value);
    return;
  }
  if (record.textKind === "title") {
    element.setAttribute("title", value);
    if (!record.originalTextSegments.length) element.setAttribute("data-ibc-visible-label", value);
    return;
  }

  let nodes = textNodeRef.get(element);
  if (!nodes?.length || nodes.some((node) => !element.contains(node))) {
    nodes = textNodes(element);
    if (nodes.length) textNodeRef.set(element, nodes);
  }
  if (nodes?.length) {
    nodes.forEach((node, index) => {
      const nextValue = index === 0 ? value : "";
      if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
    });
  } else {
    element.setAttribute("aria-label", value);
    element.setAttribute("title", value);
    element.setAttribute("data-ibc-visible-label", value);
  }
}

function restoreText(element: HTMLElement, record: IbcRecord, textNodeRef: WeakMap<HTMLElement, Text[]>) {
  element.removeAttribute("data-ibc-visible-label");
  if (record.textKind === "placeholder") {
    if (record.originalPlaceholder === null) element.removeAttribute("placeholder");
    else element.setAttribute("placeholder", record.originalPlaceholder);
  } else if (record.textKind === "aria-label") {
    if (record.originalAriaLabel === null) element.removeAttribute("aria-label");
    else element.setAttribute("aria-label", record.originalAriaLabel);
  } else if (record.textKind === "title") {
    if (record.originalTitle === null) element.removeAttribute("title");
    else element.setAttribute("title", record.originalTitle);
  } else {
    let nodes = textNodeRef.get(element);
    if (!nodes?.length || nodes.some((node) => !element.contains(node))) {
      nodes = textNodes(element);
      if (nodes.length) textNodeRef.set(element, nodes);
    }
    if (nodes?.length) {
      nodes.forEach((node, index) => {
        const original = record.originalTextSegments[index] ?? "";
        if (node.nodeValue !== original) node.nodeValue = original;
      });
    }
    if (record.textKind === "accessible" || !nodes?.length) {
      if (record.originalAriaLabel === null) element.removeAttribute("aria-label");
      else element.setAttribute("aria-label", record.originalAriaLabel);
      if (record.originalTitle === null) element.removeAttribute("title");
      else element.setAttribute("title", record.originalTitle);
    }
  }
}

function applyRecord(element: HTMLElement, record: IbcRecord, textNodeRef: WeakMap<HTMLElement, Text[]>) {
  const config = record.config;
  if (config.text !== undefined) applyText(element, config.text, record, textNodeRef);
  if (config.icon) {
    element.setAttribute("data-ibc-icon", config.icon);
    element.style.setProperty("--ibc-icon-image", iconImageUrl(config.icon));
  } else {
    element.removeAttribute("data-ibc-icon");
    element.style.removeProperty("--ibc-icon-image");
  }
  for (const [key, variable, attribute] of STYLE_VARIABLES) {
    const value = config[key];
    const unit = key === "fontSize" || key === "borderRadius" || key === "iconSize" ? "px" : "";
    setCssVariable(element, variable, typeof value === "string" || typeof value === "number" ? value : undefined, unit);
    setStyleFlag(element, attribute, value === undefined ? undefined : String(value));
  }
  if (config.showIcon === false) element.setAttribute("data-ibc-show-icon", "false");
  else element.removeAttribute("data-ibc-show-icon");
  if (config.showText === false) element.setAttribute("data-ibc-show-text", "false");
  else element.removeAttribute("data-ibc-show-text");
  if (config.disabled) {
    element.setAttribute("data-ibc-disabled", "true");
    element.setAttribute("aria-disabled", "true");
  } else {
    element.removeAttribute("data-ibc-disabled");
    if (record.originalAriaDisabled === null) element.removeAttribute("aria-disabled");
    else element.setAttribute("aria-disabled", record.originalAriaDisabled);
  }
}

function clearIbc(element: HTMLElement, record: IbcRecord, textNodeRef: WeakMap<HTMLElement, Text[]>) {
  restoreText(element, record, textNodeRef);
  for (const attribute of managedAttributes) element.removeAttribute(attribute);
  for (const [, variable] of STYLE_VARIABLES) element.style.removeProperty(variable);
  element.style.removeProperty("--ibc-icon-image");
  if (record.originalAriaDisabled === null) element.removeAttribute("aria-disabled");
  else element.setAttribute("aria-disabled", record.originalAriaDisabled);
}

function normalizeColor(value: string, fallback: string) {
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join("") : hex[1];
    return `#${digits.toLowerCase()}`;
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (!rgb) return fallback;
  const parts = rgb[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || (parts[3] !== undefined && parts[3] <= 0)) return fallback;
  return `#${parts.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
}

function computedNumber(element: Element | null, property: string, fallback: number, min: number, max: number) {
  if (!element) return fallback;
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
}

function makePosition(clientX: number, clientY: number): Position {
  const margin = 12;
  const width = Math.min(PANEL_WIDTH, window.innerWidth - margin * 2);
  const height = Math.min(PANEL_HEIGHT, window.innerHeight - margin * 2);
  let x = clientX + 14;
  let y = clientY + 14;
  if (x + width > window.innerWidth - margin) x = clientX - width - 14;
  if (y + height > window.innerHeight - margin) y = clientY - height - 14;
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
  };
}

function ToggleRow({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: () => void; detail: string }) {
  return (
    <button type="button" className="ibc-switch-row" role="switch" aria-checked={checked} onClick={onChange}>
      <span className="ibc-switch-copy"><strong>{label}</strong><small>{detail}</small></span>
      <span className={`ibc-switch ${checked ? "is-on" : ""}`}><span /></span>
    </button>
  );
}

export function IbcCustomizer({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, IbcRecord>>(() => readMap<Record<string, IbcRecord>>(CONFIG_KEY, {}));
  const recordsRef = useRef(records);
  const [savedDefaults, setSavedDefaults] = useState<IbcConfig | null>(() => readMap<IbcConfig | null>(DEFAULT_KEY, null));
  const [activeTarget, setActiveTarget] = useState<IbcTarget | null>(null);
  const activeTargetRef = useRef<IbcTarget | null>(null);
  const [tab, setTab] = useState<IbcTab>("styles");
  const [iconSetOpen, setIconSetOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 });
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(null);
  const textNodeRef = useRef(new WeakMap<HTMLElement, Text[]>());
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => { recordsRef.current = records; }, [records]);

  const updateRecords = useCallback((next: Record<string, IbcRecord>) => {
    recordsRef.current = next;
    setRecords(next);
    persist(CONFIG_KEY, next);
  }, []);

  const closeEditor = useCallback(() => {
    highlightedElementRef.current?.removeAttribute("data-ibc-active-target");
    highlightedElementRef.current = null;
    activeTargetRef.current = null;
    setActiveTarget(null);
    setNotice("");
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    const onContextMenu = (event: MouseEvent) => {
      const target = chooseTarget(event.target);
      if (!target) return;
      event.preventDefault();
      const fresh = makeRecord(target, root);
      const stored = recordsRef.current[fresh.key];
      const selected: IbcTarget = stored
        ? { ...stored, key: fresh.key, element: target }
        : fresh;

      highlightedElementRef.current?.removeAttribute("data-ibc-active-target");
      selected.element.setAttribute("data-ibc-active-target", "true");
      highlightedElementRef.current = selected.element;
      activeTargetRef.current = selected;
      setActiveTarget(selected);
      setTab("styles");
      setIconSetOpen(false);
      setPosition(makePosition(event.clientX, event.clientY));
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("[data-ibc-ui]")) return;
      const disabled = target.closest("[data-ibc-disabled='true']");
      if (!disabled) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  useEffect(() => {
    if (!document.getElementById("root")) return;
    const applyAll = () => {
      for (const record of Object.values(recordsRef.current)) {
        let element: Element | null = null;
        try { element = document.querySelector(record.selector); } catch { /* stale selector */ }
        if (element instanceof HTMLElement) applyRecord(element, record, textNodeRef.current);
      }
    };
    applyAll();
    const observer = new MutationObserver(() => applyAll());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeTarget && !dialog.open) {
      try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    } else if (!activeTarget && dialog.open) {
      dialog.close();
    }
  }, [activeTarget]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const margin = 10;
      const width = Math.min(PANEL_WIDTH, window.innerWidth - margin * 2);
      const height = Math.min(PANEL_HEIGHT, window.innerHeight - margin * 2);
      setPosition({
        x: Math.max(margin, Math.min(drag.originX + event.clientX - drag.pointerX, window.innerWidth - width - margin)),
        y: Math.max(margin, Math.min(drag.originY + event.clientY - drag.pointerY, window.innerHeight - height - margin)),
      });
    };
    const onPointerUp = () => { dragRef.current = null; };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const activeRecord = activeTarget ? records[activeTarget.key] : undefined;
  const config = activeRecord?.config ?? {};
  const activeElement = activeTarget?.element ?? null;
  const activeIcon = activeElement?.querySelector("svg") ?? null;
  const textValue = config.text ?? activeTarget?.originalText ?? "";
  const textColor = config.textColor ?? normalizeColor(activeElement ? getComputedStyle(activeElement).color : "", "#63f4bc");
  const backgroundColor = config.backgroundColor ?? normalizeColor(activeElement ? getComputedStyle(activeElement).backgroundColor : "", "#101827");
  const borderColor = config.borderColor ?? normalizeColor(activeElement ? getComputedStyle(activeElement).borderTopColor : "", "#34445c");
  const fontSize = config.fontSize ?? computedNumber(activeElement, "font-size", 14, 8, 36);
  const fontWeight = config.fontWeight ?? computedNumber(activeElement, "font-weight", 500, 300, 900);
  const borderRadius = config.borderRadius ?? computedNumber(activeElement, "border-top-left-radius", 8, 0, 32);
  const iconSize = config.iconSize ?? computedNumber(activeIcon, "width", 20, 10, 48);
  const iconColor = config.iconColor ?? normalizeColor(activeIcon ? getComputedStyle(activeIcon).color : "", "#35e6bb");
  const hasIcon = Boolean(activeElement?.querySelector("svg, [data-icon]"));

  const patchConfig = (patch: Partial<IbcConfig>) => {
    const target = activeTargetRef.current;
    if (!target) return;
    const existing = recordsRef.current[target.key] ?? recordFromTarget(target);
    const nextConfig: IbcConfig = { ...existing.config };
    for (const [key, value] of Object.entries(patch) as Array<[keyof IbcConfig, IbcConfig[keyof IbcConfig]]>) {
      if (value === undefined) delete nextConfig[key];
      else (nextConfig as Record<string, unknown>)[key] = value;
    }
    const nextRecord: IbcRecord = { ...existing, config: nextConfig };
    if (Object.prototype.hasOwnProperty.call(patch, "text") && patch.text === undefined) {
      restoreText(target.element, nextRecord, textNodeRef.current);
    }
    applyRecord(target.element, nextRecord, textNodeRef.current);
    updateRecords({ ...recordsRef.current, [target.key]: nextRecord });
  };

  const saveDefault = () => {
    const styleDefaults = { ...config };
    delete styleDefaults.text;
    delete styleDefaults.icon;
    delete styleDefaults.disabled;
    setSavedDefaults(styleDefaults);
    persist(DEFAULT_KEY, styleDefaults);
    setNotice("Current styling saved as default.");
  };

  const restoreDefault = () => {
    if (!savedDefaults) {
      setNotice("Save a default style first.");
      return;
    }
    patchConfig({
      textColor: undefined,
      backgroundColor: undefined,
      borderColor: undefined,
      fontSize: undefined,
      fontWeight: undefined,
      borderRadius: undefined,
      showIcon: undefined,
      showText: undefined,
      iconSize: undefined,
      iconColor: undefined,
      ...savedDefaults,
    });
    setNotice("Saved default restored.");
  };

  const resetCurrent = () => {
    const target = activeTargetRef.current;
    if (!target) return;
    const record = recordsRef.current[target.key];
    if (record) {
      clearIbc(target.element, record, textNodeRef.current);
      const next = { ...recordsRef.current };
      delete next[target.key];
      updateRecords(next);
    }
    setNotice("Element restored to its original state.");
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, select")) return;
    event.preventDefault();
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  return (
    <>
      {children}
      <dialog ref={dialogRef} className="ibc-dialog" data-ibc-ui onCancel={(event) => { event.preventDefault(); closeEditor(); }}>
        {activeTarget && (
          <section
            className="ibc-window"
            data-ibc-ui
            aria-label="IBC system customiser"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
          >
            <div className="ibc-header" onPointerDown={beginDrag}>
              <span className="ibc-grip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
              <div className="ibc-heading">
                <h2>SYSTEM CUSTOMISER</h2>
                <span>IBC</span>
              </div>
              <div className="ibc-drag-note">DRAG TO MOVE</div>
              <button type="button" className="ibc-close" aria-label="Close IBC editor" title="Close editor" onClick={closeEditor}>
                <Icon name="x" size={21} />
              </button>
            </div>

            <div className="ibc-selected">
              <span className="ibc-selected-icon"><Icon name="palette" size={24} /></span>
              <label className="ibc-selected-label">
                <span>LABEL EDIT · {activeTarget.element.tagName.toLowerCase()}</span>
                <input
                  aria-label="Selected element text or label"
                  value={textValue}
                  onChange={(event) => patchConfig({ text: event.target.value })}
                  placeholder="No text label on this element"
                />
              </label>
              <button
                type="button"
                className="ibc-reset-text"
                title="Restore original text"
                aria-label="Restore original text"
                onClick={() => patchConfig({ text: undefined })}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            <div className="ibc-tabs" role="tablist" aria-label="IBC editing tools">
              {([
                ["styles", "Styles", "palette"],
                ["icons", "Icons", "spark"],
                ["toggles", "Toggles", "sliders"],
              ] as Array<[IbcTab, string, string]>).map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`ibc-tab ${tab === key ? "is-selected" : ""}`}
                  onClick={() => setTab(key)}
                >
                  <Icon name={icon} size={21} />
                  {label}
                </button>
              ))}
            </div>

            <div className="ibc-content" role="tabpanel">
              {tab === "styles" && (
                <div className="ibc-style-grid">
                  <div className="ibc-card">
                    <div className="ibc-card-title"><span>Appearance</span><small>LIVE EDIT</small></div>
                    <ColorControl label="Text colour" value={textColor} onChange={(textColor) => patchConfig({ textColor })} />
                    <ColorControl label="Background" value={backgroundColor} onChange={(backgroundColor) => patchConfig({ backgroundColor })} />
                    <ColorControl label="Border" value={borderColor} onChange={(borderColor) => patchConfig({ borderColor })} />
                  </div>
                  <div className="ibc-card">
                    <div className="ibc-card-title"><span>Type &amp; shape</span><small>{activeTarget.element.tagName}</small></div>
                    <RangeControl label="Text size" value={fontSize} min={8} max={36} unit="px" onChange={(fontSize) => patchConfig({ fontSize })} />
                    <RangeControl label="Weight" value={fontWeight} min={300} max={900} step={100} onChange={(fontWeight) => patchConfig({ fontWeight })} />
                    <RangeControl label="Corner radius" value={borderRadius} min={0} max={32} unit="px" onChange={(borderRadius) => patchConfig({ borderRadius })} />
                  </div>
                </div>
              )}

              {tab === "icons" && (
                <div className="ibc-feature-grid">
                  <div className="ibc-icon-dock" aria-label="Icon set">
                    <button
                      type="button"
                      className="ibc-dock-head"
                      aria-expanded={iconSetOpen}
                      onClick={() => setIconSetOpen((open) => !open)}
                    >
                      <span>ICON SET</span>
                      <small>{iconSetOpen ? "CLICK TO APPLY" : "FOLDED"}</small>
                      <Icon name={iconSetOpen ? "up" : "down"} size={12} />
                    </button>
                    {iconSetOpen && (
                      <div className="ibc-dock-grid">
                        <button
                          type="button"
                          className={`ibc-dock-button ibc-dock-clear ${config.icon ? "" : "is-active"}`}
                          aria-label="Remove applied icon"
                          title="Remove icon"
                          onClick={() => patchConfig({ icon: undefined })}
                        >
                          <Icon name="minus" size={15} />
                        </button>
                        {ICON_SET.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className={`ibc-dock-button ${config.icon === name ? "is-active" : ""}`}
                            aria-label={`Apply ${name} icon`}
                            title={`Apply ${name} icon`}
                            onClick={() => patchConfig({ icon: name })}
                          >
                            <Icon name={name} size={15} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ibc-card ibc-icon-preview-card">
                    <div className="ibc-card-title"><span>Selected icon</span><small>{config.icon ? config.icon.toUpperCase() : hasIcon ? "SVG FOUND" : "NO ICON"}</small></div>
                    <div className="ibc-icon-preview">
                      {config.icon || hasIcon ? (
                        <span className="ibc-preview-icon" style={{ color: iconColor }}>
                          <Icon name={config.icon ?? "spark"} size={iconSize} />
                        </span>
                      ) : (
                        <span className="ibc-no-icon">Pick an icon from the set below</span>
                      )}
                      <span>{activeTarget.label}</span>
                    </div>
                    <ToggleRow label="Show icon" detail={config.icon || hasIcon ? "Display the element's icon" : "Applies once an icon is chosen"} checked={config.showIcon !== false} onChange={() => patchConfig({ showIcon: config.showIcon === false ? true : false })} />
                    {config.icon && (
                      <button type="button" className="ibc-remove-icon" onClick={() => patchConfig({ icon: undefined })}>
                        <Icon name="minus" size={13} /><span>Remove applied icon</span>
                      </button>
                    )}
                  </div>
                  <div className="ibc-card">
                    <div className="ibc-card-title"><span>Icon styling</span><small>SVG / VECTOR</small></div>
                    <RangeControl label="Icon size" value={iconSize} min={10} max={48} unit="px" onChange={(iconSize) => patchConfig({ iconSize })} />
                    <ColorControl label="Icon colour" value={iconColor} onChange={(iconColor) => patchConfig({ iconColor })} />
                  </div>
                </div>
              )}

              {tab === "toggles" && (
                <div className="ibc-toggle-layout">
                  <div className="ibc-card">
                    <div className="ibc-card-title"><span>Content visibility</span><small>CLICK A MODE</small></div>
                    <div className="ibc-mode-grid">
                      <ModeButton label="Icon" icon="eye" badge={config.showIcon === false ? "OFF" : "ON"} active={config.showIcon !== false && config.showText === false} onClick={() => patchConfig({ showIcon: true, showText: false })} />
                      <ModeButton label="Text" icon="text" badge={config.showText === false ? "OFF" : "SHOWN"} active={config.showText !== false && config.showIcon === false} onClick={() => patchConfig({ showIcon: false, showText: true })} />
                      <ModeButton label="Icon + Text" icon="layers" badge={config.showIcon === false || config.showText === false ? "OFF" : "ON"} active={config.showIcon !== false && config.showText !== false} onClick={() => patchConfig({ showIcon: true, showText: true })} />
                    </div>
                  </div>
                  <div className="ibc-card">
                    <div className="ibc-card-title"><span>Interaction state</span><small>BUTTON / CONTROL</small></div>
                    <ToggleRow label="Enabled" detail="Turn off clicks for this element" checked={config.disabled !== true} onChange={() => patchConfig({ disabled: config.disabled !== true })} />
                    <div className="ibc-hint">Close IBC, then right-click another element to edit it.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="ibc-footer">
              <div className="ibc-swatches" aria-label="Quick colour presets">
                {PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    className="ibc-swatch"
                    aria-label={`${palette.name} colour preset`}
                    title={`${palette.name} preset`}
                    style={{ "--swatch-color": palette.color, "--swatch-bg": palette.background, "--swatch-border": palette.border } as CSSProperties}
                    onClick={() => patchConfig({ textColor: palette.color, backgroundColor: palette.background, borderColor: palette.border })}
                  ><span /></button>
                ))}
              </div>
              <div className="ibc-actions">
                <button type="button" className="ibc-action-save" onClick={saveDefault}><Icon name="save" size={17} /><span>Save Def</span></button>
                <button type="button" className="ibc-action-restore" onClick={restoreDefault}><Icon name="undo" size={17} /><span>Restore</span></button>
                <button type="button" className="ibc-action-reset" onClick={resetCurrent}><Icon name="refresh" size={17} /><span>Reset</span></button>
              </div>
            </div>
            <div className="ibc-status" aria-live="polite">{notice || `EDITING ${activeTarget.label.toUpperCase()}`}</div>
          </section>
        )}
      </dialog>
    </>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="ibc-color-control">
      <span>{label}</span>
      <input type="color" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      <code>{value.toUpperCase()}</code>
    </label>
  );
}

function RangeControl({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <label className="ibc-range-control">
      <span>{label}<strong>{value}{unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ModeButton({ label, icon, badge, active, onClick }: { label: string; icon: string; badge: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ibc-mode-button ${active ? "is-active" : ""}`} aria-pressed={active} onClick={onClick}>
      <Icon name={icon} size={19} />
      <span>{label}</span>
      <small>{badge}</small>
    </button>
  );
}
