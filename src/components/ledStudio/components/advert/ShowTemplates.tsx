import { useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ChoreographyEngine } from '../../engine/useChoreography';
import type { ChoreoShowTemplate } from '../../../../services/choreoTemplates';
import { cn } from '../../utils/cn';

type TemplateForm =
  | { mode: 'new' }
  | { mode: 'edit'; id: string };

/**
 * Editable show templates. Built-ins are generated from the advert pool; My
 * templates are saved shows whose scenes, images, behaviours and clock can be
 * reloaded, renamed, overwritten and deleted. Turning a built-in into a copy
 * makes its scenes immediately editable with the same scene controls below.
 */
export function ShowTemplates({ show }: { show: ChoreographyEngine }) {
  const [form, setForm] = useState<TemplateForm | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setForm({ mode: 'new' });
    setName('');
    setDescription('');
    setDeleteId(null);
  };

  const openEdit = (template: ChoreoShowTemplate) => {
    setForm({ mode: 'edit', id: template.id });
    setName(template.name);
    setDescription(template.description);
    setDeleteId(null);
  };

  const closeForm = () => {
    setForm(null);
    setName('');
    setDescription('');
  };

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      if (form?.mode === 'edit') await show.renameTemplate(form.id, name, description);
      else await show.saveTemplate(name, description);
      closeForm();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (deleteId !== id) {
      setDeleteId(id);
      return;
    }
    setDeleteId(null);
    await show.deleteTemplate(id);
  };

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#7f8a7c]">
          Show templates
        </span>
        <span className="font-mono text-[8px] text-[#667060]">
          {show.templates.length} saved · {show.presets.length} built-in
        </span>
      </div>

      {/* active template status */}
      {show.activeTemplate && (
        <div
          className={cn(
            'mb-2 rounded-lg border p-2',
            show.templateDirty
              ? 'border-amber-400/40 bg-amber-400/[0.07]'
              : 'border-violet-400/35 bg-violet-400/[0.06]'
          )}
        >
          <div className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3 shrink-0 text-violet-300" />
            <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold text-[#e5ece0]">
              Editing “{show.activeTemplate.name}”
            </span>
            <span
              className={cn(
                'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.14em]',
                show.templateDirty
                  ? 'border-amber-400/45 text-amber-300'
                  : 'border-led-lime/40 text-led-lime'
              )}
            >
              {show.templateDirty ? 'unsaved' : 'saved'}
            </span>
          </div>
          <p className="mt-1 text-[8px] leading-snug text-[#7f8a7c]">
            {show.templateDirty
              ? 'Images, scenes and behaviours changed since the last save.'
              : 'Scene edits stay in this template until you change them again.'}
          </p>
          {show.templateDirty && (
            <button
              type="button"
              onClick={() => void show.overwriteTemplate(show.activeTemplate!.id)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-400/15 py-1.5 text-[9.5px] font-bold text-amber-200 transition-colors hover:bg-amber-400/25"
            >
              <Save className="h-3 w-3" />
              Save changes to “{show.activeTemplate.name}”
            </button>
          )}
        </div>
      )}

      {/* new / rename form */}
      {form ? (
        <div className="mb-2 rounded-lg border border-led-lime/40 bg-[#131a10] p-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-[#e5ece0]">
              {form.mode === 'new' ? 'Save current show as template' : 'Rename template'}
            </span>
            <button
              type="button"
              onClick={closeForm}
              title="Cancel"
              className="ml-auto p-1 text-[#7f8a7c] transition-colors hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <input
            aria-label="Template name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 60))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit();
              if (event.key === 'Escape') closeForm();
            }}
            placeholder="Template name"
            className="w-full rounded border border-[#3a4239] bg-[#090d0a] px-2 py-1.5 text-[10px] font-bold text-[#e8eee4] outline-none focus:border-led-lime/60"
          />
          <textarea
            aria-label="Template description"
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 160))}
            rows={2}
            placeholder="What the show does (optional)"
            className="mt-1 w-full resize-none rounded border border-[#3a4239] bg-[#090d0a] px-2 py-1.5 text-[9px] text-[#dce3d9] outline-none focus:border-led-lime/60"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!name.trim() || busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-led-lime/45 bg-led-lime/10 py-1.5 text-[9.5px] font-bold text-led-lime transition-colors hover:bg-led-lime/20 disabled:opacity-35"
            >
              <Save className="h-3 w-3" />
              {form.mode === 'new' ? 'Save show' : 'Save name'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-[#3a4239] px-2.5 py-1.5 text-[9.5px] font-bold text-[#8e9988] transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
          {form.mode === 'new' && (
            <p className="mt-1.5 text-[7.8px] leading-snug text-[#667060]">
              Stores every scene with its images, cast positions, formation, motion, transition and
              timing, plus the show clock.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openNew}
          className="mb-2 flex w-full items-center gap-2 rounded-md border border-dashed border-[#4b5a43] bg-[#141a13] px-2.5 py-1.5 text-left transition-colors hover:border-led-lime hover:bg-[#1b2418]"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-[#465640] text-led-lime">
            <BookmarkPlus className="h-3 w-3" />
          </span>
          <span className="leading-tight">
            <span className="block text-[10px] font-bold text-[#e8efe0]">Save current show as template</span>
            <span className="block text-[8px] text-[#7f8a7c]">
              Keeps images and behaviours for reuse
            </span>
          </span>
        </button>
      )}

      {/* my templates */}
      {show.templates.length > 0 && (
        <>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.18em] text-[#8b9785]">
              My templates
            </span>
            <span className="h-px flex-1 bg-[#2b332a]" />
          </div>
          <div className="mb-2 grid gap-1.5">
            {show.templates.map((template) => {
              const active = template.id === show.activeTemplateId;
              return (
                <div
                  key={template.id}
                  className={cn(
                    'group rounded-lg border bg-[#11160f] transition-all',
                    active
                      ? 'border-violet-400/55 bg-violet-400/[0.07]'
                      : 'border-[#333c30] hover:border-violet-400/40'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => show.loadTemplate(template.id)}
                    className="w-full p-2.5 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                      <span className="min-w-0 flex-1 truncate text-[10.5px] font-bold text-[#e5ece0]">
                        {template.name}
                      </span>
                      <span className="shrink-0 font-mono text-[8px] text-[#667060]">
                        {template.cues.length} scenes
                      </span>
                    </span>
                    <span className="mt-1 block text-[8.7px] leading-snug text-[#7f8a7c]">
                      {template.description || 'Saved show — click to load.'}
                    </span>
                    <span className="mt-1 block font-mono text-[7.5px] text-[#5d6857]">
                      {template.bpm} BPM · {template.timeScale.toFixed(2)}× ·{' '}
                      {template.loop ? 'loop' : 'once'}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 border-t border-[#2b332a] px-2 py-1">
                    {active ? (
                      <span className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.14em] text-violet-300">
                        <Check className="h-2.5 w-2.5" />
                        {show.templateDirty ? 'editing · unsaved' : 'editing'}
                      </span>
                    ) : (
                      <span className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#5d6857]">
                        saved
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void show.overwriteTemplate(template.id)}
                      title="Replace this template with the current show"
                      className="ml-auto rounded p-1 text-[#7f8a7c] transition-colors hover:text-amber-300"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(template)}
                      title="Rename template"
                      className="rounded p-1 text-[#7f8a7c] transition-colors hover:text-led-lime"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(template.id)}
                      title={deleteId === template.id ? 'Click again to delete' : 'Delete template'}
                      className={cn(
                        'rounded p-1 transition-colors',
                        deleteId === template.id
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-[#7f8a7c] hover:text-rose-300'
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {deleteId === template.id && (
                    <div className="flex items-center gap-1.5 border-t border-rose-500/30 bg-rose-500/[0.07] px-2 py-1">
                      <span className="text-[8px] text-rose-200">Delete “{template.name}”?</span>
                      <button
                        type="button"
                        onClick={() => void remove(template.id)}
                        className="ml-auto rounded border border-rose-400/50 px-1.5 py-0.5 text-[8px] font-bold text-rose-200 hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="rounded border border-[#3a4239] px-1.5 py-0.5 text-[8px] font-bold text-[#8e9988]"
                      >
                        Keep
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* built-in templates */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="font-mono text-[7.5px] uppercase tracking-[0.18em] text-[#8b9785]">
          Built-in shows
        </span>
        <span className="h-px flex-1 bg-[#2b332a]" />
      </div>
      <div className="grid gap-1.5">
        {show.presets.map((preset) => (
          <div
            key={preset.id}
            className="group rounded-lg border border-[#333c30] bg-[#11160f] transition-all hover:border-violet-400/55 hover:bg-violet-400/[0.07]"
          >
            <button
              type="button"
              onClick={() => show.loadPreset(preset.id)}
              className="w-full p-2.5 text-left"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-bold text-[#e5ece0]">
                  {preset.name}
                </span>
                <span className="shrink-0 font-mono text-[8px] text-[#667060]">
                  {preset.cues.length} scenes
                </span>
              </span>
              <span className="mt-1 block text-[8.7px] leading-snug text-[#7f8a7c]">
                {preset.description}
              </span>
            </button>
            <div className="flex items-center gap-1 border-t border-[#2b332a] px-2 py-1">
              <span className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#5d6857]">
                built-in
              </span>
              <button
                type="button"
                onClick={() => void show.editPresetAsTemplate(preset.id)}
                title="Copy this show into My templates so its images and behaviours can be edited"
                className="ml-auto flex items-center gap-1 rounded px-1 py-0.5 text-[8px] font-bold text-[#8e9988] transition-colors hover:text-led-lime"
              >
                <Pencil className="h-2.5 w-2.5" />
                Edit copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
