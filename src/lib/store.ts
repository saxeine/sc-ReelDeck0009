import {
  DEFAULT_SHEET,
  type Doc,
  type Frame,
  type FrameStatus,
  type SheetSettings,
} from "../types";
import { uid } from "./imaging";

export type Action =
  | { type: "ADD_FRAMES"; frames: Frame[]; index?: number }
  | { type: "UPDATE_FRAME"; id: string; patch: Partial<Frame>; merge?: string }
  | { type: "DELETE_FRAMES"; ids: string[] }
  | { type: "DUPLICATE"; ids: string[] }
  | { type: "MOVE"; id: string; toIndex: number }
  | { type: "BAKE_ORDER"; orderedIds: string[] }
  | { type: "SET_STATUS"; ids: string[]; status: FrameStatus }
  | { type: "ADD_COMMENT"; id: string; text: string; author: string }
  | { type: "DELETE_COMMENT"; id: string; commentId: string }
  | { type: "SET_SHEET"; patch: Partial<SheetSettings>; merge?: string }
  | { type: "SET_META"; patch: { title?: string; logline?: string }; merge?: string }
  | { type: "REPLACE"; doc: Doc }
  | { type: "UNDO" }
  | { type: "REDO" };

export interface History {
  past: Doc[];
  present: Doc;
  future: Doc[];
  mergeKey?: string;
  mergeAt?: number;
}

const LIMIT = 80;

function apply(doc: Doc, a: Action): Doc {
  switch (a.type) {
    case "ADD_FRAMES": {
      const frames = [...doc.frames];
      const at = a.index == null ? frames.length : Math.max(0, Math.min(frames.length, a.index));
      frames.splice(at, 0, ...a.frames);
      return { ...doc, frames };
    }
    case "UPDATE_FRAME":
      return {
        ...doc,
        frames: doc.frames.map((f) => {
          if (f.id !== a.id) return f;
          // An image replaced by another tool no longer represents this editable
          // studio project. Studio saves explicitly supply a fresh project.
          const imageChanged = a.patch.src !== undefined && a.patch.src !== f.src;
          const clearProject = imageChanged && !("studioProject" in a.patch);
          return { ...f, ...(clearProject ? { studioProject: undefined } : {}), ...a.patch };
        }),
      };
    case "DELETE_FRAMES":
      return { ...doc, frames: doc.frames.filter((f) => !a.ids.includes(f.id)) };
    case "DUPLICATE": {
      const out: Frame[] = [];
      for (const f of doc.frames) {
        out.push(f);
        if (a.ids.includes(f.id)) {
          out.push({
            ...f,
            id: uid(),
            name: `${f.name} (copy)`,
            status: "draft",
            comments: [],
            createdAt: Date.now(),
          });
        }
      }
      return { ...doc, frames: out };
    }
    case "MOVE": {
      const from = doc.frames.findIndex((f) => f.id === a.id);
      if (from < 0) return doc;
      const frames = [...doc.frames];
      const [item] = frames.splice(from, 1);
      const to = Math.max(0, Math.min(frames.length, a.toIndex));
      frames.splice(to, 0, item);
      return { ...doc, frames };
    }
    case "BAKE_ORDER": {
      const map = new Map(doc.frames.map((f) => [f.id, f]));
      const head = a.orderedIds.map((id) => map.get(id)!).filter(Boolean);
      const tail = doc.frames.filter((f) => !a.orderedIds.includes(f.id));
      return { ...doc, frames: [...head, ...tail] };
    }
    case "SET_STATUS":
      return {
        ...doc,
        frames: doc.frames.map((f) =>
          a.ids.includes(f.id) ? { ...f, status: a.status } : f
        ),
      };
    case "ADD_COMMENT":
      return {
        ...doc,
        frames: doc.frames.map((f) =>
          f.id === a.id
            ? {
                ...f,
                comments: [
                  ...f.comments,
                  { id: uid("c"), text: a.text, author: a.author, at: Date.now() },
                ],
              }
            : f
        ),
      };
    case "DELETE_COMMENT":
      return {
        ...doc,
        frames: doc.frames.map((f) =>
          f.id === a.id
            ? { ...f, comments: f.comments.filter((c) => c.id !== a.commentId) }
            : f
        ),
      };
    case "SET_SHEET":
      return { ...doc, sheet: { ...doc.sheet, ...a.patch } };
    case "SET_META":
      return { ...doc, ...a.patch };
    case "REPLACE":
      return a.doc;
    default:
      return doc;
  }
}

export function reducer(state: History, action: Action): History {
  if (action.type === "UNDO") {
    if (!state.past.length) return state;
    const prev = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: prev,
      future: [state.present, ...state.future].slice(0, LIMIT),
    };
  }
  if (action.type === "REDO") {
    if (!state.future.length) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present].slice(-LIMIT),
      present: next,
      future: state.future.slice(1),
    };
  }

  const next = apply(state.present, action);
  if (next === state.present) return state;

  const mergeKey = "merge" in action ? action.merge : undefined;
  const now = Date.now();
  const canMerge =
    !!mergeKey &&
    state.mergeKey === mergeKey &&
    now - (state.mergeAt ?? 0) < 700 &&
    state.past.length > 0;

  if (canMerge) {
    return { ...state, present: next, future: [], mergeAt: now };
  }
  return {
    past: [...state.past, state.present].slice(-LIMIT),
    present: next,
    future: [],
    mergeKey,
    mergeAt: now,
  };
}

export function initHistory(doc: Doc, sheet?: Partial<SheetSettings>): History {
  return {
    past: [],
    present: { ...doc, sheet: { ...DEFAULT_SHEET, ...doc.sheet, ...sheet } },
    future: [],
  };
}
