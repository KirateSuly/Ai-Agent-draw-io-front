type IconProps = {
  className?: string;
};

function baseProps(className: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function SparklesIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15.5v4M17 17.5h4" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function LogOutIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function TrashIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14H5V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function SendIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

export function DownloadIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M12 3v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function SaveIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M8 3v5h8V3" />
      <path d="M7 21v-7h10v7" />
    </svg>
  );
}

export function FolderOpenIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M12 16v-5" />
      <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
    </svg>
  );
}

export function RefreshIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)} strokeWidth={2}>
      <path d="M20 11a8 8 0 1 0-2.35 5.65" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function DiagramIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="6" height="5" rx="1.5" />
      <rect x="15" y="16" width="6" height="5" rx="1.5" />
      <path d="M9 5.5h5a2 2 0 0 1 2 2V16" />
      <path d="M6 8v6a2 2 0 0 0 2 2h7" />
    </svg>
  );
}
