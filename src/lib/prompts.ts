import type { Doc, Frame } from "../types";
import { SHOT_LABEL } from "../types";
import { shortDur, timecode } from "./imaging";

export type SuggestionGroup = "build" | "analyse" | "produce" | "extend";

export interface Suggestion {
  id: string;
  group: SuggestionGroup;
  title: string;
  blurb: string;
  hue: string;
  instruction: string;
}

export const GROUP_META: Record<
  SuggestionGroup,
  { label: string; hue: string; note: string }
> = {
  build: {
    label: "Build an app",
    hue: "#ffab1f",
    note: "Ship software around this sheet",
  },
  analyse: {
    label: "Read the sequence",
    hue: "#21d4ee",
    note: "Critique, structure, continuity",
  },
  produce: {
    label: "Production paperwork",
    hue: "#b8f24a",
    note: "Shot lists, pulls, schedules",
  },
  extend: {
    label: "Extend the board",
    hue: "#ff2e88",
    note: "New frames and branches",
  },
};

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "animatic",
    group: "build",
    title: "Animatic player",
    blurb: "Timed playback of the sheet with scrubber, captions and keyboard transport.",
    hue: "#ffab1f",
    instruction:
      "Build an animatic player that plays the contact sheet as a timed sequence. Each frame holds for its listed duration, captions fade in at 20% of the hold, and a scrubber shows the running timecode. Support space = play/pause, arrow keys = step frame, and a loop toggle. Preload every frame before playback starts so timing never stutters.",
  },
  {
    id: "pitch",
    group: "build",
    title: "Pitch microsite",
    blurb: "Scroll-driven one-pager that reveals the sequence beat by beat.",
    hue: "#ff6a1a",
    instruction:
      "Build a scroll-driven pitch microsite for this sequence. Pin each frame while its caption and beat text scroll past, use a progress rail keyed to frame numbers, and end on a contact-sheet overview with a call to action. It must read well on a phone and on a 27-inch display.",
  },
  {
    id: "tracker",
    group: "build",
    title: "Shot tracker CRUD",
    blurb: "Production board with status, owners, filters and CSV export.",
    hue: "#b8f24a",
    instruction:
      "Build a shot-tracking application seeded with this frame manifest. Each shot is a record with name, shot size, duration, status, owner, tags and a comment thread. Provide create / edit / delete, drag-to-reorder, bulk status changes, search, filter by status and tag, sort, saved views, undo after destructive actions, and CSV export.",
  },
  {
    id: "review",
    group: "build",
    title: "Review & annotation room",
    blurb: "Pin comments onto coordinates, resolve threads, compare versions.",
    hue: "#21d4ee",
    instruction:
      "Build a review room where a reviewer clicks anywhere on an enlarged frame to drop a numbered pin with a comment. Pins are stored in normalised 0–1 coordinates so they survive resizing. Include thread resolve, per-frame comment counts on the contact sheet, and a side-by-side version compare.",
  },
  {
    id: "comic",
    group: "build",
    title: "Vertical comic reader",
    blurb: "Webtoon-style panel flow with parallax and beat reveals.",
    hue: "#ff2e88",
    instruction:
      "Build a vertical-scroll comic reader from this sequence. Vary panel width by shot size (extreme wides are full bleed, inserts are inset), add subtle parallax on the image layer, and reveal captions with an intersection observer. Include a jump-to-frame index and a read-progress bar.",
  },
  {
    id: "timing",
    group: "build",
    title: "Timing editor + EDL",
    blurb: "Drag frame durations on a timeline, export ffmpeg / EDL.",
    hue: "#4aa8ff",
    instruction:
      "Build a timeline editor where each frame is a clip whose duration can be dragged. Show total runtime, let me retime the whole board to a target length proportionally, and export both an EDL and a ready-to-run ffmpeg concat command that rebuilds the animatic from the numbered stills.",
  },
  {
    id: "api",
    group: "build",
    title: "Typed data layer",
    blurb: "Schema, seed JSON, validators and a mock API for the board.",
    hue: "#2fd07a",
    instruction:
      "Design the data layer for an application around this board: a typed schema for Board / Frame / Comment / Tag, the seed JSON matching the manifest below, validation rules, and a small mock API (list, get, create, patch, reorder, delete) with optimistic-update semantics. Include the migration story for adding an annotation layer later.",
  },
  {
    id: "continuity",
    group: "analyse",
    title: "Continuity pass",
    blurb: "Screen direction, eyelines, coverage gaps and the 180° line.",
    hue: "#21d4ee",
    instruction:
      "Read the frames in order and give a continuity report: screen direction and eyeline consistency, the 180-degree line, missing coverage (establishing, insert, reaction), and any cut that will read as a jump. Reference frames by number and propose the specific fix for each issue.",
  },
  {
    id: "beats",
    group: "analyse",
    title: "Beat sheet & structure",
    blurb: "Name the beats, find the turn, flag the sag.",
    hue: "#4aa8ff",
    instruction:
      "Turn this sequence into a beat sheet. Name each beat, mark the inciting incident, the midpoint turn and the climax, and tell me where the rhythm sags. Suggest the single frame you would cut and the single frame you would add.",
  },
  {
    id: "alt",
    group: "analyse",
    title: "Alt text & audio description",
    blurb: "Accessible descriptions plus an AD script timed to the sheet.",
    hue: "#2fd07a",
    instruction:
      "Write concise alt text (max 180 characters) for every frame, then an audio-description script that fits inside each frame's duration at roughly 2.5 words per second. Flag any frame where the description cannot fit and suggest a longer hold.",
  },
  {
    id: "grade",
    group: "analyse",
    title: "Colour & lighting report",
    blurb: "Palette arc, contrast strategy, motivated sources.",
    hue: "#ff6a1a",
    instruction:
      "Analyse the colour and lighting arc across the sequence. Describe the palette per act, identify unmotivated sources, and propose a grade strategy (lift/gamma/gain intent, not numbers) that keeps the warm/cool tension consistent from frame 01 to the last frame.",
  },
  {
    id: "shotlist",
    group: "produce",
    title: "Shot list & camera package",
    blurb: "Lens, movement, height and setup order per frame.",
    hue: "#b8f24a",
    instruction:
      "Produce a shooting-ready shot list from the manifest: frame number, shot size, suggested focal length, camera height, movement, and a practical setup order that groups by location and lighting direction. Add a camera package recommendation for a two-day shoot.",
  },
  {
    id: "vfx",
    group: "produce",
    title: "VFX pull list",
    blurb: "Complexity tiers, plate needs and a bid-ready breakdown.",
    hue: "#ff2e88",
    instruction:
      "Create a VFX pull list. For each frame that needs work, list the elements, plate requirements (clean plate, HDRI, tracking markers, lens grid), a complexity tier from 1 to 5, and the risk that will blow the budget. Finish with the three shots to bid first.",
  },
  {
    id: "imagegen",
    group: "produce",
    title: "Image-gen prompt pack",
    blurb: "One reusable prompt per frame with a locked style suffix.",
    hue: "#ffab1f",
    instruction:
      "Write one image-generation prompt per frame that would reproduce this board, plus a shared style suffix that locks lens, grade, grain and aspect ratio across all of them. Keep character descriptors identical between prompts so the cast stays consistent.",
  },
  {
    id: "schedule",
    group: "produce",
    title: "Schedule & risk",
    blurb: "Stripboard order, weather cover, company moves.",
    hue: "#ffc53d",
    instruction:
      "Build a stripboard schedule for this sequence assuming a small crew. Group by location and time of day, mark night work, call out company moves, and give every exterior a weather-cover interior alternative. Flag the two biggest schedule risks.",
  },
  {
    id: "missing",
    group: "extend",
    title: "Fill the gaps",
    blurb: "Propose connective frames with composition notes.",
    hue: "#ff2e88",
    instruction:
      "Identify where the sequence skips a beat and propose the missing frames. For each, give the insertion index, a name, a one-line caption in the same voice as the manifest, the shot size, a duration, and a composition note describing framing and light.",
  },
  {
    id: "branch",
    group: "extend",
    title: "Branch the ending",
    blurb: "Two alternate final beats with structural consequences.",
    hue: "#ff6a1a",
    instruction:
      "Write two alternate endings branching from the last approved frame. For each, give three new frames in manifest format and one paragraph on how the branch changes the meaning of the opening frame.",
  },
];

