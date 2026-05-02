import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  titleClassName?: string;
  titleAs?: "h1" | "h2";
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  titleClassName,
  titleAs = "h1",
  description,
  actions,
  className,
}: PageHeaderProps) {
  const Heading = titleAs === "h2" ? "h2" : "h1";
  return (
    <header className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {eyebrow}
            </p>
          ) : null}
          <Heading
            className={cn(
              "text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.65rem]",
              titleClassName,
            )}
          >
            {title}
          </Heading>
          {description ? (
            <div className="pt-0.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
