type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo" }: BrandLogoProps) {
  return (
    <span className={`brand-logo-shell ${className ?? ""}`.trim()}>
      <img className="brand-logo-image" src="/logo1.png" alt={alt} loading="eager" decoding="async" />
    </span>
  );
}
