// Generic line-icon set used as a temporary stand-in until exact Figma SVGs
// are extracted. Stroke uses currentColor so each icon inherits text color.

type IconProps = { className?: string };

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconChevronUp({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M3 9.5 12 3l9 6.5V21H3z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

export function IconSetting({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function IconNote({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconPerson({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconMoney({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export function IconBook({ className }: IconProps) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M4 19.5V4a2 2 0 0 1 2-2h13v18H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M8 6h7M8 10h7" />
    </svg>
  );
}

export function IconNotice({
  className,
  hasNotice = false,
}: IconProps & { hasNotice?: boolean }) {
  return (
    <svg {...stroke} className={className} aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {hasNotice && (
        <circle cx="18" cy="5" r="3" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}
