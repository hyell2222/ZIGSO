"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  PlayPhaseCallout,
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayPhaseWaitFootnote,
  playPhaseFormActions,
} from "@/components/play/play-phase-layout";
import {
  QuizQuestionList,
  answersToSelected,
  selectedToAnswers,
} from "@/components/play/quiz-question-list";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Button } from "@/components/ui/button";
import { PLAYER_MESSAGES, gradeQuiz, getTestQuestions } from "@/lib/activity-pack/engine";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";

const t = activityLayoutType;

type Props = {
  pack: ActivityPack;
  groupName: string | null;
  /** 이미 제출한 응답 (있으면 결과 표시) */
  submittedAnswers?: QuizAnswer[];
  submittedAt?: string | null;
  onSubmit: (answers: QuizAnswer[]) => void | Promise<void>;
  onUpdate?: () => void;
  pending?: boolean;
  contained?: boolean;
};

export function IndividualQuizPanel({
  pack,
  groupName,
  submittedAnswers,
  submittedAt,
  onSubmit,
  onUpdate,
  pending,
  contained = false,
}: Props) {
  const questions = useMemo(() => getTestQuestions(pack), [pack]);
  const submitted = Boolean(submittedAt);
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    submittedAnswers ? answersToSelected(submittedAnswers) : {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answers = selectedToAnswers(questions, selected);
  const answeredCount = answers.length;
  const allAnswered = answeredCount >= questions.length && questions.length > 0;

  const grade = useMemo(
    () => gradeQuiz(questions, submittedAnswers ?? []),
    [questions, submittedAnswers],
  );

  const handleSubmit = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await onSubmit(answers);
      onUpdate?.();
      setMessage("개별 형성평가를 제출했어요!");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayPhaseShell
      contained={contained}
      header={{
        phase: 4,
        title: "개별 형성평가",
        description:
          "전체 내용에 대한 실전 문제입니다. 연습과 달리 다시 풀 기회가 없으니 신중히 풀고 한 번에 제출하세요. 기준 점수 대비 향상도로 개인·집단 점수가 정해집니다.",
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={
              submitted ? `${grade.correctCount}/${questions.length}` : `${answeredCount}/${questions.length}`
            }
            placeLabel={submitted ? "정답" : "푼 문항"}
            pending={pending}
            contained={contained}
          />
        ),
      }}
    >
      <PlayPhasePanel>
        {submitted ? (
          <PlayPhaseCallout title="제출 완료" centered>
            <p className={t.playPanelCalloutBody}>
              실전 {grade.correctCount}/{questions.length} 정답. 순위는 최종 순위 단계에서 확인할 수 있어요.
            </p>
            <PlayPhaseWaitFootnote className="mt-4" />
          </PlayPhaseCallout>
        ) : (
          <PlayPhaseSection
            title="실전 문제"
            variant="active"
            headerExtra={
              <PlayPhaseSectionBadge>
                {answeredCount}/{questions.length} 문항
              </PlayPhaseSectionBadge>
            }
          >
            <QuizQuestionList
              questions={questions}
              selected={selected}
              onSelect={(qid, ci) => setSelected((prev) => ({ ...prev, [qid]: ci }))}
              disabled={busy}
            />
            <p className={`mt-4 ${t.playPanelBody}`}>
              {allAnswered
                ? "답을 모두 골랐어요. 제출 후에는 수정할 수 없어요."
                : "모든 문항에 답하면 제출할 수 있어요. 실전 문제는 한 번만 응시합니다."}
            </p>
            <div className={playPhaseFormActions}>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy || !allAnswered}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    제출 중…
                  </>
                ) : (
                  "개별 형성평가 제출"
                )}
              </Button>
            </div>
          </PlayPhaseSection>
        )}

        {message ? (
          <PlayPhaseMessage message={message} success={message.includes("제출")} />
        ) : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
