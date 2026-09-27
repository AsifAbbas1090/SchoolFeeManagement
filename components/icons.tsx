// Small inline stroke icons (currentColor), so they follow text colour in both themes.
const paths = {
  dashboard: "M3 13h8V3H3zM13 21h8v-8h-8zM13 3v8h8V3zM3 21h8v-6H3z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  students: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  receipt: "M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .67V2l-1 .67L17 2l-3 2-3-2-3 2-3-2zM8 8h8M8 12h8M8 16h5",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  wallet: "M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  coins: "M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82",
  trendUp: "M22 7 13.5 15.5l-5-5L2 17M16 7h6v6",
  trendDown: "M22 17 13.5 8.5l-5 5L2 7M16 17h6v-6",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}
