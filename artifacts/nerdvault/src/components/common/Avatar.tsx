import React from "react";

export function Avatar({
  initials,
  tone = "teal",
  image,
  size = "md",
}: {
  initials: string;
  tone?: "teal" | "green" | "orange" | "violet";
  image?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const tones = {
    teal: "from-[#53d6bc] to-[#237c78]",
    green: "from-[#b3dc97] to-[#5e9475]",
    orange: "from-[#e9ad78] to-[#995e53]",
    violet: "from-[#bca7e6] to-[#67578e]",
  };

  const sizes = {
    sm: "h-7 w-7 text-[9px]",
    md: "h-8 w-8 text-[10px]",
    lg: "h-12 w-12 text-[14px]",
    xl: "h-20 w-20 text-2xl rounded-3xl",
  };

  const roundedClass = size === "xl" ? "rounded-3xl" : "rounded-full";

  if (image) {
    return (
      <img
        src={image}
        alt={initials}
        className={`${sizes[size]} shrink-0 ${roundedClass} object-cover ring-2 ring-[#11171b]`}
      />
    );
  }

  return (
    <span
      data-testid={`img-avatar-${initials.toLowerCase()}`}
      className={`grid shrink-0 place-items-center ${roundedClass} bg-gradient-to-br ${tones[tone]} font-extrabold text-[#101519] ring-2 ring-[#11171b] ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
