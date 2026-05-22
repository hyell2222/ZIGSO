"use client";

import { activityListRow } from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection, PhaseSectionBadge } from "@/components/activity/phase-section-layout";
import { cn } from "@/lib/utils";

type Player = { id: string; nickname: string | null };

type Props = {
  players: Player[];
};

/** 호스트 대기 학생 — 섹션 카드 UI */
export function SessionHostWaitingRoster({ players }: Props) {
  return (
    <PhaseSection
      title="대기 학생"
      heading="section"
      as="h2"
      subtitle="입장했지만 아직 활동이 시작되지 않은 학생입니다."
      headerExtra={<PhaseSectionBadge>{players.length}명</PhaseSectionBadge>}
    >
      {players.length === 0 ? (
        <p className={cn("py-2 text-center", activityLayoutType.bodyMuted)}>아직 없음</p>
      ) : (
        <ul className="flex max-h-56 flex-wrap gap-2 overflow-y-auto overscroll-y-contain pr-1">
          {players.map((p) => (
            <li
              key={p.id}
              className={cn(activityListRow, "inline-flex min-h-9 w-auto items-center gap-1.5")}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden />
              <span className={activityLayoutType.listRowPrimary}>{p.nickname ?? "참가자"}</span>
            </li>
          ))}
        </ul>
      )}
    </PhaseSection>
  );
}
