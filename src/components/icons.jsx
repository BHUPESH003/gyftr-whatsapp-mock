const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Svg = ({ size = 24, children, vb = 24, ...p }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} aria-hidden="true" {...p}>
    {children}
  </svg>
);

export const ChevronLeft = (p) => (
  <Svg {...p}><path {...base} strokeWidth={2.4} d="M15 4.5 7.5 12l7.5 7.5" /></Svg>
);
export const ChevronRight = (p) => (
  <Svg {...p}><path {...base} strokeWidth={2.2} d="m9 5 7 7-7 7" /></Svg>
);
export const ChevronDown = (p) => (
  <Svg {...p}><path {...base} strokeWidth={2} d="m6 9 6 6 6-6" /></Svg>
);
export const Close = (p) => (
  <Svg {...p}><path {...base} strokeWidth={2} d="m6 6 12 12M18 6 6 18" /></Svg>
);
export const Dots = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.7" fill="currentColor" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    <circle cx="19" cy="12" r="1.7" fill="currentColor" />
  </Svg>
);
export const Phone = (p) => (
  <Svg {...p}>
    <path {...base} d="M6.6 3.5h2.7l1.3 3.6-1.8 1.3a11 11 0 0 0 5.8 5.8l1.3-1.8 3.6 1.3v2.7a2 2 0 0 1-2.2 2A15.7 15.7 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </Svg>
);
export const Plus = (p) => (
  <Svg {...p}><path {...base} strokeWidth={2} d="M12 5v14M5 12h14" /></Svg>
);
export const Sticker = (p) => (
  <Svg {...p}>
    <path {...base} d="M20 12.5V8a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h4.5L20 12.5Z" />
    <path {...base} d="M20 12.5h-3a4.5 4.5 0 0 0-4.5 4.5V20" />
    <path {...base} d="M9 9.5v.5M15 9.5v.5" strokeWidth={2.2} />
  </Svg>
);
export const Camera = (p) => (
  <Svg {...p}>
    <path {...base} d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.2.4L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
    <circle {...base} cx="12" cy="12.5" r="3.4" />
  </Svg>
);
export const Mic = (p) => (
  <Svg {...p}>
    <rect {...base} x="9" y="3" width="6" height="12" rx="3" />
    <path {...base} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </Svg>
);
export const Send = (p) => (
  <Svg {...p}><path fill="currentColor" d="M4.2 4.6a.9.9 0 0 1 1.2-.5l14.6 7.4a.9.9 0 0 1 0 1.6L5.4 20.4a.9.9 0 0 1-1.2-1.1L6.6 13l8-1-8-1-2.4-6.4Z" /></Svg>
);
export const Ticks = ({ color = '#53bdeb', ...p }) => (
  <svg width="17" height="11" viewBox="0 0 17 11" aria-label="Read" {...p}>
    <path d="M11.1.6 4.9 8.9 2.1 6.3M15.2.6 8.9 8.9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Reply = (p) => (
  <Svg {...p}><path {...base} d="M9.5 6 4 11.2l5.5 5.2M4.5 11.2h8.6a6.4 6.4 0 0 1 6.4 6.4v.9" /></Svg>
);
export const External = (p) => (
  <Svg {...p}>
    <path {...base} d="M14 4h6v6M20 4l-8.5 8.5" />
    <path {...base} d="M18 14v3.5A2.5 2.5 0 0 1 15.5 20h-9A2.5 2.5 0 0 1 4 17.5v-9A2.5 2.5 0 0 1 6.5 6H10" />
  </Svg>
);
export const ListIcon = (p) => (
  <Svg {...p}>
    <path {...base} d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.6" cy="6.5" r="1.2" fill="currentColor" />
    <circle cx="4.6" cy="12" r="1.2" fill="currentColor" />
    <circle cx="4.6" cy="17.5" r="1.2" fill="currentColor" />
  </Svg>
);
export const FlowIcon = (p) => (
  <Svg {...p}>
    <path {...base} d="M7 3.5h7.2L19 8.3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
    <path {...base} d="M14 3.7V8.5h4.8M9 12.5h6M9 16h6" />
  </Svg>
);
export const CopyIcon = (p) => (
  <Svg {...p}>
    <rect {...base} x="8.5" y="8.5" width="11" height="11" rx="2.2" />
    <path {...base} d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8" />
  </Svg>
);
export const Lock = (p) => (
  <Svg {...p}>
    <rect {...base} x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <path {...base} d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
  </Svg>
);
export const Share = (p) => (
  <Svg {...p}>
    <path {...base} d="M12 15V4M8.3 7.4 12 3.7l3.7 3.7" />
    <path {...base} d="M8 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </Svg>
);
export const Compass = (p) => (
  <Svg {...p}>
    <circle {...base} cx="12" cy="12" r="8.5" />
    <path {...base} d="m15.6 8.4-2 5.2-5.2 2 2-5.2 5.2-2Z" />
  </Svg>
);
export const Reload = (p) => (
  <Svg {...p}><path {...base} d="M19 12a7 7 0 1 1-2.1-5M19 4.5V8h-3.5" /></Svg>
);
export const Gift = (p) => (
  <Svg {...p}>
    <rect {...base} x="4" y="9" width="16" height="11" rx="1.8" />
    <path {...base} d="M3 9h18v-0.5A1.5 1.5 0 0 0 19.5 7h-15A1.5 1.5 0 0 0 3 8.5V9ZM12 7v13M12 7c-1-3-5-3.6-5-1.4C7 7 9 7 12 7Zm0 0c1-3 5-3.6 5-1.4 0 1.4-2 1.4-5 1.4Z" />
  </Svg>
);
export const Verified = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Business account verified">
    <circle cx="12" cy="12" r="11" fill="#00a884" />
    <path d="m7 12.4 3.2 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- iOS status bar ---------- */
export const SignalIcon = () => (
  <svg width="19" height="12" viewBox="0 0 19 12" aria-hidden="true">
    <rect x="0" y="8" width="3.2" height="4" rx="1" fill="currentColor" />
    <rect x="5.2" y="5.5" width="3.2" height="6.5" rx="1" fill="currentColor" />
    <rect x="10.4" y="3" width="3.2" height="9" rx="1" fill="currentColor" />
    <rect x="15.6" y="0" width="3.2" height="12" rx="1" fill="currentColor" />
  </svg>
);
export const WifiIcon = () => (
  <svg width="17" height="12" viewBox="0 0 17 12" aria-hidden="true">
    <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1-1.1A10.4 10.4 0 0 0 8.5.8 10.4 10.4 0 0 0 1.2 3.7l1 1.1A8.9 8.9 0 0 1 8.5 2.3Z" fill="currentColor" />
    <path d="M8.5 5.9c1.4 0 2.7.5 3.7 1.4l1-1.1a7.3 7.3 0 0 0-9.4 0l1 1.1c1-.9 2.3-1.4 3.7-1.4Z" fill="currentColor" />
    <path d="M8.5 9.4c.6 0 1.2.2 1.6.6L8.5 11.8 6.9 10c.4-.4 1-.6 1.6-.6Z" fill="currentColor" />
  </svg>
);
export const BatteryIcon = () => (
  <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true">
    <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity="0.4" />
    <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
    <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="currentColor" opacity="0.45" />
  </svg>
);

