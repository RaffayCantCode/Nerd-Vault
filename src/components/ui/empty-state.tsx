import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel, children, className }: EmptyStateProps) {
  return (
    <div className={clsx("empty-state", className)}>
      <div className="empty-state-body">
        <p className="eyebrow">Empty</p>
        <h2 className="headline">{title}</h2>
        <p className="copy">{description}</p>
      </div>
      {children}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="button button-primary empty-state-action">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
