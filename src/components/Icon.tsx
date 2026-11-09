import type { ReactNode, SVGProps } from "react";

const P: Record<string, ReactNode> = {
  film: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </>
  ),
  sheet: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12M15 9v12M3 15h18" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  upload: (
    <>
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M8 12l4 4 4-4" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 7V5a1 1 0 011-1h2a1 1 0 011 1v2" />
      <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M10 11v6M14 11v6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7.5L20 18M20 6L8 16.5" />
    </>
  ),
  crop: (
    <>
      <path d="M6 2v14a2 2 0 002 2h14" />
      <path d="M2 6h14a2 2 0 012 2v14" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 00-3-3L5 16z" />
      <path d="M14.5 5.5l3 3" />
    </>
  ),
  expand: <path d="M9 3H3v6M15 21h6v-6M3 3l7 7M21 21l-7-7" />,
  cursor: <path d="M5 3l6.5 17 2.4-6.6 6.6-2.4z" />,
  line: <path d="M4 20L20 4" />,
  arrow: <path d="M4 20L20 4M20 4h-7M20 4v7" />,
  square: <rect x="4" y="5.5" width="16" height="13" rx="1.5" />,
  text: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  undo: (
    <>
      <path d="M4 9h11a5 5 0 010 10h-6" />
      <path d="M8 5L4 9l4 4" />
    </>
  ),
  redo: (
    <>
      <path d="M20 9H9a5 5 0 000 10h6" />
      <path d="M16 5l4 4-4 4" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  sort: <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  down: <path d="M5 9l7 7 7-7" />,
  up: <path d="M5 15l7-7 7 7" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 100 18c1.4 0 2-.9 2-1.9 0-1.5-1.3-1.8-1.3-3.1 0-1 .8-1.7 1.9-1.7H17a4 4 0 004-4C21 6.4 17 3 12 3z" />
      <circle cx="7.8" cy="10.2" r="1.1" />
      <circle cx="10.4" cy="7" r="1.1" />
      <circle cx="14.6" cy="7.4" r="1.1" />
      <circle cx="17" cy="10.4" r="1.1" />
    </>
  ),
  alignLeft: <path d="M4 6h16M4 12h10M4 18h13" />,
  alignCenter: <path d="M4 6h16M7 12h10M5.5 18h13" />,
  alignRight: <path d="M4 6h16M10 12h10M7 18h13" />,
  textBox: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" strokeDasharray="3 3" />
      <path d="M7.5 9V7.6h9V9M12 7.6V16M9.8 16h4.4" />
    </>
  ),
  move: <path d="M12 3v18M3 12h18M12 3l-2.4 2.4M12 3l2.4 2.4M12 21l-2.4-2.4M12 21l2.4-2.4M3 12l2.4-2.4M3 12l2.4 2.4M21 12l-2.4-2.4M21 12l-2.4 2.4" />,
  comment: <path d="M20 15a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2h12a2 2 0 012 2z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12.5V4a1 1 0 011-1h8.5L21 11.5 12.5 20z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.5 17l5-5 4.5 4.5L16.5 13l4 4" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  send: <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />,
  save: (
    <>
      <path d="M4 5a1 1 0 011-1h11l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
      <path d="M8 4v5h7M8 20v-6h8v6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 10-1.6 5.6" />
      <path d="M20 5v6h-6" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 6h4l10 12h4M3 18h4l3-3.6M14 8.6L17 6h4" />
      <path d="M18 3l3 3-3 3M18 15l3 3-3 3" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4h10v5" />
      <rect x="3" y="9" width="18" height="7" rx="2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 5.2A10.7 10.7 0 0112 5c5.5 0 9 7 9 7a15.8 15.8 0 01-3.1 4.2" />
      <path d="M6.6 6.6C4.1 8.2 2.5 12 2.5 12s3.5 7 9.5 7c1.3 0 2.5-.3 3.5-.7" />
      <path d="m3 3 18 18" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </>
  ),
  sliders: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M7 14v6" />,
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 00-2 1.72l-.12.74a2 2 0 01-3.02 1.6l-.62-.37a2 2 0 00-2.75.73l-.22.38a2 2 0 00.73 2.75l.62.37a2 2 0 010 3.48l-.62.37a2 2 0 00-.73 2.75l.22.38a2 2 0 002.75.73l.62-.37a2 2 0 013.02 1.6l.12.74a2 2 0 002 1.72h.44a2 2 0 002-1.72l.12-.74a2 2 0 013.02-1.6l.62.37a2 2 0 002.75-.73l.22-.38a2 2 0 00-.73-2.75l-.62-.37a2 2 0 010-3.48l.62-.37a2 2 0 00.73-2.75l-.22-.38a2 2 0 00-2.75-.73l-.62.37a2 2 0 01-3.02-1.6l-.12-.74A2 2 0 0012.22 2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  paste: (
    <>
      <path d="M9 4H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 9.5v4.5M12 17v.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A1.5 1.5 0 015.5 3H19v18H5.5A1.5 1.5 0 014 19.5z" />
      <path d="M8 3v18" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 006 .5l2.5-2.5a4.2 4.2 0 00-6-6L11 7" />
      <path d="M14 10.5a4 4 0 00-6-.5L5.5 12.5a4.2 4.2 0 006 6L13 17" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.7,
  ...rest
}: { name: string; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {P[name] ?? P.info}
    </svg>
  );
}
