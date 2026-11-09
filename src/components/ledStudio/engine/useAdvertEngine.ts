import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdvertAsset,
  AdvertLayerSettings,
  AdvertMeta,
  AdvertPanel,
  ControllerMode,
  GroupMode,
  LayerBlend,
  LayerMode,
  PaintTool,
  PanelStyle,
  SeqBehavior,
  SeqMode,
  SeqPattern,
  SortMode,
  TileLinkConfig,
  ToastKind,
} from '../types';
import { buildPattern } from '../utils/patterns';
import { computeSpreadSlices } from '../utils/spread';
import { analyzeImage, buildGroups, sortAssets } from '../utils/sorter';
import { MASTER_ARTWORK, PRESET_ASSETS } from '../data/advertAssets';
import {
  buildAdvertPanels,
  createAdvertPanel,
  displayFrame,
  posterPanels,
} from './advertPanels';
import { useChoreography } from './useChoreography';

export interface AdvertEngineOptions {
  cols: number;
  panelCount: number;
  notify: (text: string, kind?: ToastKind) => void;
  initialAssets?: AdvertAsset[];
}

const DEFAULT_LAYER: AdvertLayerSettings = {
  opacity: 1,
  blend: 'normal',
  mode: 'tiles',
  radius: 10,
  inset: 3,
  showRoute: true,
  seqColor: '#ff8a1f',
  seqFlash: true,
  dimMain: true,
};

export const DEFAULT_PATH = buildPattern('spiral', 4);

/**
 * The advert engine. It owns the second set of artwork (the pool), the
 * per-panel advert state and the draw-to-sequence transport that runs the
 * layer on command over the LED wall.
 */
/** how many times a single panel may appear in the drawn order */
export const MAX_PASSES_PER_PANEL = 3;

