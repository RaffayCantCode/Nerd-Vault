import type { ReactNode } from "react";
import clsx from "clsx";

type SectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ kicker, title, description, actions, className }: SectionHeaderProps) {
  return (
    <header className={clsx("section-header", className)}>
      <div className="section-header-copy">
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h2 className="headline">{title}</h2>
        {description ? <p className="copy">{description}</p> : null}
      </div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </header>
  );
}
