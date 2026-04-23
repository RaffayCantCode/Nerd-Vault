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

        {/* Recreated mark to match the provided NV gradient logo (no plate). */}
        <path
          d="M20 88V30c0-3.6 4.3-5.3 6.6-3l33.4 33.1V30c0-3.6 4.3-5.3 6.6-3l33.4 33.1V30"
          fill="none"
          stroke="url(#nv-logo-gradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 88V30c0-3.6 4.3-5.3 6.6-3l33.4 33.1V30c0-3.6 4.3-5.3 6.6-3l33.4 33.1V30"
          fill="none"
          stroke="url(#nv-logo-stroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}
