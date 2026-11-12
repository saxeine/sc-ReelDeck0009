import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdvertAsset,
  ChoreoCue,
  ToastKind,
} from '../types';
import {
  buildChoreoFrame,
  buildShowPresets,
  createChoreoCue,
  cueDurationMs,
  normalizeCastSlots,
} from './choreography';
import { parseChoreographyShow } from './showFile';
import { useChoreoTemplates } from '../../../hooks/useChoreoTemplates';
import {
  createChoreoTemplate,
  removeChoreoTemplate,
  updateChoreoTemplate,
} from '../../../services/choreoTemplates';

interface ChoreographyOptions {
  pool: AdvertAsset[];
  cols: number;
  notify: (text: string, kind?: ToastKind) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Detached copies so template snapshots never alias the live show state. */
const cloneCues = (cues: ChoreoCue[]): ChoreoCue[] =>
  cues.map((cue) => ({ ...cue, assetUrls: [...cue.assetUrls], castSlots: [...cue.castSlots] }));

/** Comparable fingerprint of everything a template stores. */
const showSignature = (cues: ChoreoCue[], bpm: number, timeScale: number, loop: boolean) =>
  JSON.stringify({ cues, bpm, timeScale, loop });

/**
 * Beat-accurate show state machine. Rendering is derived from cue + monotonic
 * time, so preview, scrub and live playback all resolve to the same frame.
 */
export function useChoreography({ pool, cols, notify }: ChoreographyOptions) {
  const initialPreset = useMemo(() => buildShowPresets(pool)[0], []);
  const initialProgram = initialPreset?.cues ?? [];
  const [cues, setCues] = useState<ChoreoCue[]>(initialProgram);
  const [selectedCueId, setSelectedCueId] = useState(initialProgram[0]?.id ?? '');
  const [bpmState, setBpmState] = useState(initialPreset?.bpm ?? 120);
  const [timeScale, setTimeScaleState] = useState(initialPreset?.timeScale ?? 0.65);
  const [loop, setLoop] = useState(initialPreset?.loop ?? true);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const [cueIndex, setCueIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0.28);

  const cuesRef = useRef(cues);
  const bpmRef = useRef(bpmState);
  const timeScaleRef = useRef(timeScale);
  const loopRef = useRef(loop);
  const cueIndexRef = useRef(cueIndex);
  const elapsedRef = useRef(elapsedMs);
  const playingRef = useRef(playing);

  cuesRef.current = cues;
  bpmRef.current = bpmState;
  timeScaleRef.current = timeScale;
  loopRef.current = loop;
  cueIndexRef.current = cueIndex;
  elapsedRef.current = elapsedMs;
  playingRef.current = playing;

  const presets = useMemo(() => buildShowPresets(pool), [pool]);
  const templates = useChoreoTemplates();
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) ?? null;
  const templateDirty = activeTemplate
    ? showSignature(cues, bpmState, timeScale, loop) !==
      showSignature(activeTemplate.cues, activeTemplate.bpm, activeTemplate.timeScale, activeTemplate.loop)
    : false;
  const selectedCue = cues.find((cue) => cue.id === selectedCueId) ?? cues[0] ?? null;
  const currentCue = cues[cueIndex] ?? cues[0] ?? null;
  const canRun = cues.length > 0 && cues.some((cue) => cue.assetUrls.some(Boolean));

  const setBpm = useCallback((value: number) => setBpmState(clamp(Math.round(value), 20, 240)), []);
  const setTimeScale = useCallback((value: number) => setTimeScaleState(clamp(value, 0.1, 1.5)), []);

  const updateCue = useCallback((id: string, patch: Partial<ChoreoCue>) => {
    setCues((previous) =>
      previous.map((cue) => {
        if (cue.id !== id) return cue;
        const assetUrls = patch.assetUrls ?? cue.assetUrls;
        return {
          ...cue,
          ...patch,
          id: cue.id,
          assetUrls,
          castSlots: normalizeCastSlots(patch.castSlots ?? cue.castSlots, assetUrls.length),
        };
      })
    );
  }, []);

  const addCue = useCallback(() => {
    const next = createChoreoCue(
      pool.map((asset) => asset.url),
      { name: `Scene ${cuesRef.current.length + 1}` }
    );
    setCues((previous) => [...previous, next]);
    setSelectedCueId(next.id);
    setPreviewProgress(0.28);
    notify('Scene added to the show timeline', 'success');
  }, [pool, notify]);

