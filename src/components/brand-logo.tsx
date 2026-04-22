type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo" }: BrandLogoProps) {
  return (
    <span className={`brand-logo-shell ${className ?? ""}`.trim()} role="img" aria-label={alt}>
      <svg className="brand-logo-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="nv-logo-gradient" x1="16" y1="20" x2="102" y2="98" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#d290ff" />
            <stop offset="0.38" stopColor="#8b5cff" />
            <stop offset="0.72" stopColor="#5c80ff" />
            <stop offset="1" stopColor="#39b8ff" />
          </linearGradient>
          <linearGradient id="nv-logo-stroke" x1="14" y1="16" x2="104" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0.82)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.18)" />
          </linearGradient>
        </defs>

        <rect x="8" y="8" width="104" height="104" rx="28" className="brand-logo-plate" />

        <path
          d="M24 85V34c0-4.4 5.3-6.6 8.4-3.6l27.1 27.1V34c0-4.4 5.3-6.6 8.4-3.6l16.5 16.2V34c0-4.4 5.3-6.6 8.4-3.6 3.1 3 3.1 8.1 0 11.1L68 86c-3 3-7.9 3-10.9.1L39.6 68.8V85c0 4.7-3.5 8-7.8 8-4.3 0-7.8-3.3-7.8-8Z"
          fill="url(#nv-logo-gradient)"
        />
        <path
          d="M24 85V34c0-4.4 5.3-6.6 8.4-3.6l27.1 27.1V34c0-4.4 5.3-6.6 8.4-3.6l16.5 16.2V34c0-4.4 5.3-6.6 8.4-3.6 3.1 3 3.1 8.1 0 11.1L68 86c-3 3-7.9 3-10.9.1L39.6 68.8V85c0 4.7-3.5 8-7.8 8-4.3 0-7.8-3.3-7.8-8Z"
          fill="none"
          stroke="url(#nv-logo-stroke)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}
