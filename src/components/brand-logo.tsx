import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({ className, alt = "NerdVault logo", priority = false }: BrandLogoProps) {
  return (
    <span className={`brand-logo-shell ${className ?? ""}`.trim()}>
      <Image
        src="/logo1.png"
        alt={alt}
        fill
        priority={priority}
        sizes="80px"
        className="brand-logo-image"
      />
    </span>
  );
}
