import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo", priority = false }: BrandLogoProps) {
  return (
    <span className={`brand-mark-logo-unified ${className ?? ""}`.trim()}>
      <Image
        src="/brand/logo-mark-clean.svg"
        alt={alt}
        width={56}
        height={56}
        priority={priority}
        className="brand-logo-unified-image"
      />
    </span>
  );
}
