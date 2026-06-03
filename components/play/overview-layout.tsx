"use client";

import { ListChecks } from "lucide-react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayPhasePanel,
  PlayPhaseSectionCard,
  playPhaseTwoColumnGrid,
} from "@/components/play/play-phase-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { getTestQuestions } from "@/lib/activity-pack/engine";
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

  const testCount = activityPack ? getTestQuestions(activityPack).length : 0;

  const steps = [
    {
      step: 1,
      title: "전문가 집단",
      body: "같은 역할끼리 모여 내 지문을 이해하고, 연습 문제를 모두 풉니다(문항마다 3번·힌트). 문항 점수 평균이 기준 점수입니다.",
    },
    {
      step: 2,
      title: "홈 집단",
      body: "모둠으로 돌아와 모든 모둠원의 지문과 연습 문제를 보며 서로 설명합니다.",
    },
    {
      step: 3,
      title: "개별 형성평가",
      body: `모든 역할의 실전 문제 ${testCount}문항을 한 번만 풉니다. 기준 점수 대비 향상도로 개인·집단 점수를 받습니다.`,
    },
  ];

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
            지문을 나눠 연습으로 기준 점수를 정하고, 실전 문제로 향상 점수(개인·집단)를 산출합니다.
          </p>
        </PlayPhaseSectionCard>

        <PlayPhaseSectionCard
          title="활동 흐름"
          icon={<ListChecks className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
        >
          <ol className="space-y-2">
            {steps.map((s) => (
              <li
                key={s.step}
                className={cn(
                  "flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2",
                  t.playPanelBody,
                )}
              >
                <span className="font-semibold text-[var(--accent)]">{s.step}.</span>
                <span>
                  <span className="font-medium">{s.title}</span> — {s.body}
                </span>
              </li>
            ))}
          </ol>
        </PlayPhaseSectionCard>
      </div>
    </PlayPhasePanel>
  );
}
