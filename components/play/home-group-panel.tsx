"use client";

import { useMemo } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseWaitFootnote,
} from "@/components/play/play-phase-layout";
import { QuizQuestionList } from "@/components/play/quiz-question-list";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { listGroupMembers, type PlayerSelfRow } from "@/lib/api/play";
import { getRoleById } from "@/lib/activity-pack/engine";
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
  members: GroupMember[];
  roleScopeKey: string;
  pending?: boolean;
  contained?: boolean;
};

export function GroupPhasePanel({
  pack,
  groupName,
  playerId,
  members,
  roleScopeKey,
  pending,
  contained = false,
}: Props) {
  const roleLabelFor = useMemo(() => {
    const roleIds = pack.roles.map((r) => r.id);
    return (roleId: string | null) =>
      roleId ? codenameForRole(roleScopeKey, roleId, roleIds) : "—";
  }, [pack.roles, roleScopeKey]);

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
      header={{
        phase: 3,
        title: "홈 집단",
        description:
          "모둠으로 돌아와 각자 맡은 부분과 연습 문제 풀이 방식을 설명하세요. 모든 모둠원의 지문과 연습 문제를 볼 수 있어요.",
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={`${members.length}명`}
            placeLabel="모둠원"
            pending={pending}
            contained={contained}
          />
        ),
      }}
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
                    {role.keyPoints && role.keyPoints.length > 0 ? (
                      <ul className="space-y-2">
                        {role.keyPoints.map((point, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2",
                              t.playPanelBody,
                            )}
                          >
                            <span className="font-semibold text-[var(--accent)]">{i + 1}.</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div>
                      <p className={cn("mb-2", t.caption)}>연습 문제 · 정답과 해설</p>
                      <div className="space-y-3">
                        {role.practiceQuestions.map((pq, pqi) => (
                          <div key={pq.id}>
                            {role.practiceQuestions.length > 1 ? (
                              <p className={cn("mb-1 text-xs font-medium", t.caption)}>
                                연습 {pqi + 1}
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
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </PlayPhaseSection>
            );
          })
        )}
        <PlayPhaseWaitFootnote className="mt-2" />
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}

export async function fetchGroupMembersForPlay(groupId: string): Promise<GroupMember[]> {
  const rows = await listGroupMembers(groupId);
  return rows.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    assigned_role_id: r.assigned_role_id,
    created_at: r.created_at,
  }));
}