export type TargetKey =
  | "react"
  | "next"
  | "html"
  | "vue"
  | "svelte"
  | "swift"
  | "unity";

export const TARGETS: { key: TargetKey; label: string; stack: string }[] = [
  {
    key: "react",
    label: "React + Tailwind",
    stack:
      "React 19 with TypeScript, Vite, Tailwind CSS. Function components and hooks only; no class components. Keep state in one reducer, colocate derived values, and avoid extra dependencies unless they remove real complexity.",
  },
  {
    key: "next",
    label: "Next.js App Router",
    stack:
      "Next.js App Router with TypeScript and Tailwind CSS. Server components by default, client components only where interaction demands it. Use route handlers for the mock API and static generation for the sheet overview.",
  },
  {
    key: "html",
    label: "Single-file HTML",
    stack:
      "One self-contained index.html with vanilla ES modules and hand-written CSS. No build step, no framework, no CDN dependencies. Everything must work when the file is opened from disk.",
  },
  {
    key: "vue",
    label: "Vue 3 + Vite",
    stack:
      "Vue 3 with the Composition API, TypeScript, Vite and Tailwind CSS. Use composables for shared state and keep components under 200 lines.",
  },
  {
    key: "svelte",
    label: "SvelteKit",
    stack:
      "SvelteKit with TypeScript and Tailwind CSS. Use runes/stores for board state, and keep the sheet renderer in a plain module so it can run on the server.",
  },
  {
    key: "swift",
    label: "SwiftUI",
    stack:
      "SwiftUI for iOS 17+, MVVM with observable models, Swift concurrency for image loading, and a Canvas-based contact-sheet exporter.",
  },
  {
    key: "unity",
    label: "Unity",
    stack:
      "Unity 2022 LTS with C#, UI Toolkit for the board, and a RenderTexture-based contact-sheet exporter. Keep the data model in plain serialisable classes.",
  },
];