  const duplicateCue = useCallback(
    (id: string) => {
      const source = cuesRef.current.find((cue) => cue.id === id);
      if (!source) return;
      const copy = createChoreoCue(source.assetUrls, {
        assetUrls: [...source.assetUrls],
        name: `${source.name} copy`,
        motion: source.motion,
        formation: source.formation,
        transition: source.transition,
        direction: source.direction,
        durationBeats: source.durationBeats,
        speed: source.speed,
        intensity: source.intensity,
        transitionMs: source.transitionMs,
        castSlots: source.castSlots,
        accent: source.accent,
      });
      const at = cuesRef.current.findIndex((cue) => cue.id === id);
      setCues((previous) => [...previous.slice(0, at + 1), copy, ...previous.slice(at + 1)]);
      setSelectedCueId(copy.id);
      notify('Scene duplicated', 'success');
    },
    [notify]
  );

  const removeCue = useCallback(
    (id: string) => {
      setCues((previous) => {
        const at = previous.findIndex((cue) => cue.id === id);
        const next = previous.filter((cue) => cue.id !== id);
        const nextSelected = next[Math.min(Math.max(0, at), Math.max(0, next.length - 1))];
        setSelectedCueId(nextSelected?.id ?? '');
        return next;
      });
      notify('Scene removed from the show', 'info');
    },
    [notify]
  );

  /** Move one cast member's start panel (drag on the wall or in the slot grid). */
  const moveCast = useCallback(
    (cueId: string, castIndex: number, slot: number) => {
      const cue = cuesRef.current.find((item) => item.id === cueId);
      if (!cue || castIndex < 0 || castIndex >= cue.castSlots.length) return;
      const target = clamp(Math.round(slot), 1, cols * cols);
      if (cue.castSlots[castIndex] === target) return;
      const castSlots = [...cue.castSlots];
      castSlots[castIndex] = target;
      updateCue(cueId, { castSlots });
    },
    [cols, updateCue]
  );

  /** Reorder the cast (changes the numbering and default formation spread). */
  const reorderCast = useCallback(
    (cueId: string, from: number, to: number) => {
      const cue = cuesRef.current.find((item) => item.id === cueId);
      if (!cue) return;
      const last = cue.assetUrls.length - 1;
      if (from === to || from < 0 || to < 0 || from > last || to > last) return;
      const assetUrls = [...cue.assetUrls];
      const castSlots = [...cue.castSlots];
      const [url] = assetUrls.splice(from, 1);
      const [slot] = castSlots.splice(from, 1);
      assetUrls.splice(to, 0, url);
      castSlots.splice(to, 0, slot);
      updateCue(cueId, { assetUrls, castSlots });
    },
    [updateCue]
  );

  const moveCue = useCallback((id: string, direction: -1 | 1) => {
    setCues((previous) => {
      const at = previous.findIndex((cue) => cue.id === id);
      const to = at + direction;
      if (at < 0 || to < 0 || to >= previous.length) return previous;
      const next = [...previous];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });
  }, []);

  const selectCue = useCallback((id: string) => {
    setSelectedCueId(id);
    setPreviewProgress(0.28);
  }, []);

  const jumpToCue = useCallback((index: number) => {
    const safe = clamp(index, 0, Math.max(0, cuesRef.current.length - 1));
    const cue = cuesRef.current[safe];
    cueIndexRef.current = safe;
    elapsedRef.current = 0;
    setCueIndex(safe);
    setElapsedMs(0);
    setComplete(false);
    if (cue) setSelectedCueId(cue.id);
  }, []);

  const scrubCue = useCallback(
    (progress: number) => {
      const safe = clamp(progress, 0, 1);
      setPreviewProgress(safe);
      if (!active || !selectedCue) return;
      const at = cuesRef.current.findIndex((cue) => cue.id === selectedCue.id);
      if (at < 0) return;
      const nextElapsed = cueDurationMs(selectedCue, bpmRef.current) * safe;
      cueIndexRef.current = at;
      elapsedRef.current = nextElapsed;
      setCueIndex(at);
      setElapsedMs(nextElapsed);
      setComplete(false);
    },
    [active, selectedCue]
  );

