import f01 from "../assets/frames/f01.jpg";
import f02 from "../assets/frames/f02.jpg";
import f03 from "../assets/frames/f03.jpg";
import f04 from "../assets/frames/f04.jpg";
import f05 from "../assets/frames/f05.jpg";
import f06 from "../assets/frames/f06.jpg";
import f07 from "../assets/frames/f07.jpg";
import f08 from "../assets/frames/f08.jpg";
import { DEFAULT_SHEET, type Doc, type Frame, type SavedView } from "../types";

interface SeedSpec {
  src: string;
  name: string;
  caption: string;
  shot: Frame["shot"];
  status: Frame["status"];
  duration: number;
  tags: string[];
  comments: [string, string][];
}

const SPECS: SeedSpec[] = [
  {
    src: f01,
    name: "Station on the cliff",
    caption: "EXT. LISTENING STATION — NIGHT. Storm hits the mast; one window still burns.",
    shot: "EWS",
    status: "approved",
    duration: 6,
    tags: ["act-1", "establishing", "vfx-rain"],
    comments: [
      ["Dir. Vega", "Hold two beats longer than feels comfortable. Let the audience find the window."],
      ["DP Okafor", "Practical amber in the window is our only warm source until frame 07."],
    ],
  },
  {
    src: f02,
    name: "Ines hears it",
    caption: "INT. RADIO ROOM — CONTINUOUS. Ines freezes mid-log as the carrier breaks.",
    shot: "CU",
    status: "approved",
    duration: 4.5,
    tags: ["act-1", "performance"],
    comments: [["Dir. Vega", "No dialogue. The headphone hiss carries the whole beat."]],
  },
  {
    src: f03,
    name: "The impossible pulse",
    caption: "INSERT — SONAR CRT. A geometry that should not resolve on this hardware.",
    shot: "INSERT",
    status: "rework",
    duration: 2.5,
    tags: ["act-1", "vfx-screen", "hero-prop"],
    comments: [
      ["VFX Lind", "Screen comp is temp. Need the real phosphor decay pass before lock."],
      ["Dir. Vega", "Make the pattern legible for exactly 8 frames, then let it smear."],
    ],
  },
  {
    src: f04,
    name: "Flare run",
    caption: "EXT. CLIFF STEPS — NIGHT. She runs for the launch, flare tearing the rain open.",
    shot: "WS",
    status: "draft",
    duration: 5,
    tags: ["act-2", "stunt", "practical-fire"],
    comments: [["Prod. Adeyemi", "Stunt double needed for the last four steps. Weather cover: stage tank."]],
  },
  {
    src: f05,
    name: "Landfall",
    caption: "EXT. OPEN WATER — NIGHT. The structure resolves out of the fog at 400m.",
    shot: "EWS",
    status: "approved",
    duration: 8,
    tags: ["act-2", "vfx-heavy", "key-art"],
    comments: [
      ["VFX Lind", "This is the poster frame. Budget the full sim here."],
      ["Dir. Vega", "Camera stays low — the boat should feel like a bug on glass."],
    ],
  },
  {
    src: f06,
    name: "Descent",
    caption: "UNDERWATER — She follows the lit ridges down along the outer wall.",
    shot: "POV",
    status: "draft",
    duration: 6,
    tags: ["act-2", "underwater", "vfx-heavy"],
    comments: [],
  },
  {
    src: f07,
    name: "The threshold",
    caption: "INT. STRUCTURE — She reaches for the doorway. Warm light answers.",
    shot: "MS",
    status: "rework",
    duration: 5.5,
    tags: ["act-3", "climax", "lighting"],
    comments: [["DP Okafor", "Magenta edge is fighting the amber. Pick one, or motivated split."]],
  },
  {
    src: f08,
    name: "Morning, and nothing",
    caption: "EXT. HORIZON — DAWN. Flat sea. The station, small. No structure.",
    shot: "EWS",
    status: "draft",
    duration: 9,
    tags: ["act-3", "resolution"],
    comments: [["Dir. Vega", "Cut to black on the first gull, not the last wave."]],
  },
];

export function seedFrames(): Frame[] {
  const base = Date.now() - SPECS.length * 60000;
  return SPECS.map((s, i) => ({
    id: `seed_${i + 1}`,
    name: s.name,
    caption: s.caption,
    src: s.src,
    w: 1672,
    h: 941,
    shot: s.shot,
    status: s.status,
    duration: s.duration,
    tags: s.tags,
    comments: s.comments.map(([author, text], k) => ({
      id: `seed_${i + 1}_c${k}`,
      author,
      text,
      at: base + i * 60000 + k * 4000,
    })),
    annotated: false,
    createdAt: base + i * 60000,
  }));
}

export function seedDoc(): Doc {
  return {
    title: "The Last Transmission",
    logline:
      "A storm-bound radio operator intercepts a signal that maps a structure in the open Atlantic — and rows out to meet it.",
    frames: seedFrames(),
    sheet: { ...DEFAULT_SHEET },
  };
}

export const BUILTIN_VIEWS: SavedView[] = [
  { id: "v_all", name: "All frames", query: "", shot: "ALL", status: "ALL", sort: "sequence", builtin: true },
  { id: "v_rework", name: "Needs rework", query: "", shot: "ALL", status: "rework", sort: "sequence", builtin: true },
  { id: "v_vfx", name: "VFX pulls", query: "vfx", shot: "ALL", status: "ALL", sort: "sequence", builtin: true },
  { id: "v_close", name: "Close coverage", query: "", shot: "CU", status: "ALL", sort: "sequence", builtin: true },
];
