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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-light uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {eyebrow}
            </p>
          ) : null}
          <Heading
            className={cn(
              "text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl",
              titleClassName,
            )}
          >
            {title}
          </Heading>
          {description ? (
            <div className="pt-0.5 text-base font-normal leading-relaxed text-[var(--muted-foreground)]">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