  const run = useCallback(() => {
    if (!canRun) {
      notify('Add a scene with at least one advert before running the show', 'error');
      return;
    }
    const startIndex = complete ? 0 : clamp(cueIndexRef.current, 0, cuesRef.current.length - 1);
    if (complete) {
      cueIndexRef.current = 0;
      elapsedRef.current = 0;
      setCueIndex(0);
      setElapsedMs(0);
    }
    setActive(true);
    setPlaying(true);
    playingRef.current = true;
    setComplete(false);
    const cue = cuesRef.current[startIndex];
    if (cue) setSelectedCueId(cue.id);
    notify('Choreography on air — show clock locked', 'success');
  }, [canRun, complete, notify]);

  const hold = useCallback(() => {
    if (!active) {
      notify('The choreography is on standby — run it first', 'info');
      return;
    }
    if (complete) {
      run();
      return;
    }
    const next = !playingRef.current;
    playingRef.current = next;
    setPlaying(next);
    notify(next ? 'Show clock resumed' : 'Show clock held', next ? 'success' : 'info');
  }, [active, complete, run, notify]);

  const stop = useCallback(() => {
    playingRef.current = false;
    cueIndexRef.current = 0;
    elapsedRef.current = 0;
    setActive(false);
    setPlaying(false);
    setComplete(false);
    setCueIndex(0);
    setElapsedMs(0);
    notify('Choreography cleared — main LED content only', 'info');
  }, [notify]);

  const rewind = useCallback(() => {
    const at = active ? 0 : Math.max(0, cuesRef.current.findIndex((cue) => cue.id === selectedCueId));
    cueIndexRef.current = at;
    elapsedRef.current = 0;
    setCueIndex(at);
    setElapsedMs(0);
    setComplete(false);
    const cue = cuesRef.current[at];
    if (cue) setSelectedCueId(cue.id);
    notify('Show rewound to the first beat', 'info');
  }, [active, selectedCueId, notify]);

  useEffect(() => {
    if (!active || !playing) return;
    let raf = 0;
    let last = performance.now();
    let lastPaint = last;

    const tick = (now: number) => {
      if (!playingRef.current) return;
      const delta = Math.min(100, Math.max(0, now - last));
      last = now;
      let index = cueIndexRef.current;
      let elapsed = elapsedRef.current + delta * timeScaleRef.current;
      const liveCues = cuesRef.current;

      if (liveCues.length === 0) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }

      index = clamp(index, 0, liveCues.length - 1);
      let duration = cueDurationMs(liveCues[index], bpmRef.current);
      while (elapsed >= duration && playingRef.current) {
        elapsed -= duration;
        if (index < liveCues.length - 1) {
          index += 1;
        } else if (loopRef.current) {
          index = 0;
        } else {
          elapsed = duration;
          playingRef.current = false;
          setPlaying(false);
          setComplete(true);
          notify('Choreography complete — final formation held', 'info');
          break;
        }
        duration = cueDurationMs(liveCues[index], bpmRef.current);
      }

      cueIndexRef.current = index;
      elapsedRef.current = elapsed;
      if (now - lastPaint >= 30 || !playingRef.current) {
        setCueIndex(index);
        setElapsedMs(elapsed);
        const cue = liveCues[index];
        if (cue) setSelectedCueId(cue.id);
        lastPaint = now;
      }

      if (playingRef.current) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, playing, notify]);

  /** Replace the show program and park the transport on the first scene. */
  const applyProgram = useCallback(
    (
      nextCues: ChoreoCue[],
      options?: { bpm?: number; timeScale?: number; loop?: boolean }
    ) => {
      playingRef.current = false;
      cueIndexRef.current = 0;
      elapsedRef.current = 0;
      setCues(cloneCues(nextCues));
      setSelectedCueId(nextCues[0]?.id ?? '');
      setCueIndex(0);
      setElapsedMs(0);
      setComplete(false);
      setActive(false);
      setPlaying(false);
      if (typeof options?.bpm === 'number') setBpm(options.bpm);
      if (typeof options?.timeScale === 'number') setTimeScale(options.timeScale);
      if (typeof options?.loop === 'boolean') setLoop(options.loop);
    },
    [setBpm, setTimeScale]
  );

