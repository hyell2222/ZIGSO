"use client";

import { BookOpen } from "lucide-react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayPhasePanel,
  PlayPhaseSectionCard,
  playPhaseTwoColumnGrid,
} from "@/components/play/play-phase-layout";
import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { parsePassageSegments } from "@/lib/activity-pack/worksheet";
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

  const worksheet = activityPack?.homeWorksheet;
  const segments = worksheet ? parsePassageSegments(worksheet.summaryPassage) : [];
  const slotCount = worksheet?.slots.length ?? 0;

  return (
    <PlayPhasePanel>
      <div className={playPhaseTwoColumnGrid}>
        <PlayPhaseSectionCard title="활동 안내">
          <p className={t.playPanelLead}>{title ?? "새 활동"}</p>
          <p className={t.playPanelBody}>{description ?? "—"}</p>
          <p
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2",
              t.caption,
            )}
          >
            홈 집단에서 공유 학습지 빈칸을 모두 채우고 제출하세요. 내 단어는 팀원이 넣어 줍니다.
          </p>
        </PlayPhaseSectionCard>

        <PlayPhaseSectionCard
          title="공유 학습지"
          icon={<BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
        >
          {!worksheet?.summaryPassage ? (
            <p className={t.playPanelBody}>학습지 정보가 없습니다.</p>
          ) : (
            <>
              <p className={cn("mb-2", t.playPanelRowMeta)}>
                빈칸 {slotCount}개
              </p>
              <p className={cn("rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2", t.playPanelBody)}>
                {segments.map((seg, i) =>
                  seg.type === "text" ? (
                    <span key={i}>{seg.value}</span>
                  ) : (
                    <span
                      key={i}
                      className="mx-0.5 inline-flex rounded border border-dashed border-[var(--primary)] px-1.5 py-0.5 font-semibold text-[var(--primary)]"
                    >
                      ▢
                    </span>
                  ),
                )}
              </p>
              <p className={cn("mt-2", t.caption)}>
                내 단어는 내 빈칸에 넣을 수 없습니다. 팀원이 도와줍니다.
              </p>
            </>
          )}
        </PlayPhaseSectionCard>
      </div>
    </PlayPhasePanel>
  );
}
