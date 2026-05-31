"use client";

import { activityListRow } from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection, PhaseSectionBadge } from "@/components/activity/phase-section-layout";
import { COPY_DEFAULTS } from "@/lib/copy/defaults";
import { HOST_COPY } from "@/lib/copy/teacher";
import { cn } from "@/lib/utils";

type Player = { id: string; nickname: string | null };

type Props = {
  players: Player[];
};

/** 호스트 대기 학생 — 섹션 카드 UI */
export function SessionHostWaitingRoster({ players }: Props) {
  return (
    <PhaseSection
      title={HOST_COPY.waitingRosterTitle}
      heading="section"
      as="h2"
      subtitle={HOST_COPY.waitingRosterSubtitle}
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
              <span className={activityLayoutType.listRowPrimary}>
                {p.nickname ?? COPY_DEFAULTS.participant}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PhaseSection>
  );
}