  /** Load a program that was already submitted to the front page. */
  const loadShow = useCallback(
    (
      nextCues: ChoreoCue[],
      options?: { bpm?: number; timeScale?: number; loop?: boolean }
    ) => {
      setActiveTemplateId('');
      applyProgram(nextCues, options);
    },
    [applyProgram]
  );

  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((item) => item.id === id);
      if (!preset) return;
      setActiveTemplateId('');
      applyProgram(preset.cues, {
        bpm: preset.bpm ?? 120,
        timeScale: preset.timeScale ?? 0.65,
        loop: preset.loop ?? true,
      });
      notify(`${preset.name} loaded — ${preset.cues.length} scenes ready`, 'success');
    },
    [presets, notify, applyProgram]
  );

  /* ---------------------------- show templates --------------------------- */

  const snapshotShow = useCallback(
    () => ({
      cues: cloneCues(cuesRef.current),
      bpm: bpmRef.current,
      timeScale: timeScaleRef.current,
      loop: loopRef.current,
    }),
    []
  );

  /** Keep repeated copies from colliding in the My templates list. */
  const uniqueTemplateName = useCallback(
    (base: string) => {
      const taken = new Set(templates.map((template) => template.name.toLowerCase()));
      if (!taken.has(base.toLowerCase())) return base;
      let index = 2;
      while (taken.has(`${base} ${index}`.toLowerCase())) index += 1;
      return `${base} ${index}`;
    },
    [templates]
  );

  /** Save the whole current show — scenes, images, behaviours, clock — as a template. */
  const saveTemplate = useCallback(
    async (name: string, description = '') => {
      const trimmed = name.trim();
      if (!trimmed) {
        notify('Name the template first', 'error');
        return null;
      }
      const created = await createChoreoTemplate({
        name: uniqueTemplateName(trimmed),
        description,
        ...snapshotShow(),
      });
      setActiveTemplateId(created.id);
      notify(`Saved “${created.name}” — ${created.cues.length} scenes`, 'success');
      return created;
    },
    [uniqueTemplateName, snapshotShow, notify]
  );

  /** Replace a saved template's program with the current show. */
  const overwriteTemplate = useCallback(
    async (id: string) => {
      const updated = await updateChoreoTemplate(id, snapshotShow());
      if (!updated) {
        notify('That template no longer exists', 'error');
        return;
      }
      setActiveTemplateId(updated.id);
      notify(`“${updated.name}” saved with the current show`, 'success');
    },
    [snapshotShow, notify]
  );

  const renameTemplate = useCallback(
    async (id: string, name: string, description: string) => {
      const updated = await updateChoreoTemplate(id, { name, description });
      if (!updated) return;
      notify(`Template renamed to “${updated.name}”`, 'success');
    },
    [notify]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const target = templates.find((template) => template.id === id);
      await removeChoreoTemplate(id);
      if (activeTemplateId === id) setActiveTemplateId('');
      notify(target ? `“${target.name}” removed from My templates` : 'Template removed', 'info');
    },
    [templates, activeTemplateId, notify]
  );

  const loadTemplate = useCallback(
    (id: string) => {
      const template = templates.find((item) => item.id === id);
      if (!template) return;
      applyProgram(template.cues, {
        bpm: template.bpm,
        timeScale: template.timeScale,
        loop: template.loop,
      });
      setActiveTemplateId(template.id);
      notify(`“${template.name}” loaded — ${template.cues.length} scenes ready`, 'success');
    },
    [templates, applyProgram, notify]
  );

  /** Turn a built-in show into an editable template with the same scenes. */
  const editPresetAsTemplate = useCallback(
    async (presetId: string) => {
      const preset = presets.find((item) => item.id === presetId);
      if (!preset) return;
      const cues = cloneCues(preset.cues);
      applyProgram(cues, {
        bpm: preset.bpm ?? 120,
        timeScale: preset.timeScale ?? 0.65,
        loop: preset.loop ?? true,
      });
      const created = await createChoreoTemplate({
        name: uniqueTemplateName(`${preset.name} copy`),
        description: preset.description,
        cues,
        bpm: preset.bpm ?? 120,
        timeScale: preset.timeScale ?? 0.65,
        loop: preset.loop ?? true,
      });
      setActiveTemplateId(created.id);
      notify(
        `“${preset.name}” copied — swap images and behaviours, then Save changes`,
        'success'
      );
    },
    [presets, applyProgram, uniqueTemplateName, notify]
  );

  /** Start a fresh show instead of loading or copying a template. */
  const newShow = useCallback(
    (cast?: string[]) => {
      const urls = cast?.filter(Boolean).length
        ? cast.filter(Boolean)
        : pool.map((asset) => asset.url).filter(Boolean).slice(0, 4);
      const first = createChoreoCue(urls, { name: 'Scene 1' });
      applyProgram([first], { bpm: 120, timeScale: 0.65, loop: true });
      setPreviewProgress(0.28);
      setActiveTemplateId('');
      notify(
        urls.length
          ? 'New show started — tweak this scene or add more'
          : 'New show started — cast artwork in the first scene',
        'success'
      );
    },
    [pool, applyProgram, notify]
  );


  const exportShow = useCallback(() => {
    const payload = {
      schema: 'gridline.choreography/v2',
      title: 'Gridline perimeter show',
      exportedAt: new Date().toISOString(),
      bpm: bpmRef.current,
      timeScale: timeScaleRef.current,
      loop: loopRef.current,
      cues: cuesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gridline-perimeter-show.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify('Show file exported', 'success');
  }, [notify]);

  const importShow = useCallback(
    (raw: string) => {
      try {
        const parsed = parseChoreographyShow(raw);
        const next = parsed.cues;
        setActiveTemplateId('');
        applyProgram(next, { bpm: parsed.bpm, timeScale: parsed.timeScale, loop: parsed.loop });
        notify(`Imported ${next.length} choreography scene${next.length === 1 ? '' : 's'}`, 'success');
      } catch {
        notify('This is not a valid Gridline choreography file', 'error');
      }
    },
    [notify, applyProgram]
  );

  const frame = useMemo(
    () => (currentCue ? buildChoreoFrame(currentCue, elapsedMs, bpmState, cols) : null),
    [currentCue, elapsedMs, bpmState, cols]
  );
  const previewFrame = useMemo(() => {
    if (!selectedCue) return null;
    return buildChoreoFrame(
      selectedCue,
      cueDurationMs(selectedCue, bpmState) * previewProgress,
      bpmState,
      cols
    );
  }, [selectedCue, previewProgress, bpmState, cols]);

  const totalDurationMs = useMemo(
    () => cues.reduce((sum, cue) => sum + cueDurationMs(cue, bpmState), 0) / timeScale,
    [cues, bpmState, timeScale]
  );
  const playheadMs = useMemo(
    () =>
      (cues.slice(0, cueIndex).reduce((sum, cue) => sum + cueDurationMs(cue, bpmState), 0) + elapsedMs) /
      timeScale,
    [cues, cueIndex, elapsedMs, bpmState, timeScale]
  );

  const statusLabel = !active
    ? { label: 'standby', tone: 'standby' as const }
    : complete
      ? { label: 'complete', tone: 'done' as const }
      : playing
        ? { label: 'show on air', tone: 'air' as const }
        : { label: 'show held', tone: 'paused' as const };

  return {
    cues,
    selectedCue,
    selectedCueId,
    currentCue,
    cueIndex,
    elapsedMs,
    previewProgress,
    bpm: bpmState,
    timeScale,
    loop,
    active,
    playing,
    complete,
    canRun,
    frame,
    previewFrame,
    totalDurationMs,
    playheadMs,
    statusLabel,
    presets,
    templates,
    activeTemplate,
    activeTemplateId,
    templateDirty,
    saveTemplate,
    overwriteTemplate,
    renameTemplate,
    deleteTemplate,
    loadTemplate,
    editPresetAsTemplate,
    newShow,
    moveCast,
    reorderCast,
    setBpm,
    setTimeScale,
    setLoop,
    setPreviewProgress,
    updateCue,
    addCue,
    duplicateCue,
    removeCue,
    moveCue,
    selectCue,
    jumpToCue,
    scrubCue,
    loadPreset,
    loadShow,
    exportShow,
    importShow,
    run,
    hold,
    stop,
    rewind,
  };
}

export type ChoreographyEngine = ReturnType<typeof useChoreography>;