export type ModelKey = "generic" | "gpt" | "claude" | "gemini";

export const MODELS: { key: ModelKey; label: string; hint: string }[] = [
  { key: "generic", label: "Any model", hint: "Portable markdown" },
  { key: "gpt", label: "GPT / ChatGPT", hint: "Numbered spec + explicit deliverables" },
  { key: "claude", label: "Claude", hint: "XML-tagged sections" },
  { key: "gemini", label: "Gemini", hint: "Long-context, image first" },
];

export interface HandoffOptions {
  selected: string[];
  target: TargetKey;
  model: ModelKey;
  detail: number;
  includeManifest: boolean;
  includeComments: boolean;
  includeTimecodes: boolean;
  includeDesign: boolean;
  includeAcceptance: boolean;
  includeJson: boolean;
  extra: string;
}

export const DEFAULT_HANDOFF: HandoffOptions = {
  selected: ["animatic", "tracker"],
  target: "react",
  model: "generic",
  detail: 3,
  includeManifest: true,
  includeComments: true,
  includeTimecodes: true,
  includeDesign: true,
  includeAcceptance: true,
  includeJson: false,
  extra: "",
};

function manifestTable(frames: Frame[], withTc: boolean): string {
  let elapsed = 0;
  const rows = frames.map((f, i) => {
    const tc = timecode(elapsed);
    elapsed += f.duration;
    const cap = f.caption.replace(/\|/g, "/").replace(/\n/g, " ");
    return `| ${String(i + 1).padStart(2, "0")} | ${f.name} | ${f.shot} | ${
      withTc ? `${tc} | ` : ""
    }${f.duration}s | ${f.status} | ${cap} | ${f.tags.join(", ") || "—"} |`;
  });
  const head = `| # | Frame | Shot | ${
    withTc ? "In (TC) | " : ""
  }Dur | Status | Caption | Tags |`;
  const sep = `|---|---|---|${withTc ? "---|" : ""}---|---|---|---|`;
  return [head, sep, ...rows].join("\n");
}

