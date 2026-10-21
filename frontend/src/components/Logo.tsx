interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

/** Vitalis mark: a pulse/EKG line, used as the favicon and in-app logo. */
export default function Logo({ size = 28, withWordmark = false }: LogoProps) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0f766e" />
      <path
        d="M4 16H10L13 8L17 24L20 12L23 16H28"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className="logo-lockup">
      {mark}
      <span className="logo-wordmark">Vitalis</span>
    </span>
  );
}
