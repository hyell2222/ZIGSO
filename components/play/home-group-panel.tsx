"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayStudentTopBanner } from "@/components/play/play-student-top-banner";
import {
  PhaseSectionPanel as PlayPhasePanel,
  PhaseSection as PlayPhaseSection,
  PhaseSectionBadge as PlayPhaseSectionBadge,
  PhaseSectionMessage as PlayPhaseMessage,
} from "@/components/activity/phase-section-layout";
import { PlaySegmentText, PlayQuestionExplanation } from "@/components/play/play-question-support";
import { PracticeQuestionCard, type PracticeResult } from "@/components/play/practice-question-card";
import { BaseScoreGuideModal } from "@/components/play/base-score-guide-modal";
import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { ScoreTile } from "@/components/play/score-tile";
import { GuideInfoModal } from "@/components/play/guide-info-modal";
import { LoadingState } from "@/components/ui/loading-state";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { PlayerSelfRow } from "@/lib/api/play";
import {
  computeBaseScoreFromPracticeResults,
  getPeerPracticeQuestions,
  getRoleById,
  isPeerPracticeComplete,
  PLAYER_MESSAGES,
} from "@/lib/activity-pack/engine";
import { LOADING_COPY } from "@/lib/activity-phases";
import { codenameForRole } from "@/lib/play/role-codenames";
import { practiceBaseScore as practiceQuestionScore } from "@/lib/activity-pack/scoring";
import type { ActivityPack, PracticeQuestionResult } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

const playChipClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";

export type GroupMember = Pick<
  PlayerSelfRow,
  "id" | "nickname" | "assigned_role_id" | "created_at"
>;

type PracticeCompleteSummaryProps = {
  baseScore: number;
  onOpenBaseScoreGuide: () => void;
};

function PracticeCompleteSummary({ baseScore, onOpenBaseScoreGuide }: PracticeCompleteSummaryProps) {
  return (
    <ScoreTile
      label="기준 점수"
      value={`${baseScore}점`}
      highlight
      labelExtra={
        <ScoreGuideHelpButton ariaLabel="기준 점수 안내" onClick={onOpenBaseScoreGuide} />
      }
    />
  );
}

type Props = {
  pack: ActivityPack;
  groupName: string | null;
  playerId: string | null;
  ownRoleId: string | null;
  members: GroupMember[];
  roleScopeKey: string;
  peerPracticeCompleted?: string[];
  practiceResults?: PracticeQuestionResult[];
  baseScore?: number | null;
  homeGroupCompletedAt?: string | null;
  onPeerQuestionComplete?: (
    questionId: string,
    wrongAttempts: number,
    wrongChoices?: number[],
    viewedHint1?: boolean,
    viewedHint2?: boolean
  ) => void | Promise<void>;
  onEnsureHomeGroupComplete?: () => void | Promise<void>;
  pending?: boolean;
};

