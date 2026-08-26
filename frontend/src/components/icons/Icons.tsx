// Set de íconos propio, trazo simple (grilla de 24px, stroke 1.8-2). Todos
// usan currentColor en vez de un color fijo, así el tono lo decide quien
// los usa por CSS (`color: ...`) en vez de pasarlo por prop.
import type { ReactNode } from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function svg(props: IconProps, children: ReactNode, strokeWidth = strokeProps.strokeWidth) {
  const { size = 24, className } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...strokeProps} strokeWidth={strokeWidth}>
      {children}
    </svg>
  );
}

export const TireIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 4v2.3M12 17.7V20M4 12h2.3M17.7 12H20" />
    </>,
  );

export const WrenchIcon = (p: IconProps) =>
  svg(p, <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z" />);

export const GaugeIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M5 16a7 7 0 0 1 14 0" />
      <path d="M12 16 15 11" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </>,
  );

export const NutIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <polygon points="12,3 19,7.3 19,16.7 12,21 5,16.7 5,7.3" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );

export const OilDropIcon = (p: IconProps) =>
  svg(p, <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />);

export const SprayIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M8 3v3M12 3v2M16 3v3" />
      <path d="M6 9h12l-1.5 10a2 2 0 0 1-2 1.8H9.5a2 2 0 0 1-2-1.8L6 9Z" />
    </>,
  );

export const FilterIcon = (p: IconProps) => svg(p, <path d="M4 5h16l-6 8v5l-4 2v-7L4 5Z" />);

export const TubeIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <rect x="9" y="8" width="6" height="12" rx="1" />
      <rect x="10" y="4" width="4" height="4" rx="0.5" />
    </>,
  );

export const ChatIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
      <path d="M8.5 9.5c0 3.5 3 6.5 6.5 6.5" />
    </>,
  );

export const AlertTriangleIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M12 4 2 20h20L12 4Z" />
      <path d="M12 10v5M12 17.6v.01" />
    </>,
    2,
  );

export const CheckIcon = (p: IconProps) => svg(p, <path d="M4 12l5 5L20 6" />, 3);

export const ChevronLeftIcon = (p: IconProps) => svg(p, <path d="M15 5l-7 7 7 7" />, 2);

export const CashIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.3" />
    </>,
  );

export const CardIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>,
  );

export const HomeIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </>,
    2,
  );

export const BoxIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
      <path d="M4 8l8-4 8 4" />
      <path d="M12 4v16" />
    </>,
  );

export const LogoutIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
  );

export const SettingsIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>,
  );

export const UserIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </>,
  );

export const ReceiptIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <rect x="4" y="4" width="16" height="17" rx="1.5" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>,
  );

export const PlusIcon = (p: IconProps) => svg(p, <path d="M12 5v14M5 12h14" />, 2);

export const CloseIcon = (p: IconProps) => svg(p, <path d="M6 6l12 12M18 6L6 18" />, 2);

export const SearchIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>,
  );

export const SyncIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M21 21v-5h-5" />
    </>,
  );

export const PrintIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </>,
  );

export const ShareIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>,
  );

export const WifiOffIcon = (p: IconProps) =>
  svg(
    p,
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={3} />
    </>,
  );

