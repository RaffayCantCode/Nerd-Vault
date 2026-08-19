import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";

type UIButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, type = "button", ...props }: UIButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "button",
        variant === "primary" && "button-primary",
        variant === "secondary" && "button-secondary",
        variant === "ghost" && "nv-btn-ghost",
        variant === "accent" && "button-accent",
        className,
      )}
      {...props}
    />
  );
}
