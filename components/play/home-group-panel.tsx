"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseWaitFootnote,
  PlayStudentTopBanner,
} from "@/components/play/play-phase-layout";
import { PracticeQuestionCard } from "@/components/play/practice-question-card";
import { QuizQuestionList } from "@/components/play/quiz-question-list";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import type { PlayerSelfRow } from "@/lib/api/play";
import {
  getPeerPracticeQuestions,
  getRoleById,
  isPeerPracticeComplete,
  PLAYER_MESSAGES,
} from "@/lib/activity-pack/engine";
import { codenameForRole } from "@/lib/play/role-codenames";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

export type GroupMember = Pick<
  PlayerSelfRow,
  "id" | "nickname" | "assigned_role_id" | "created_at"
>;

type Props = {
  pack: ActivityPack;
  groupName: string | null;
  playerId: string | null;
  ownRoleId: string | null;
  members: GroupMember[];
  roleScopeKey: string;
  peerPracticeCompleted?: string[];
  homeGroupCompletedAt?: string | null;
  onPeerQuestionComplete?: (questionId: string) => void | Promise<void>;
  onEnsureHomeGroupComplete?: () => void | Promise<void>;
  pending?: boolean;
  contained?: boolean;
};

export function GroupPhasePanel({
  pack,
  groupName,
  playerId,
  ownRoleId,
  members,
  roleScopeKey,
  peerPracticeCompleted = [],
  homeGroupCompletedAt,
  onPeerQuestionComplete,
  onEnsureHomeGroupComplete,
  pending,
  contained = false,
}: Props) {
  const [completed, setCompleted] = useState<Record<string, true>>(() => {
    const map: Record<string, true> = {};
    for (const id of peerPracticeCompleted) map[id] = true;
    return map;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const roleLabelFor = useMemo(() => {
    const roleIds = pack.roles.map((r) => r.id);
    return (roleId: string | null) =>
      roleId ? codenameForRole(roleScopeKey, roleId, roleIds) : "—";
  }, [pack.roles, roleScopeKey]);

  const memberRoleIds = useMemo(
    () => members.map((m) => m.assigned_role_id),
    [members],
  );

  const peerQuestions = useMemo(
    () => getPeerPracticeQuestions(pack, memberRoleIds, ownRoleId),
    [pack, memberRoleIds, ownRoleId],
  );

  const peerDoneCount = peerQuestions.filter((q) => completed[q.id]).length;
  const allPeerDone =
    isPeerPracticeComplete(peerQuestions, Object.keys(completed)) ||
    Boolean(homeGroupCompletedAt);

  const handlePeerComplete = useCallback(
    async (questionId: string) => {
      if (completed[questionId] || homeGroupCompletedAt) return;
      setMessage(null);
      setBusyId(questionId);
      try {
        await onPeerQuestionComplete?.(questionId);
        setCompleted((prev) => ({ ...prev, [questionId]: true }));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
        throw e;
      } finally {
        setBusyId(null);
      }
    },
    [completed, homeGroupCompletedAt, onPeerQuestionComplete],
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

  return (
    <PlayPhaseShell
      contained={contained}
      topBanner={
        <PlayStudentTopBanner
          phase="home_group"
          groupName={groupName}
          placeName={
            peerQuestions.length > 0
              ? `${peerDoneCount}/${peerQuestions.length}`
              : `${members.length}명`
          }
          placeLabel={peerQuestions.length > 0 ? "모둠원 연습" : "모둠원"}
          pending={pending}
          contained={contained}
          completeTitle={
            allPeerDone && peerQuestions.length > 0 ? "3단계 완료!" : undefined
          }
          completeMessage={
            allPeerDone && peerQuestions.length > 0
              ? "모둠원 파트 연습을 모두 마쳤어요. 모둠원과 서로 설명하며 내용을 정리해 보세요."
              : undefined
          }
        />
      }
    >
      <PlayPhasePanel>
        {cards.length === 0 ? (
          <PlayPhaseMessage message="모둠원 정보를 불러오는 중이에요." />
        ) : (
          cards.map((card) => {
            const role = card.roleId ? getRoleById(pack, card.roleId) : undefined;
            const label = roleLabelFor(card.roleId);
            return (
              <PlayPhaseSection
                key={card.key}
                title={`${label} · ${card.nickname}${card.isMe ? " (나)" : ""}`}
                variant={card.isMe ? "active" : undefined}
              >
                {!role ? (
                  <p className={t.playPanelBody}>아직 역할이 배정되지 않았어요.</p>
                ) : (
                  <div className="space-y-3">
                    <p
                      className={cn(
                        "whitespace-pre-line rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 leading-relaxed",
                        t.playPanelBody,
                      )}
                    >
                      {role.segment}
                    </p>
                    <div>
                      <p className={cn("mb-2", t.caption)}>
                        {card.isMe ? "연습 문제 · 내 답 확인" : "연습 문제 · 직접 풀기"}
                      </p>
                      <div className="space-y-3">
                        {role.practiceQuestions.map((pq, pqi) => {
                          const label =
                            role.practiceQuestions.length > 1 ? `연습 ${pqi + 1}` : null;
                          if (card.isMe) {
                            return (
                              <div key={pq.id}>
                                {label ? (
                                  <p className={cn("mb-1 text-xs font-medium", t.caption)}>
                                    {label}
                                  </p>
                                ) : null}
                                <QuizQuestionList questions={[pq]} selected={{}} reveal />
                                {pq.explanation ? (
                                  <p
                                    className={cn(
                                      "mt-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2",
                                      t.caption,
                                    )}
                                  >
                                    {pq.explanation}
                                  </p>
                                ) : null}
                              </div>
                            );
                          }

                          const done = Boolean(completed[pq.id] || homeGroupCompletedAt);
                          return (
                            <div key={pq.id}>
                              {label ? (
                                <p className={cn("mb-1 text-xs font-medium", t.caption)}>
                                  {label}
                                </p>
                              ) : null}
                              <PracticeQuestionCard
                                question={pq}
                                scored={false}
                                initialResult={done ? { wrongAttempts: 0, baseScore: 0 } : null}
                                disabled={done || busyId === pq.id}
                                onComplete={() => handlePeerComplete(pq.id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </PlayPhaseSection>
            );
          })
        )}

        <PlayPhaseWaitFootnote className="mt-2" />

        {message ? <PlayPhaseMessage message={message} /> : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
