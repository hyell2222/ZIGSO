"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayStudentTopBanner,
} from "@/components/play/play-phase-layout";
import { PracticeQuestionCard } from "@/components/play/practice-question-card";
import { LoadingState } from "@/components/ui/loading-state";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import type { PlayerSelfRow } from "@/lib/api/play";
import {
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
import { playPhaseDualSectionGrid } from "../activity/activity-layout-chrome";

const t = activityLayoutType;

const playChipClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";

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
  practiceResults?: PracticeQuestionResult[];
  homeGroupCompletedAt?: string | null;
  onPeerQuestionComplete?: (questionId: string) => void | Promise<void>;
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
  const ownPracticeResults = useMemo(() => {
    const map: Record<string, PracticeQuestionResult> = {};
    for (const r of practiceResults) map[r.questionId] = r;
    return map;
  }, [practiceResults]);

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
              <div className={playPhaseDualSectionGrid}>
                <PlayPhaseSection title={segmentTitle} variant="active">
                  <p
                    className={cn(
                      "whitespace-pre-line rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 leading-relaxed @md:p-6",
                      t.playPanelBody,
                    )}
                  >
                    {activeRole.segment}
                  </p>
                </PlayPhaseSection>

                {practiceQuestions.length > 0 ? (
                  <PlayPhaseSection
                    title="연습 문제"
                    variant="active"
                    headerExtra={
                      <PlayPhaseSectionBadge>
                        {practiceDoneCount}/{practiceQuestions.length} 문항
                      </PlayPhaseSectionBadge>
                    }
                  >
                    <div className="space-y-4">
                      {practiceQuestions.map((pq) => {
                        if (activeCard.isMe) {
                          const stored = ownPracticeResults[pq.id];
                          const initialResult = stored
                            ? {
                                wrongAttempts: stored.wrongAttempts,
                                baseScore: practiceQuestionScore(stored.wrongAttempts),
                              }
                            : { wrongAttempts: 0, baseScore: practiceQuestionScore(0) };
                          return (
                            <div key={pq.id}>
                              <PracticeQuestionCard
                                question={pq}
                                initialResult={initialResult}
                                disabled
                                onComplete={() => {}}
                              />
                            </div>
                          );
                        }

                        const done = Boolean(completed[pq.id] || homeGroupCompletedAt);
                        return (
                          <div key={pq.id}>
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
