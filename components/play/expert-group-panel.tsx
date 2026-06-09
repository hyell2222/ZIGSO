"use client";

import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseWaitFootnote,
  PlayStudentTopBanner,
} from "@/components/play/play-phase-layout";
import {
  PracticeQuestionCard,
  type PracticeResult,
} from "@/components/play/practice-question-card";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
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
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const phaseComplete = done && baseScore != null;

  return (
    <PlayPhaseShell
      contained={contained}
      topBanner={
        <PlayStudentTopBanner
          phase="expert_group"
          groupName={groupName}
          placeName={
            phaseComplete
              ? `${baseScore}점`
              : doneCount > 0
                ? `${doneCount}/${practiceQuestions.length || "—"}`
                : roleLabel
          }
          placeLabel={
            phaseComplete ? "기준 점수" : doneCount > 0 ? "연습 완료" : "역할"
          }
          pending={pending}
          contained={contained}
          completeTitle={phaseComplete ? "2단계 완료!" : undefined}
          completeMessage={
            phaseComplete
              ? `기준 점수 ${baseScore}점 — 연습 ${practiceQuestions.length}문항 평균. 다음은 서로 알려주기 단계에서 모둠원에게 내용과 풀이를 설명할 차례예요.`
              : undefined
          }
        />
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

            <PlayPhaseSection title="연습 문제">
              <p className={cn("mb-3", t.playPanelHint)}>
                문항마다 최대 3번, 틀릴 때마다 힌트와 감점이 적용됩니다.
              </p>
              <div className="space-y-4">
                {practiceQuestions.map((q, qi) => {
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
                      <p className={cn("mb-2 font-medium", t.caption)}>
                        연습 {qi + 1}/{practiceQuestions.length}
                      </p>
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

            {done && baseScore != null ? <PlayPhaseWaitFootnote className="mt-2" /> : null}

            {message ? <PlayPhaseMessage message={message} /> : null}
          </>
        )}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
