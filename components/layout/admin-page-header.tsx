import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  /** 상단 라벨 (예: 세션 보고서, 사건) */
  eyebrow?: string;
  /** 본문 제목 */
  title: ReactNode;
  /** `title`에 추가 클래스 (예: 사건명 모노·강조) */
  titleClassName?: string;
  /** h1 권장 — 동일 레벨 페이지에서 통일 */
  titleAs?: "h1" | "h2";
  description?: ReactNode;
  /** 제목 줄 오른쪽 액션(버튼 등) */
  actions?: ReactNode;
  className?: string;
};

/**
 * 관리자 본문 상단 제목 블록 — 사건 목록·세션 보고서 등 동일한 톤.
 */
export function PageHeader({
  eyebrow,
  title,
  titleClassName,
  titleAs = "h1",
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  const Heading = titleAs === "h2" ? "h2" : "h1";
  return (
    <header className={cn("space-y-1 pb-6", className)}>
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
