interface IconProps {
  className?: string;
}

const common = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  'aria-hidden': true,
} as const;

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3" y="3" width="6" height="6" rx="1.3" {...stroke} />
      <rect x="11" y="3" width="6" height="6" rx="1.3" {...stroke} />
      <rect x="3" y="11" width="6" height="6" rx="1.3" {...stroke} />
      <rect x="11" y="11" width="6" height="6" rx="1.3" {...stroke} />
    </svg>
  );
}

export function PatientsIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="10" cy="6.5" r="3" {...stroke} />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" {...stroke} />
    </svg>
  );
}

export function LabsIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 3h4M8.5 3v4.5L4.5 15a2 2 0 0 0 1.8 3h7.4a2 2 0 0 0 1.8-3l-4-7.5V3" {...stroke} />
      <path d="M6.5 12h7" {...stroke} />
    </svg>
  );
}

export function NcdcIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M10 3.5 2.5 16h15L10 3.5Z" {...stroke} />
      <path d="M10 8.3v3.3" {...stroke} />
      <path d="M10 14.2h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function PharmacyIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3" y="3" width="14" height="14" rx="3" {...stroke} />
      <path d="M10 6.5v7M6.5 10h7" {...stroke} />
    </svg>
  );
}

export function BillingIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3.5" y="4" width="13" height="12" rx="1.5" {...stroke} />
      <path d="M6.5 8h7M6.5 11h7M6.5 14h4" {...stroke} />
    </svg>
  );
}

export function StaffIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="7.3" cy="7" r="2.3" {...stroke} />
      <path d="M2.5 16.2c0-2.6 2.1-4.7 4.8-4.7s4.8 2.1 4.8 4.7" {...stroke} />
      <circle cx="14.7" cy="7.3" r="1.9" {...stroke} />
      <path d="M12.9 11.5c.5-.2 1.1-.3 1.8-.3 2.3 0 4.2 1.8 4.2 4.1" {...stroke} />
    </svg>
  );
}

export function ChevronCollapseIcon({ className }: IconProps) {
  return (
    <svg {...common} width={16} height={16} className={className}>
      <path d="M12.5 4.5 7 10l5.5 5.5" {...stroke} />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...common} width={18} height={18} className={className}>
      <path d="M5 5l10 10M15 5 5 15" {...stroke} />
    </svg>
  );
}

export function ReferenceIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H15v14H5.5A1.5 1.5 0 0 0 4 18.5v-14Z" {...stroke} />
      <path d="M7 7h6M7 10h6" {...stroke} />
    </svg>
  );
}
