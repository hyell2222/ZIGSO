"use client";

import {
  ActivityPhaseHeader,
  type ActivityPhaseHeaderProps,
} from "@/components/activity/activity-phase-header";

export type PlayPhaseHeaderProps = Omit<
  ActivityPhaseHeaderProps,
  "stepNumber" | "as"
> & {
  /** 1–4 단계 번호 (뱃지·오버라인과 동일) */
  phase?: 1 | 2 | 3 | 4;
};

/** @deprecated 직접 `ActivityPhaseHeader` 사용 가능 */
export function PlayPhaseHeader({ phase, ...props }: PlayPhaseHeaderProps) {
  return <ActivityPhaseHeader stepNumber={phase ?? null} as="h1" {...props} />;
}
