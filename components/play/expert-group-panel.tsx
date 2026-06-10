"use client";

import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayStudentTopBanner,
} from "@/components/play/play-phase-layout";
import { BaseScoreGuideModal } from "@/components/play/base-score-guide-modal";
import { PracticeCompleteSummary } from "@/components/play/practice-complete-summary";
import { PlayScoreModal } from "@/components/play/play-score-modal";
import {
  PracticeQuestionCard,
  type PracticeResult,
} from "@/components/play/practice-question-card";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Button } from "@/components/ui/button";
import {
  computeBaseScoreFromPracticeResults,
  getPracticeQuestions,
  getRoleById,
  PLAYER_MESSAGES,
  toPracticeQuestionResult,
} from "@/lib/activity-pack/engine";
import { practiceBaseScore as practiceQuestionScore } from "@/lib/activity-pack/scoring";
import { codenameForRole } from "@/lib/play/role-codenames";
import type { ActivityPack, PracticeQuestionResult } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  roleId: string | null;
  groupName: string | null;
  roleScopeKey: string;
  onSubmitPractice: (results: PracticeQuestionResult[], baseScore: number) => void | Promise<void>;
  practiceSubmitted?: boolean;
  practiceResults?: PracticeQuestionResult[];
  practiceBaseScore?: number | null;
  pending?: boolean;
  contained?: boolean;
};

const t = activityLayoutType;
const scoreModalTitleId = "expert-practice-score-modal";

export function ExpertPhasePanel({
  pack,
  roleId,
  groupName,
  roleScopeKey,
  onSubmitPractice,
  practiceSubmitted = false,
  practiceResults: savedResults = [],
  practiceBaseScore,
  pending,
  contained = false,
}: Props) {
  const [completed, setCompleted] = useState<Record<string, PracticeQuestionResult>>(() => {
    const map: Record<string, PracticeQuestionResult> = {};
    for (const r of savedResults) map[r.questionId] = r;
    return map;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);

  const role = roleId ? getRoleById(pack, roleId) : undefined;
  const practiceQuestions = useMemo(
    () => (roleId ? getPracticeQuestions(pack, roleId) : []),
    [pack, roleId],
  );

  const roleLabel = useMemo(() => {
    if (!roleId) return "역할";
    return codenameForRole(roleScopeKey, roleId, pack.roles.map((r) => r.id));
  }, [roleId, roleScopeKey, pack.roles]);

  const doneCount = practiceQuestions.filter((q) => completed[q.id]).length;
  const allDone = practiceQuestions.length > 0 && doneCount >= practiceQuestions.length;
  const done = allDone || practiceSubmitted;

  const baseScore = useMemo(() => {
    if (practiceSubmitted && practiceBaseScore != null) return practiceBaseScore;
    const results = practiceQuestions.map((q) => completed[q.id]).filter(Boolean);
    if (results.length !== practiceQuestions.length) return null;
    return computeBaseScoreFromPracticeResults(results);
  }, [practiceSubmitted, practiceBaseScore, practiceQuestions, completed]);

  const phaseComplete = done && baseScore != null;

  const handleQuestionComplete = async (questionId: string, result: PracticeResult) => {
    const entry = toPracticeQuestionResult(questionId, result.wrongAttempts);
    const next = { ...completed, [questionId]: entry };
    setCompleted(next);

    const resultsList = practiceQuestions.map((q) => next[q.id]).filter(Boolean);
    if (resultsList.length < practiceQuestions.length) return;

    setMessage(null);
    setSubmitting(true);
    try {
      const score = computeBaseScoreFromPracticeResults(resultsList);
      await onSubmitPractice(resultsList, score);
      setScoreModalOpen(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlayPhaseShell
      contained={contained}
      topBanner={
        <PlayStudentTopBanner
          phase="expert_group"
          groupName={groupName}
          placeName={roleLabel}
          placeLabel="역할"
          pending={pending}
          contained={contained}
        />
      }
      overlay={
        <>
          {phaseComplete && baseScore != null ? (
            <PlayScoreModal
              open={scoreModalOpen}
              onClose={() => setScoreModalOpen(false)}
              title="2단계 완료!"
              titleId={scoreModalTitleId}
              contained={contained}
            >
              <PracticeCompleteSummary
                baseScore={baseScore}
                onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
              />
            </PlayScoreModal>
          ) : null}
          <BaseScoreGuideModal
            open={baseScoreGuideOpen}
            onClose={() => setBaseScoreGuideOpen(false)}
            contained={contained}
          />
        </>
      }
    >
      <PlayPhasePanel>
        {!role ? (
          <PlayPhaseMessage message={PLAYER_MESSAGES.unknownRole} />
        ) : (
          <>
            <PlayPhaseSection title="내가 맡은 부분" variant="active">
              <p
                className={cn(
                  "whitespace-pre-line rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 leading-relaxed @md:p-6",
                  t.playPanelBody,
                )}
              >
                {role.segment}
              </p>
            </PlayPhaseSection>

            <PlayPhaseSection
              title="연습 문제"
              variant="active"
              headerExtra={
                <div className="flex items-center gap-2">
                  {phaseComplete ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setScoreModalOpen(true)}
                    >
                      점수 보기
                    </Button>
                  ) : null}
                  <PlayPhaseSectionBadge>
                    {doneCount}/{practiceQuestions.length} 문항
                  </PlayPhaseSectionBadge>
                </div>
              }
            >
              <div className="space-y-4">
                {practiceQuestions.map((q) => {
                  const stored = completed[q.id];
                  const initialResult = stored
                    ? {
                        wrongAttempts: stored.wrongAttempts,
                        baseScore: practiceQuestionScore(stored.wrongAttempts),
                      }
                    : null;
                  const locked = practiceSubmitted || Boolean(stored) || submitting;
                  return (
                    <div key={q.id}>
                      <PracticeQuestionCard
                        question={q}
                        onComplete={(r) => handleQuestionComplete(q.id, r)}
                        initialResult={initialResult}
                        disabled={locked && !stored}
                      />
                    </div>
                  );
                })}
              </div>
            </PlayPhaseSection>
            {message ? <PlayPhaseMessage message={message} /> : null}
          </>
        )}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