export function GroupPhasePanel({
  pack,
  groupName,
  playerId,
  ownRoleId,
  members,
  roleScopeKey,
  peerPracticeCompleted = [],
  practiceResults = [],
  baseScore = null,
  homeGroupCompletedAt,
  onPeerQuestionComplete,
  onEnsureHomeGroupComplete,
  pending,
}: Props) {
  const [completed, setCompleted] = useState<Record<string, true>>(() => {
    const map: Record<string, true> = {};
    for (const id of peerPracticeCompleted) map[id] = true;
    return map;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ownPracticeResults = useMemo(() => {
    const map: Record<string, PracticeQuestionResult> = {};
    for (const r of practiceResults) map[r.questionId] = r;
    return map;
  }, [practiceResults]);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, { hint1: string; hint2: string; explanation: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const resolvedBaseScore = useMemo(() => {
    if (baseScore !== null && baseScore !== undefined) return baseScore;
    return computeBaseScoreFromPracticeResults(practiceResults);
  }, [baseScore, practiceResults]);

  const showResultModal = Boolean(homeGroupCompletedAt || justSubmitted);

  const roleLabelFor = useMemo(() => {
    const roleIds = pack.roles.map((r) => r.id);
    return (roleId: string | null) =>
      roleId ? codenameForRole(roleScopeKey, roleId, roleIds) : "—";
  }, [pack.roles, roleScopeKey]);

  const memberRoleIds = useMemo(
    () => members.map((m) => m.assigned_role_id),
    [members],
  );

  const myPracticeQuestions = useMemo(() => {
    if (!ownRoleId) return [];
    return getRoleById(pack, ownRoleId)?.practiceQuestions ?? [];
  }, [pack, ownRoleId]);

  const peerQuestions = useMemo(
    () => getPeerPracticeQuestions(pack, memberRoleIds, ownRoleId),
    [pack, memberRoleIds, ownRoleId],
  );

  const allPracticeQuestions = useMemo(() => {
    return [...myPracticeQuestions, ...peerQuestions];
  }, [myPracticeQuestions, peerQuestions]);

  const allPeerDone =
    isPeerPracticeComplete(peerQuestions, Object.keys(completed)) ||
    Boolean(homeGroupCompletedAt);

  const allExplanationsLoaded = useMemo(() => {
    return allPracticeQuestions.every((q) => aiExplanations[q.id]);
  }, [allPracticeQuestions, aiExplanations]);

  const [loadingExplanations, setLoadingExplanations] = useState(false);

  const fetchAllExplanations = useCallback(async () => {
    setLoadingExplanations(true);
    const newExplanations: Record<string, { hint1: string; hint2: string; explanation: string }> = { ...aiExplanations };

    try {
      const promises = allPracticeQuestions.map(async (q) => {
        if (newExplanations[q.id]) return;

        const role = pack.roles.find((r) => r.practiceQuestions.some((pq) => pq.id === q.id));
        const segment = role?.segment;
        if (!segment) {
          newExplanations[q.id] = { hint1: "", hint2: "", explanation: "지문을 찾을 수 없어 해설을 생성할 수 없습니다." };
          return;
        }

        const result = ownPracticeResults[q.id];
        const wrongChoices = result?.wrongChoices ?? [];

        try {
          const res = await fetch("/api/ai/explain/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              passage: segment,
              question: q.prompt,
              choices: q.choices,
              correctIndex: q.correctIndex,
              wrongChoices,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            newExplanations[q.id] = data;
          } else {
            newExplanations[q.id] = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
          }
        } catch (err) {
          console.error(`Failed to fetch AI explanation for question ${q.id}:`, err);
          newExplanations[q.id] = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
        }
      });

      await Promise.all(promises);
      setAiExplanations((prev) => ({ ...prev, ...newExplanations }));
    } catch (e) {
      console.error("Failed to fetch AI explanations:", e);
    } finally {
      setLoadingExplanations(false);
    }
  }, [allPracticeQuestions, pack.roles, ownPracticeResults, aiExplanations]);

  useEffect(() => {
    if (!showResultModal || loadingExplanations) return;
    const missing = allPracticeQuestions.some((q) => !aiExplanations[q.id]);
    if (missing) {
      void fetchAllExplanations();
    }
  }, [showResultModal, loadingExplanations, aiExplanations, allPracticeQuestions, fetchAllExplanations]);

  const handlePeerComplete = useCallback(
    async (questionId: string, result: PracticeResult) => {
      if (completed[questionId] || homeGroupCompletedAt) return;
      setMessage(null);
      setBusyId(questionId);
      try {
        await onPeerQuestionComplete?.(
          questionId,
          result.wrongAttempts,
          result.wrongChoices,
          result.viewedHint1,
          result.viewedHint2
        );
        const nextCompleted: Record<string, true> = { ...completed, [questionId]: true };
        setCompleted(nextCompleted);

        const isNowAllDone = isPeerPracticeComplete(peerQuestions, Object.keys(nextCompleted));
        if (isNowAllDone && !homeGroupCompletedAt) {
          setSubmitting(true);
          try {
            await onEnsureHomeGroupComplete?.();
            setJustSubmitted(true);
            setScoreModalOpen(true);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : PLAYER_MESSAGES.operationFailed);
          } finally {
            setSubmitting(false);
          }
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
        throw e;
      } finally {
        setBusyId(null);
      }
    },
    [completed, homeGroupCompletedAt, onPeerQuestionComplete, peerQuestions, onEnsureHomeGroupComplete],
  );


  useEffect(() => {
    if (allPeerDone && !homeGroupCompletedAt && peerQuestions.length === 0) {
      void onEnsureHomeGroupComplete?.();
    }
  }, [allPeerDone, homeGroupCompletedAt, peerQuestions.length, onEnsureHomeGroupComplete]);

  const cards = useMemo(
    () =>
      members.map((m) => ({
        key: m.id,
        nickname: m.nickname ?? "팀원",
        roleId: m.assigned_role_id,
        isMe: m.id === playerId,
      })),
    [members, playerId],
  );

  const defaultMemberId = useMemo(() => {
    const me = cards.find((c) => c.isMe);
    return me?.key ?? cards[0]?.key ?? "";
  }, [cards]);

  const [activeMemberId, setActiveMemberId] = useState(defaultMemberId);

  const resolvedMemberId = cards.some((c) => c.key === activeMemberId)
    ? activeMemberId
    : defaultMemberId;

  const activeCard = cards.find((c) => c.key === resolvedMemberId) ?? cards[0];
  const activeRole = activeCard?.roleId ? getRoleById(pack, activeCard.roleId) : undefined;
  const practiceQuestions = activeRole?.practiceQuestions ?? [];
  const practiceDoneCount = practiceQuestions.filter(
    (pq) => activeCard?.isMe || completed[pq.id] || homeGroupCompletedAt,
  ).length;
  const segmentTitle = activeCard?.isMe
    ? "내가 맡은 부분"
    : `${roleLabelFor(activeCard?.roleId ?? null)} · ${activeCard?.nickname ?? "팀원"}`;

  const memberPeerDone = useCallback(
    (card: (typeof cards)[number]) => {
      if (card.isMe) return true;
      const role = card.roleId ? getRoleById(pack, card.roleId) : undefined;
      if (!role) return false;
      return role.practiceQuestions.every(
        (pq) => completed[pq.id] || homeGroupCompletedAt,
      );
    },
    [pack, completed, homeGroupCompletedAt],
  );

  return (
    <PlayPhaseShell
      topBanner={
        <PlayStudentTopBanner
          phase="home_group"
          groupName={groupName}
          placeName={roleLabelFor(ownRoleId)}
          placeLabel="역할"
          pending={pending}
        />
      }
      overlay={
        <>
          {showResultModal && resolvedBaseScore != null ? (
            <GuideInfoModal
              open={scoreModalOpen}
              onClose={() => setScoreModalOpen(false)}
              title="3단계 완료!"
              titleId="home-practice-score-modal"
            >
              {!allExplanationsLoaded ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">결과 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PracticeCompleteSummary
                    baseScore={resolvedBaseScore}
                    onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
                  />

                  <div className="border-t border-[var(--border)] pt-4 space-y-6">
                    <h3 className="text-sm font-semibold mb-3">연습 문제 해설</h3>
                    {allPracticeQuestions.map((q, idx) => {
                      const aiResult = aiExplanations[q.id];
                      const result = ownPracticeResults[q.id];
                      const isCorrect = result ? result.wrongAttempts < 3 : false;
                      const isMyQuestion = myPracticeQuestions.some((mq) => mq.id === q.id);
                      return (
                        <div key={q.id} className="space-y-2 border-b border-[var(--border)] pb-4 last:border-b-0">
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0",
                                isMyQuestion
                                  ? "bg-gray-50 text-gray-600 border-gray-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              )}>
                                {isMyQuestion ? "내 문제" : "모둠원 문제"}
                              </span>
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 mt-0.5",
                                isCorrect
                                  ? "bg-[var(--tint-primary-weak)] text-[var(--primary)] border-[var(--primary)]/20"
                                  : "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                              )}>
                                {isCorrect ? "정답" : "오답"}
                              </span>
                              {result && result.wrongAttempts > 0 && (
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 mt-0.5",
                                  result.wrongAttempts >= 3
                                    ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                  오답 {result.wrongAttempts}회
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-xs">
                              {idx + 1}. {q.prompt}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[15px] font-medium">
                              <span className="text-[var(--primary)]">정답: {q.choices[q.correctIndex]}</span>
                              {result && result.wrongChoices && result.wrongChoices.length > 0 && (
                                <span className="text-[var(--danger)]">내가 고른 오답: {result.wrongChoices.map((ci) => q.choices[ci] ?? `보기 ${ci + 1}`).join(", ")}</span>
                              )}
                            </div>
                          </div>
                          {aiResult ? (
                            <div className="mt-2 space-y-2">
                              {aiResult.hint1 && result && result.viewedHint1 && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 힌트
                                  </span>
                                  <span className="block text-[var(--foreground)]">{aiResult.hint1}</span>
                                </PlayQuestionExplanation>
                              )}
                              {aiResult.hint2 && result && result.viewedHint2 && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 상세 힌트
                                  </span>
                                  <span className="block text-[var(--foreground)]">{aiResult.hint2}</span>
                                </PlayQuestionExplanation>
                              )}
                              {aiResult.explanation && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 상세 해설
                                  </span>
                                  <span className="block text-[var(--foreground)] whitespace-pre-wrap">{aiResult.explanation}</span>
                                </PlayQuestionExplanation>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GuideInfoModal>
          ) : null}
          <BaseScoreGuideModal
            open={baseScoreGuideOpen}
            onClose={() => setBaseScoreGuideOpen(false)}
          />
        </>
      }
    >
      <PlayPhasePanel>
        {cards.length === 0 ? (
          <LoadingState
            variant="section"
            label={LOADING_COPY.loadingGroupMembers}
            className="min-h-0 flex-1"
          />
        ) : activeCard ? (
          <>
            {cards.length > 1 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="모둠원 파트 선택"
              >
                {cards.map((card) => {
                  const isActive = card.key === resolvedMemberId;
                  const done = memberPeerDone(card);
                  const label = roleLabelFor(card.roleId);
                  return (
                    <button
                      key={card.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveMemberId(card.key)}
                      className={cn(
                        playChipClass,
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                          : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          done
                            ? isActive
                              ? "bg-[var(--on-primary)]"
                              : "bg-[var(--primary)]"
                            : isActive
                              ? "bg-[var(--on-primary)]/50"
                              : "bg-[var(--border)]",
                        )}
                        aria-hidden
                      />
                      {label} · {card.nickname}
                      {card.isMe ? " (나)" : ""}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {!activeRole ? (
              <p className={t.playPanelBody}>아직 역할이 배정되지 않았어요.</p>
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="lg:sticky lg:top-4">
                  <PlayPhaseSection title={segmentTitle} variant="active">
                    <PlaySegmentText className="@md:p-6">
                      {activeRole.segment}
                    </PlaySegmentText>
                  </PlayPhaseSection>
                </div>

                {practiceQuestions.length > 0 ? (
                  <PlayPhaseSection
                    title="연습 문제"
                    variant="active"
                    headerExtra={
                      <div className="flex items-center gap-2">
                        {showResultModal && resolvedBaseScore != null ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setScoreModalOpen(true)}
                          >
                            결과 보기
                          </Button>
                        ) : null}
                        <PlayPhaseSectionBadge>
                          {practiceDoneCount}/{practiceQuestions.length} 문항
                        </PlayPhaseSectionBadge>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {practiceQuestions.map((pq, idx) => {
                        if (activeCard.isMe) {
                          const stored = ownPracticeResults[pq.id];
                          const initialResult = stored
                            ? {
                              wrongAttempts: stored.wrongAttempts,
                              baseScore: practiceQuestionScore(stored.wrongAttempts),
                              wrongChoiceIndices: stored.wrongChoices,
                            }
                            : { wrongAttempts: 0, baseScore: practiceQuestionScore(0) };
                          return (
                            <div key={pq.id}>
                              <PracticeQuestionCard
                                question={pq}
                                index={idx}
                                initialResult={initialResult}
                                disabled
                                onComplete={() => { }}
                                segment={activeRole.segment}
                              />
                            </div>
                          );
                        }

                        const stored = ownPracticeResults[pq.id];
                        const done = Boolean(stored || homeGroupCompletedAt);
                        const initialResult = stored
                          ? {
                            wrongAttempts: stored.wrongAttempts,
                            baseScore: practiceQuestionScore(stored.wrongAttempts),
                            wrongChoiceIndices: stored.wrongChoices,
                            viewedHint1: stored.viewedHint1,
                            viewedHint2: stored.viewedHint2,
                          }
                          : null;
                        return (
                          <div key={pq.id}>
                            <PracticeQuestionCard
                              question={pq}
                              index={idx}
                              scored={true}
                              initialResult={initialResult}
                              disabled={done || busyId === pq.id}
                              onComplete={(r) => handlePeerComplete(pq.id, r)}
                              segment={activeRole.segment}
                              onAiExplanationLoaded={(qid, res) => {
                                setAiExplanations((prev) => ({ ...prev, [qid]: res }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </PlayPhaseSection>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        {message ? <PlayPhaseMessage message={message} /> : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
