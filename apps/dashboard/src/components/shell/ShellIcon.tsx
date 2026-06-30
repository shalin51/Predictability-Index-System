export type IconName =
  | 'pulse'
  | 'grid'
  | 'flask'
  | 'layers'
  | 'scan'
  | 'settings'
  | 'bell'
  | 'user'
  | 'menu'
  | 'close';

export function ShellIcon({ name }: { name: IconName }) {
  const iconProps = {
    fill: 'none',
    height: 16,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    width: 16,
  };

  if (name === 'pulse') {
    return (
      <svg {...iconProps}>
        <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
      </svg>
    );
  }

  if (name === 'grid') {
    return (
      <svg {...iconProps}>
        <rect height="7" rx="1.5" width="7" x="3" y="3" />
        <rect height="7" rx="1.5" width="7" x="14" y="3" />
        <rect height="7" rx="1.5" width="7" x="3" y="14" />
        <rect height="7" rx="1.5" width="7" x="14" y="14" />
      </svg>
    );
  }

  if (name === 'flask') {
    return (
      <svg {...iconProps}>
        <path d="M10 3v6.2L5.5 17a3 3 0 0 0 2.6 4.5h7.8a3 3 0 0 0 2.6-4.5L14 9.2V3" />
        <path d="M8 3h8" />
      </svg>
    );
  }

  if (name === 'layers') {
    return (
      <svg {...iconProps}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 16 9 5 9-5" />
      </svg>
    );
  }

  if (name === 'scan') {
    return (
      <svg {...iconProps}>
        <path d="M4 7V5a1 1 0 0 1 1-1h2" />
        <path d="M17 4h2a1 1 0 0 1 1 1v2" />
        <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
        <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
        <path d="M7 12h10" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg {...iconProps}>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="m4.9 4.9 2.1 2.1" />
        <path d="m17 17 2.1 2.1" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="m4.9 19.1 2.1-2.1" />
        <path d="m17 7 2.1-2.1" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg {...iconProps}>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  if (name === 'menu') {
    return (
      <svg {...iconProps}>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </svg>
    );
  }

  if (name === 'close') {
    return (
      <svg {...iconProps}>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}
