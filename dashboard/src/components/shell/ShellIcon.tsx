export type IconName =
  | 'pulse'
  | 'grid'
  | 'flask'
  | 'layers'
  | 'scan'
  | 'box'
  | 'cpu'
  | 'mold'
  | 'target'
  | 'sliders'
  | 'factory'
  | 'upload'
  | 'download'
  | 'settings'
  | 'bell'
  | 'user'
  | 'search'
  | 'menu'
  | 'close';

export function ShellIcon({ name }: { name: IconName }) {
  const iconProps = {
    fill: 'none',
    height: 18,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.5,
    viewBox: '0 0 24 24',
    width: 18,
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

  if (name === 'box') {
    return (
      <svg {...iconProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21" />
      </svg>
    );
  }

  if (name === 'cpu') {
    return (
      <svg {...iconProps}>
        <rect height="10" rx="2" width="10" x="7" y="7" />
        <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4M10 10h4v4h-4z" />
      </svg>
    );
  }

  if (name === 'mold') {
    return (
      <svg {...iconProps}>
        <path d="M5 5h14v4H5zM7 9v8a5 5 0 0 0 10 0V9" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }

  if (name === 'target') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    );
  }

  if (name === 'sliders') {
    return (
      <svg {...iconProps}>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="18" r="2" />
      </svg>
    );
  }

  if (name === 'factory') {
    return (
      <svg {...iconProps}>
        <path d="M3 21V11l6 3V9l6 3V6h3v15H3Z" />
        <path d="M6 17h2M11 17h2M16 17h2M6 20h2M11 20h2M16 20h2" />
      </svg>
    );
  }

  if (name === 'upload') {
    return (
      <svg {...iconProps}>
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      </svg>
    );
  }

  if (name === 'download') {
    return (
      <svg {...iconProps}>
        <path d="M12 5v11" />
        <path d="m7 12 5 5 5-5" />
        <path d="M4 19v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
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

  if (name === 'search') {
    return (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
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
