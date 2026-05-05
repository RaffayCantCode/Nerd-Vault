type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo" }: BrandLogoProps) {
  return (
    <span className={`brand-mark-logo-unified ${className ?? ""}`.trim()}>
      <span className="brand-logo-unified-mark">NV</span>
    </span>
  );
}
