"use client";

import { activityListRow, activitySectionCard } from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

type Player = { id: string; nickname: string | null };

type Props = {
  players: Player[];
};

/** 호스트 대기 학생 칩 — `app/sessions`·샌드박스 동일 마크업 */
export function SessionHostWaitingRoster({ players }: Props) {
  return (
    <section className={activitySectionCard}>
      <p className={activityLayoutType.sectionTitle}>대기 학생</p>
      {players.length === 0 ? (
        <p className="py-2 text-center text-sm text-[var(--muted-foreground)]">아직 없음</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
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
    </section>
  );
}
