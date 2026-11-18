/**
 * Comrade Hub Kenya — Logo
 * Kenyan shield with green/black/white stripes + red accent.
 * Pure SVG, ~1KB, no external requests.
 */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Comrade Hub Kenya"
    >
      {/* Shield shape */}
      <path
        d="M24 3 L42 10 V24 C42 35 34 43 24 46 C14 43 6 35 6 24 V10 Z"
        fill="#0B6B3A"
        stroke="#0A0A0A"
        strokeWidth="1.5"
      />
      {/* Black stripe */}
      <path
        d="M24 3 L42 10 V18 H6 V10 Z"
        fill="#0A0A0A"
      />
      {/* White center band */}
      <path
        d="M6 18 H42 V28 H6 Z"
        fill="#FFFFFF"
      />
      {/* Red band (Kenyan flag inspired) */}
      <path
        d="M6 28 H42 V30 H6 Z"
        fill="#B3261E"
      />
      {/* Inner emblem — subtle C for Comrade */}
      <circle cx="24" cy="23" r="6" fill="none" stroke="#0B6B3A" strokeWidth="2" />
      <path d="M27 20 C25 18 22 18 21 21 C20 24 22 27 25 27 C27 27 28 26 28 25" stroke="#0B6B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function LogoWordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <div className="leading-tight">
        <div className="font-bold text-[15px] tracking-tight">Comrade Hub</div>
        <div className="text-[10px] font-medium text-brand-green tracking-widest uppercase">Kenya</div>
      </div>
    </div>
  );
}
