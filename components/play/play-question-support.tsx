"use client";

import type { ReactNode } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

/** 학습 지문 — 에디터 입력(앞띄어쓰기·줄바꿈) 그대로 표시 */
export const playSegmentTextClass = cn(
  "whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 leading-relaxed @md:p-5",
  t.playPanelBody,
);

export function PlaySegmentText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(playSegmentTextClass, className)}>{children}</p>;
}

/** 문항 발문·해설 등 — 앞띄어쓰기·줄바꿈 유지 */
export const playPreservedTextClass = cn("whitespace-pre-wrap", t.playPanelBody);

const playQuestionNoteClass = cn(
  "rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2",
  t.caption,
);

/** 연습·실전 문항 보조 안내 (제출 전 안내 문구) */
export function PlayQuestionHelperText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(t.caption, className)}>{children}</p>;
}

/** 연습 문항 해설 */
export function PlayQuestionExplanation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(playQuestionNoteClass, "whitespace-pre-wrap", className)}>{children}</div>;
}