export function useAdvertEngine({ cols, panelCount, notify, initialAssets }: AdvertEngineOptions) {
  /* ------------------------------- artwork ------------------------------ */
  const [pool, setPool] = useState<AdvertAsset[]>(() => {
    const seen = new Set<string>();
    return [...(initialAssets ?? []), ...PRESET_ASSETS].filter((asset) => {
      if (!asset.url || seen.has(asset.url)) return false;
      seen.add(asset.url); return true;
    });
  });
  const [metas, setMetas] = useState<Record<string, AdvertMeta>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [autoSort, setAutoSort] = useState(false);

  /* ----------------------- controller / show desk ----------------------- */
  const [controllerMode, setControllerModeState] = useState<ControllerMode>('show');
  const choreography = useChoreography({ pool, cols, notify });

  /* ------------------------------- the layer ---------------------------- */
  const [panels, setPanels] = useState<Record<number, AdvertPanel>>(() =>
    buildAdvertPanels(panelCount, PRESET_ASSETS)
  );
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [layer, setLayerState] = useState<AdvertLayerSettings>(DEFAULT_LAYER);
  const [masterArtwork, setMasterArtwork] = useState(MASTER_ARTWORK);
  const [locked, setLocked] = useState(false);

  /* ------------------------------- transport ---------------------------- */
  const [sequence, setSequence] = useState<number[]>(DEFAULT_PATH);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [intervalMs, setIntervalMs] = useState(650);
  const [mode, setModeState] = useState<SeqMode>('loop');
  const [behavior, setBehaviorState] = useState<SeqBehavior>('flash');
  const [frames, setFrames] = useState<Record<number, number>>({});
  const [paintTool, setPaintTool] = useState<PaintTool>('paint');
  const [boardPaintArmed, setBoardPaintArmed] = useState(false);

  const cursorRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);

  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const behaviorRef = useRef(behavior);
  behaviorRef.current = behavior;

  const path = useMemo(
    () => sequence.filter((s) => s >= 1 && s <= panelCount),
    [sequence, panelCount]
  );
  const pathRef = useRef(path);
  pathRef.current = path;

  const stepIndexOf = useCallback((slot: number) => path.indexOf(slot), [path]);

  const leaderSlot = useMemo(() => {
    if (!active || path.length === 0) return null;
    return path[Math.min(cursor, path.length - 1)] ?? null;
  }, [active, path, cursor]);

  /** slots of the advert layer that are currently covering the wall */
  const revealed = useMemo<number[]>(() => {
    if (!active || path.length === 0) return [];
    /* flash — the advert shows on one panel, hides, then the next one takes it */
    if (behavior === 'flash') return leaderSlot ? [leaderSlot] : [];
    /* reveal — the layer accumulates panel by panel */
    if (behavior === 'reveal') {
      const n = Math.max(1, Math.min(revealCount, path.length));
      return path.slice(0, n);
    }
    /* step / spin / pulse — the whole drawn set is up, timing drives frames */
    return path;
  }, [active, behavior, path, revealCount, leaderSlot]);

  const equipped = useMemo(
    () => path.filter((slot) => (panels[slot]?.rotation.length ?? 0) >= 2).length,
    [path, panels]
  );
  const unequipped = path.length - equipped;

  const statusLabel = useMemo(() => {
    if (!active) return { label: 'standby', tone: 'standby' as const };
    if (mode === 'once' && path.length > 0 && revealCount >= path.length)
      return { label: 'complete', tone: 'done' as const };
    if (playing) return { label: 'on air', tone: 'air' as const };
    return { label: 'held', tone: 'paused' as const };
  }, [active, playing, revealCount, path.length, mode]);

  /* ---------------------------- meta analysis --------------------------- */
  useEffect(() => {
    const missing = pool.filter((a) => !metas[a.url]);
    if (missing.length === 0) {
      setIsAnalyzing(false);
      return;
    }
    let cancelled = false;
    setIsAnalyzing(true);
    (async () => {
      for (const asset of missing) {
        const meta = await analyzeImage(asset.url);
        if (cancelled) return;
        setMetas((prev) => ({ ...prev, [asset.url]: meta }));
      }
      if (!cancelled) setIsAnalyzing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const groups = useMemo(() => buildGroups(pool, metas, groupMode), [pool, metas, groupMode]);

  /* ------------------------------ transport ----------------------------- */
  const bumpFrames = useCallback((slots: number[]) => {
    setFrames((prev) => {
      const next = { ...prev };
      for (const slot of slots) {
        const len = panelsRef.current[slot]?.rotation.length ?? 0;
        if (len < 2) continue;
        const base = prev[slot] ?? (slot - 1) % len;
        next[slot] = (base + 1) % len;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!active || !playing) return;
    if (path.length === 0) return;

    const tick = () => {
      const steps = pathRef.current;
      const len = steps.length;
      if (len === 0) return;

      const prev = cursorRef.current;
      let next = prev + dirRef.current;

      if (modeRef.current === 'loop') {
        next = ((next % len) + len) % len;
      } else if (modeRef.current === 'once') {
        if (next >= len) {
          next = len - 1;
          setPlaying(false);
          notify('Advert sequence complete — layer held on the wall', 'info');
        }
      } else {
        if (len === 1) next = 0;
        else if (next >= len || next < 0) {
          dirRef.current = (dirRef.current * -1) as 1 | -1;
          next = prev + dirRef.current;
        }
      }

      cursorRef.current = next;
      setCursor(next);

      setRevealCount((rc) => {
        if (modeRef.current === 'loop' && next === 0 && len > 1) return 1;
        if (modeRef.current === 'pingpong' && next === 0 && dirRef.current === 1) return 1;
        return Math.min(len, rc + 1);
      });

      const slot = steps[next];
      const turn = behaviorRef.current;
      if (slot !== undefined) {
        /* flash: each pass — including repeats over the same panel — brings the next frame */
        if (turn === 'flash') bumpFrames([slot]);
        if (turn === 'step') bumpFrames([slot]);
        if (turn === 'spin') bumpFrames(steps);
      }
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [active, playing, intervalMs, path.length, bumpFrames, notify]);

  /* ------------------------------ commands ------------------------------ */
  const run = useCallback(() => {
    if (path.length === 0) {
      notify('Draw a path first — the sequencer needs at least one panel', 'error');
      return;
    }
    setActive(true);
    setPlaying(true);
    cursorRef.current = 0;
    setCursor(0);
    setRevealCount(1);
    dirRef.current = 1;
    notify('Advert layer on air — second set sequenced over the wall', 'success');
  }, [path.length, notify]);

  const hold = useCallback(() => {
    if (!active) {
      notify('Advert layer is on standby — run it first', 'info');
      return;
    }
    const complete = mode === 'once' && path.length > 0 && revealCount >= path.length;
    if (!playing && complete) {
      run();
      return;
    }
    const next = !playing;
    setPlaying(next);
    notify(
      next ? 'Advert sequence resumed' : 'Advert sequence held on the wall',
      next ? 'success' : 'info'
    );
  }, [active, playing, mode, path.length, revealCount, run, notify]);

  const stop = useCallback(() => {
    setActive(false);
    setPlaying(false);
    setCursor(0);
    cursorRef.current = 0;
    setRevealCount(0);
    dirRef.current = 1;
    notify('Advert layer cleared — main LED content only', 'info');
  }, [notify]);

  const rewind = useCallback(() => {
    cursorRef.current = 0;
    setCursor(0);
    setRevealCount(active ? 1 : 0);
    dirRef.current = 1;
    setFrames({});
    notify('Sequence rewound to step 1', 'info');
  }, [active, notify]);

  /* ----------------------- controller mode router ----------------------- */
  const setControllerMode = useCallback(
    (next: ControllerMode) => {
      if (next === controllerMode) return;
      if (active) stop();
      if (choreography.active) choreography.stop();
      setBoardPaintArmed(false);
      setControllerModeState(next);
    },
    [controllerMode, active, stop, choreography.active, choreography.stop]
  );

  const effectiveActive = controllerMode === 'show' ? choreography.active : active;
  const effectivePlaying = controllerMode === 'show' ? choreography.playing : playing;
  const effectiveCanRun = controllerMode === 'show' ? choreography.canRun : path.length > 0;
  const effectiveStatusLabel = controllerMode === 'show' ? choreography.statusLabel : statusLabel;
  const choreographySlots = useMemo(
    () => Array.from(new Set(choreography.frame?.tiles.map((tile) => tile.slot) ?? [])),
    [choreography.frame]
  );
  const effectiveRevealed = controllerMode === 'show' && choreography.active ? choreographySlots : revealed;
  const effectiveRevealedSet = useMemo(() => new Set(effectiveRevealed), [effectiveRevealed]);
  const runController = controllerMode === 'show' ? choreography.run : run;
  const holdController = controllerMode === 'show' ? choreography.hold : hold;
  const stopController = controllerMode === 'show' ? choreography.stop : stop;
  const rewindController = controllerMode === 'show' ? choreography.rewind : rewind;
  const toggleController = effectiveActive ? stopController : runController;

  /* --------------------------- path editing ----------------------------- */
  const paintSlot = useCallback(
    (slot: number) => {
      if (locked) return;
      setSequence((prev) => {
        if (paintTool === 'erase') {
          /* erase the most recent pass at this panel */
          const at = prev.lastIndexOf(slot);
          return at === -1 ? prev : prev.filter((_, i) => i !== at);
        }
        /* dragging over the same panel glides on; re-entering it adds another pass */
        if (prev[prev.length - 1] === slot) return prev;
        const passes = prev.reduce((n, s) => (s === slot ? n + 1 : n), 0);
        if (passes >= MAX_PASSES_PER_PANEL) return prev;
        return [...prev, slot];
      });
    },
    [paintTool, locked]
  );

  /** Replace the whole drawn order (used by SeqCarver's shared sequencer state). */
  const setPath = useCallback((next: number[]) => {
    const clean = next.filter((slot) => Number.isFinite(slot) && slot >= 1 && slot <= panelCount);
    setSequence(clean);
    cursorRef.current = 0;
    setCursor(0);
    setRevealCount(0);
    dirRef.current = 1;
  }, [panelCount]);

  const removeStep = useCallback((index: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const popStep = useCallback(() => setSequence((prev) => prev.slice(0, -1)), []);

  const reversePath = useCallback(() => setSequence((prev) => [...prev].reverse()), []);

  const shufflePath = useCallback(
    () =>
      setSequence((prev) => {
        const arr = [...prev];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }),
    []
  );

  const clearPath = useCallback(() => {
    setSequence([]);
    setPlaying(false);
    notify('Rotation path cleared', 'info');
  }, [notify]);

  const applyPattern = useCallback(
    (pattern: SeqPattern) => {
      const next = buildPattern(pattern, cols);
      setSequence(next);
      cursorRef.current = 0;
      setCursor(0);
      notify(`Path preset loaded — ${next.length} steps in drawn order`, 'success');
    },
    [cols, notify]
  );

  /* --------------------------- panel editing ---------------------------- */
  const updatePanel = useCallback(
    (slot: number, patch: Partial<AdvertPanel>) => {
      setPanels((prev) => {
        const cur = prev[slot] ?? createAdvertPanel();
        return { ...prev, [slot]: { ...cur, ...patch } };
      });
    },
    []
  );

  const updateLink = useCallback(
    (slot: number, patch: Partial<TileLinkConfig>) => {
      setPanels((prev) => {
        const cur = prev[slot] ?? createAdvertPanel();
        return { ...prev, [slot]: { ...cur, link: { ...cur.link, ...patch } } };
      });
    },
    []
  );

  const updateStyle = useCallback(
    (slot: number, patch: Partial<PanelStyle>) => {
      setPanels((prev) => {
        const cur = prev[slot] ?? createAdvertPanel();
        return { ...prev, [slot]: { ...cur, style: { ...cur.style, ...patch } } };
      });
    },
    []
  );

  const applyStyleToAll = useCallback((patch: Partial<PanelStyle>) => {
    setPanels((prev) => {
      const next: Record<number, AdvertPanel> = {};
      for (const key of Object.keys(prev)) {
        const slot = Number(key);
        const cur = prev[slot];
        next[slot] = { ...cur, style: { ...cur.style, ...patch } };
      }
      return next;
    });
  }, []);

  /** Put one artwork on a panel: it becomes the panel's frame set of one. */
  const assignImage = useCallback(
    (slot: number, url: string) => {
      setPanels((prev) => {
        const cur = prev[slot] ?? createAdvertPanel();
        return {
          ...prev,
          [slot]: { ...cur, image: url, spread: null, rotation: url ? [url] : [] },
        };
      });
      if (url) notify(`Artwork loaded into panel ${String(slot).padStart(2, '0')}`, 'success');
    },
    [notify]
  );

  const assignRotation = useCallback((slot: number, rotation: string[]) => {
    setPanels((prev) => {
      const cur = prev[slot] ?? createAdvertPanel();
      return { ...prev, [slot]: { ...cur, rotation } };
    });
  }, []);

  const appendFrame = useCallback((slot: number, url: string) => {
    setPanels((prev) => {
      const cur = prev[slot] ?? createAdvertPanel();
      return { ...prev, [slot]: { ...cur, rotation: [...cur.rotation, url] } };
    });
  }, []);

  const applySpread = useCallback(
    (slots: number[], url: string, filter?: string, stretchX = 1, stretchY = 1) => {
      const slices = computeSpreadSlices(slots, cols, url, filter, stretchX, stretchY);
      setPanels((prev) => {
        const next = { ...prev };
        for (const slot of slots) {
          const cur = next[slot] ?? createAdvertPanel();
          next[slot] = {
            ...cur,
            image: '',
            spread: slices[slot] ?? null,
            rotation: [],
            rotating: false,
          };
        }
        return next;
      });
    },
    [cols]
  );

  const clearSpread = useCallback((slots: number[]) => {
    setPanels((prev) => {
      const next = { ...prev };
      for (const slot of slots) {
        const cur = next[slot] ?? createAdvertPanel();
        next[slot] = { ...cur, spread: null };
      }
      return next;
    });
  }, []);

  const resetPanel = useCallback((slot: number) => {
    setPanels((prev) => ({ ...prev, [slot]: createAdvertPanel() }));
  }, []);

  const resetAllPanels = useCallback(() => {
    setPanels(buildAdvertPanels(panelCount, pool));
    setMasterArtwork(MASTER_ARTWORK);
    notify('Advert layer reset to the shipped campaign', 'info');
  }, [panelCount, pool, notify]);

  /** Give every sequenced panel at least two frames, drawn from the pool. */
  const equipFrames = useCallback(() => {
    const urls = pool.map((a) => a.url);
    const needy = path.filter((slot) => (panels[slot]?.rotation.length ?? 0) < 2);
    if (needy.length === 0 || urls.length === 0) {
      notify(
        urls.length === 0
          ? 'Load advert artwork into the pool first'
          : 'Every sequenced panel already carries frames',
        'info'
      );
      return 0;
    }
    setPanels((prev) => {
      const next = { ...prev };
      path.forEach((slot, idx) => {
        const cur = next[slot] ?? createAdvertPanel();
        if (cur.rotation.length >= 2) return;
        const first = cur.image || cur.spread?.url || urls[idx % urls.length];
        const second = urls[(idx * 2 + 1) % urls.length];
        const third = urls[(idx * 3 + 2) % urls.length];
        const rotation = [first, second, third].filter((u, i, arr) => arr.indexOf(u) === i);
        next[slot] = { ...cur, rotation };
      });
      return next;
    });
    notify(`Equipped ${needy.length} panel${needy.length > 1 ? 's' : ''} with advert frames`, 'success');
    return needy.length;
  }, [path, pool, panels, notify]);

  /** Spread the master poster across the whole wall (the poster preset). */
  const applyPoster = useCallback(
    (slots: number[] = Array.from({ length: panelCount }, (_, i) => i + 1), url = masterArtwork) => {
      setPanels((prev) => posterPanels(prev, slots, cols, url, undefined, 1, 1));
      setMasterArtwork(url);
      notify(`Master poster carved across ${slots.length} panel${slots.length > 1 ? 's' : ''}`, 'success');
    },
    [cols, panelCount, masterArtwork, notify]
  );

  /** Hand each panel its own artwork from the current pool order. */
  const distributePool = useCallback(
    (slots: number[] = path.length ? path : Array.from({ length: panelCount }, (_, i) => i + 1)) => {
      if (pool.length === 0) {
        notify('Load advert artwork into the pool first', 'error');
        return;
      }
      setPanels((prev) => {
        const next = { ...prev };
        slots.forEach((slot, idx) => {
          const cur = next[slot] ?? createAdvertPanel();
          const start = idx % pool.length;
          const rotation = [0, 1, 2]
            .map((k) => pool[(start + k) % pool.length].url)
            .filter((u, i, arr) => arr.indexOf(u) === i);
          next[slot] = {
            ...cur,
            spread: null,
            rotation,
            image: pool[start].url,
            rotating: true,
          };
        });
        return next;
      });
      notify(`Distributed the advert set across ${slots.length} panel${slots.length > 1 ? 's' : ''}`);
    },
    [path, panelCount, pool, notify]
  );

  /* ------------------------------- the pool ----------------------------- */
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (list.length === 0) {
        notify('Only image files can join the advert pool', 'error');
        return;
      }
      // A submitted show outlives this modal. Blob URLs revoked on close would
      // leave the front page with broken frames, so keep durable data URLs.
      Promise.all(list.map((file, i) => new Promise<AdvertAsset>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ id: `upload-${Date.now()}-${i}`, name: file.name.replace(/\.[^.]+$/, ''),
          url: String(reader.result || ''), source: 'upload' });
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsDataURL(file);
      }))).then((added) => {
        setPool((prev) => [...prev, ...added]);
        notify(`Loaded ${added.length} advert image${added.length > 1 ? 's' : ''} into the pool`, 'success');
      }).catch((error: unknown) => notify(error instanceof Error ? error.message : 'Could not read advert images', 'error'));
    },
    [notify]
  );

  const addUrl = useCallback(
    (url: string, name?: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      setPool((prev) => [
        ...prev,
        {
          id: `url-${Date.now()}`,
          name: name?.trim() || `Custom ${prev.length + 1}`,
          url: trimmed,
          source: 'url',
        },
      ]);
      notify('Custom artwork added to the pool', 'success');
    },
    [notify]
  );

  const removeAsset = useCallback(
    (id: string) => {
      const asset = pool.find((a) => a.id === id);
      setPool((prev) => prev.filter((a) => a.id !== id));
      if (!asset) return;
      setPanels((prev) => {
        const next: Record<number, AdvertPanel> = {};
        for (const key of Object.keys(prev)) {
          const slot = Number(key);
          const cur = prev[slot];
          next[slot] = {
            ...cur,
            image: cur.image === asset.url ? '' : cur.image,
            rotation: cur.rotation.filter((u) => u !== asset.url),
            spread: cur.spread?.url === asset.url ? null : cur.spread,
          };
        }
        return next;
      });
      notify('Artwork removed from the pool', 'info');
    },
    [pool, notify]
  );

  const applySortedOrder = useCallback(() => {
    setPool((prev) => sortAssets(prev, metas, sortMode));
    setSortMode('none');
    notify('Pool order committed', 'success');
  }, [metas, sortMode, notify]);

  const resetPool = useCallback(() => {
    setPool(PRESET_ASSETS);
    setSortMode('none');
    setGroupMode('none');
    setGroupFilter(null);
    notify('Pool reset to the shipped advert set', 'info');
  }, [notify]);

  const handleGroupMode = useCallback((m: GroupMode) => {
    setGroupMode(m);
    setGroupFilter(null);
  }, []);

  /* ------------------------------ settings ------------------------------ */
  const setLayer = useCallback((patch: Partial<AdvertLayerSettings>) => {
    setLayerState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setBlend = useCallback((blend: LayerBlend) => setLayer({ blend }), [setLayer]);
  const setLayerMode = useCallback((next: LayerMode) => setLayer({ mode: next }), [setLayer]);

  const setMode = useCallback((next: SeqMode) => {
    setModeState(next);
    dirRef.current = 1;
  }, []);

  const setBehavior = useCallback((next: SeqBehavior) => {
    setBehaviorState(next);
    if (next === 'reveal') setRevealCount((rc) => Math.max(1, rc));
  }, []);

  /* ------------------------------- exposed ------------------------------ */
  return {
    notify,
    /* geometry */
    cols,
    panelCount,
    /* controller */
    controllerMode,
    setControllerMode,
    choreography,
    canRun: effectiveCanRun,
    /* artwork */
    pool,
    metas,
    groups,
    isAnalyzing,
    sortMode,
    setSortMode,
    groupMode,
    handleGroupMode,
    groupFilter,
    setGroupFilter,
    autoSort,
    setAutoSort,
    addFiles,
    addUrl,
    removeAsset,
    applySortedOrder,
    resetPool,
    /* layer content */
    panels,
    selectedSlot,
    setSelectedSlot,
    layer,
    setLayer,
    setBlend,
    setLayerMode,
    masterArtwork,
    setMasterArtwork,
    locked,
    setLocked,
    updatePanel,
    updateLink,
    updateStyle,
    applyStyleToAll,
    assignImage,
    assignRotation,
    appendFrame,
    applySpread,
    clearSpread,
    resetPanel,
    resetAllPanels,
    equipFrames,
    applyPoster,
    distributePool,
    displayFrame: (slot: number) => displayFrame(panels[slot], frames, slot),
    /* transport */
    sequence,
    path,
    active: effectiveActive,
    playing: effectivePlaying,
    cursor,
    revealCount,
    revealed: effectiveRevealed,
    revealedSet: effectiveRevealedSet,
    leaderSlot: controllerMode === 'route' ? leaderSlot : null,
    intervalMs,
    setIntervalMs,
    mode,
    setMode,
    behavior,
    setBehavior,
    frames,
    stepIndexOf,
    equipped,
    unequipped,
    statusLabel: effectiveStatusLabel,
    run: runController,
    hold: holdController,
    stop: stopController,
    rewind: rewindController,
    toggleActive: toggleController,
    paintTool,
    setPaintTool,
    boardPaintArmed,
    setBoardPaintArmed,
    paintSlot,
    setPath,
    removeStep,
    popStep,
    reversePath,
    shufflePath,
    clearPath,
    applyPattern,
  };
}

export type AdvertEngine = ReturnType<typeof useAdvertEngine>;
