"use client";

import { activityTeacherPresenceChip } from "@/lib/theme/activity-layout-chrome";
import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { cn } from "@/lib/utils";

type Player = { id: string; nickname: string | null };

type Props = {
  players: Player[];
};

/** 호스트 대기 학생 목록 — 본문 상단 중앙 */
export function SessionHostWaitingRoster({ players }: Props) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center self-center">
      {players.length === 0 ? (
        <p className={cn("py-1 text-center", activityLayoutType.bodyMuted)}>
          아직 입장한 학생이 없습니다.
        </p>
      ) : (
        <ul className="flex w-full flex-wrap items-start justify-center gap-2 px-1">
          {players.map((p) => (
            <li key={p.id} className={activityTeacherPresenceChip}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden />
              <span className={activityLayoutType.listRowPrimary}>
                {p.nickname ?? "참가자"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
