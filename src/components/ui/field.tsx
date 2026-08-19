import type { ReactNode } from "react";
import clsx from "clsx";

type FieldProps = {
  label: string;
  help?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ label, help, error, className, children }: FieldProps) {
  return (
    <label className={clsx("field", className)}>
      <span className={clsx("eyebrow", "field-label", error && "is-error")}>
        {label}
      </span>
      {children}
      {help ? <span className="copy field-feedback">{error || help}</span> : null}
      {error ? <span className="copy field-feedback is-error">{error}</span> : null}
    </label>
  );
}
