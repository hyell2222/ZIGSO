"use client";

import { ListChecks } from "lucide-react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionCard,
  PlayPhaseWaitFootnote,
  playPhaseTwoColumnGrid,
} from "@/components/play/play-phase-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

type Props = {
  loading: boolean;
  title: string | null;
  description: string | null;
  activityPack: ActivityPack | null;
};

const t = activityLayoutType;

export function ActivityIntroductionLayout({
  loading,
  title,
  description,
  activityPack,
}: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[min(20rem,46dvh)] flex-1 flex-col items-center justify-center py-6">
        <LoadingState variant="section" tone="play" label="불러오는 중…" />
      </div>
    );
  }

  return (
    <PlayPhasePanel>
      <div className={playPhaseTwoColumnGrid}>
        <PlayPhaseSectionCard title="활동 안내">
          <p className={t.playPanelLead}>{title ?? PLAYER_MESSAGES.defaultPackTitle}</p>
          <p className={t.playPanelBody}>{description ?? "—"}</p>
          <p
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2",
              t.caption,
            )}
          >
            {PLAY_STUDENT_COPY.intro.timeClue}
          </p>
        </PlayPhaseSectionCard>

        <PlayPhaseSectionCard
          title="해결할 미션"
          icon={<ListChecks className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
        >
          {!activityPack?.tasks?.length ? (
            <p className={t.playPanelBody}>미션 정보가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {activityPack.tasks.map((ch) => (
                <li
                  key={ch.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={t.playPanelRow}>{ch.title}</span>
                    {ch.acceptedItemIds.length > 0 ? (
                      <span className={t.playPanelRowMeta}>
                        필수 제출 {ch.acceptedItemIds.length}개
                      </span>
                    ) : null}
                  </div>
                  {ch.description ? (
                    <p className={cn("mt-1", t.caption)}>{ch.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PlayPhaseSectionCard>
      </div>

      <PlayPhaseSection title="선생님 안내">
        <PlayPhaseWaitFootnote />
      </PlayPhaseSection>
    </PlayPhasePanel>
  );
}