export function buildPrompt(
  doc: Doc,
  frames: Frame[],
  o: HandoffOptions,
  sheetInfo: { width: number; height: number; cols: number; rows: number } | null
): string {
  const target = TARGETS.find((t) => t.key === o.target)!;
  const chosen = SUGGESTIONS.filter((s) => o.selected.includes(s.id));
  const total = frames.reduce((a, f) => a + f.duration, 0);
  const detailed = o.detail >= 3;
  const exhaustive = o.detail >= 5;
  const xml = o.model === "claude";
  const L: string[] = [];
  const sec = (name: string, body: string) => {
    if (!body.trim()) return;
    L.push(xml ? `<${name}>\n${body}\n</${name}>` : `## ${name.replace(/_/g, " ").toUpperCase()}\n${body}`);
  };

  L.push(
    o.detail <= 1
      ? "You are a senior product engineer. Build what is described below from the attached storyboard contact sheet."
      : "You are a senior product engineer and a film-literate designer. You are handed a numbered storyboard contact sheet plus its manifest. You read the images in order, respect the sequence, and ship a working application around them — not a mock-up."
  );

  sec(
    "project",
    [
      `Title: ${doc.title || "Untitled board"}`,
      doc.logline ? `Logline: ${doc.logline}` : "",
      `Sequence: ${frames.length} frames · ${shortDur(total)} total runtime · sheet aspect ${doc.sheet.ratio}`,
      `Status mix: ${["approved", "draft", "rework"]
        .map((s) => `${frames.filter((f) => f.status === s).length} ${s}`)
        .join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  sec(
    "attached_asset",
    [
      `contact-sheet.png${
        sheetInfo
          ? ` — ${sheetInfo.width}×${sheetInfo.height}px, ${sheetInfo.cols} columns × ${sheetInfo.rows} rows`
          : ""
      }.`,
      `Reading order is left to right, then top to bottom. Frame numbers are printed ${
        doc.sheet.showNumbers ? "in the accent badge at the top-left of each cell" : "implicitly by position"
      } and match the manifest below.`,
      o.detail <= 2
        ? ""
        : "Treat the image as ground truth for composition, palette and mood; treat the manifest as ground truth for names, order, timing and status.",
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (chosen.length) {
    sec(
      "what_to_build",
      chosen
        .map((s, i) => `${i + 1}. ${s.title.toUpperCase()} — ${s.instruction}`)
        .join("\n\n")
    );
  } else {
    sec(
      "what_to_build",
      "Propose the strongest application to build around this contact sheet, then build it. Justify the choice in three sentences before the code."
    );
  }

  if (o.includeManifest && frames.length) {
    sec("frame_manifest", manifestTable(frames, o.includeTimecodes));
  }

  if (o.includeComments) {
    const notes = frames
      .map((f, i) =>
        f.comments.length
          ? `Frame ${String(i + 1).padStart(2, "0")} — ${f.name}\n${f.comments
              .map((c) => `  - ${c.author}: ${c.text}`)
              .join("\n")}`
          : ""
      )
      .filter(Boolean)
      .join("\n");
    sec(
      "crew_comments",
      notes
        ? `${notes}\n\nThese are real production constraints. Honour them; where two comments conflict, call it out and pick a side.`
        : "No crew comments on this board yet."
    );
  }

  if (detailed) sec("technical_constraints", target.stack);

  if (o.includeDesign && detailed) {
    sec(
      "design_direction",
      [
        "Derive the interface palette from the frames themselves — do not ship a default grey dashboard.",
        `Sheet accent currently in use: ${doc.sheet.accent}. Frame status colours: approved #2fd07a, draft #ffc53d, rework #ff4438.`,
        "Type: one characterful display face for headings, one readable body face, one mono for timecodes and counters.",
        "Every control must give visible feedback within 100ms. Animate state changes, never layout thrash.",
        exhaustive
          ? "Deliver light and dark surfaces, an empty state, a loading state, an error state, and a keyboard path for every primary action."
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  if (o.includeAcceptance && detailed) {
    sec(
      "acceptance_criteria",
      [
        "The app opens already populated with the manifest above — never an empty shell.",
        "Create, edit, delete, reorder, search, filter and sort all work on real state.",
        "Destructive actions are undoable and every mutation is reflected immediately.",
        "Frame order in the app always matches the contact-sheet order.",
        exhaustive
          ? "No console errors, no layout shift on load, no horizontal overflow at 360px, and every interactive element is reachable by keyboard."
          : "No placeholder handlers and no dead controls.",
      ].join("\n")
    );
  }

  if (o.includeJson && frames.length) {
    sec(
      "seed_json",
      "```json\n" +
        JSON.stringify(
          {
            title: doc.title,
            logline: doc.logline,
            frames: frames.map((f, i) => ({
              index: i + 1,
              id: f.id,
              name: f.name,
              shot: f.shot,
              shotLabel: SHOT_LABEL[f.shot],
              duration: f.duration,
              status: f.status,
              caption: f.caption,
              tags: f.tags,
              annotated: f.annotated,
              comments: o.includeComments
                ? f.comments.map((c) => ({ author: c.author, text: c.text }))
                : [],
              asset: `frame-${String(i + 1).padStart(2, "0")}.png`,
            })),
          },
          null,
          2
        ) +
        "\n```"
    );
  }

  if (o.extra.trim()) sec("additional_notes", o.extra.trim());

  sec(
    "output_format",
    o.detail <= 1
      ? "Return the complete code."
      : [
          "1. A three-sentence plan.",
          "2. The complete, runnable code — every file, no ellipses, no TODOs.",
          "3. A short list of what you would do next.",
          exhaustive
            ? "4. A test checklist mapped to the acceptance criteria above."
            : "",
          o.model === "gpt" ? "Use fenced code blocks with file paths as the first comment line." : "",
        ]
          .filter(Boolean)
          .join("\n")
  );

  return L.join("\n\n");
}

export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

export function manifestJson(doc: Doc, frames: Frame[]) {
  let elapsed = 0;
  const totalRuntime = frames.reduce((a, f) => a + f.duration, 0);
  return JSON.stringify(
    {
      project: doc.title,
      logline: doc.logline,
      generated: new Date().toISOString(),
      runtime: Number(totalRuntime.toFixed(2)),
      sheet: doc.sheet,
      frames: frames.map((f, i) => {
        const inTc = timecode(elapsed);
        elapsed += f.duration;
        return {
          index: i + 1,
          id: f.id,
          name: f.name,
          caption: f.caption,
          shot: f.shot,
          status: f.status,
          durationSeconds: f.duration,
          inTimecode: inTc,
          outTimecode: timecode(elapsed),
          tags: f.tags,
          annotated: f.annotated,
          pixelSize: { w: f.w, h: f.h },
          comments: f.comments.map((c) => ({
            author: c.author,
            text: c.text,
            at: new Date(c.at).toISOString(),
          })),
        };
      }),
    },
    null,
    2
  );
}
