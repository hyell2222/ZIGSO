"use client";

import type { ReactNode } from "react";

import {
  playPhasePanelStack,
  playPhaseSectionBody,
  playPhaseSectionHeader,
  playPhaseSectionShell,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

export type PhaseSectionVariant = "default" | "active";

export type PhaseSectionHeading = "panel" | "section";

function sectionTitleClass(heading: PhaseSectionHeading) {
  return heading === "section" ? t.sectionTitle : t.playPanelSection;
}

/** 학생·교사 공통 — 섹션 카드 세로 스택 */
export function PhaseSectionPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(playPhasePanelStack, className)}>{children}</div>;
}

/** 모달과 동일한 헤더 바 + 본문 카드 */
export function PhaseSection({
  title,
  children,
  className,
  headerExtra,
  icon,
  variant = "default",
  titleId,
  heading = "panel",
  subtitle,
  as: HeadingTag = "h3",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  icon?: ReactNode;
  variant?: PhaseSectionVariant;
  titleId?: string;
  /** 교사 대시보드는 `section` (더 큰 제목) */
  heading?: PhaseSectionHeading;
  subtitle?: string;
  as?: "h2" | "h3";
}) {
  return (
    <section
      className={cn(
        playPhaseSectionShell,
        variant === "active" &&
          "border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_10%,transparent)]",
        className,
      )}
    >
      <div className={playPhaseSectionHeader}>
        <div className="min-w-0 flex-1">
          <HeadingTag
            id={titleId}
            className={cn(sectionTitleClass(heading), icon && "flex items-center gap-2")}
          >
            {icon}
            {title}
          </HeadingTag>
          {subtitle ? <p className={cn("mt-0.5", t.sectionSubtitle)}>{subtitle}</p> : null}
        </div>
        {headerExtra ? <div className="shrink-0 self-start">{headerExtra}</div> : null}
      </div>
      <div className={playPhaseSectionBody}>{children}</div>
    </section>
  );
}

export function PhaseSectionBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2.5 py-0.5 tabular-nums",
        t.caption,
        "font-medium text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PhaseSectionMessage({
  message,
  success = false,
  className,
}: {
  message: string;
  success?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        t.playPanelMessage,
        success ? "text-[var(--primary)]" : "text-[var(--danger)]",
        className,
      )}
    >
      {message}
    </p>
  );
}

export const phaseSectionFormActions = "flex w-full justify-end pt-2";
