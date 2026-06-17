"use client";

import { Lightbulb } from "lucide-react";
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

/** 연습 문항 정답·오답 결과 문구 */
export function PlayQuestionResultText({
  children,
  correct,
  className,
}: {
  children: ReactNode;
  correct: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-semibold",
        correct ? "text-[var(--primary)]" : "text-[var(--danger)]",
        t.playPanelBody,
        className,
      )}
    >
      {children}
    </p>
  );
}

/** 연습 문항 오답 힌트 목록 */
export function PlayQuestionHints({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {hints.map((hint, i) => (
        <li key={i} className={cn("flex gap-2", playQuestionNoteClass)}>
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
          <span>{hint}</span>
        </li>
      ))}
    </ul>
  );
}

/** 연습 문항 해설 */
export function PlayQuestionExplanation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(playQuestionNoteClass, "whitespace-pre-wrap", className)}>{children}</p>;
}
