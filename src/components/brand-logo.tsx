type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo", priority = false }: BrandLogoProps) {
  return (
    <span className={`brand-mark-logo-unified ${className ?? ""}`.trim()}>
      <img
        src="/brand/logo-mark-clean.svg"
        alt={alt}
        width={56}
        height={56}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="brand-logo-unified-image"
      />
    </span>
  );
}
