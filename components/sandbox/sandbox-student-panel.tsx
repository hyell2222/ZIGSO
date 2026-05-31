"use client";

import { useMemo, useState } from "react";

import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { ActivityIntroductionLayout } from "@/components/play/overview-layout";
import { GroupPhasePanel, type GroupMember } from "@/components/play/home-group-panel";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { activityLoaderRegion } from "@/components/activity/activity-layout-chrome";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import {
  SANDBOX_JOIN_CODE,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { cn } from "@/lib/utils";

type Props = {
  activityId: string;
  activityTitle: string | null;
  description: string | null;
  pack: ActivityPack;
  phase: ActivityPhase;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onJoinAsStudent: (nickname: string) => void;
  onLeaveAsStudent: () => void;
  onAcquire: (
    groupId: string,
    itemId: string,
    answer: string,
    clueStage: 1 | 2 | 3 | 4 | 5,
  ) => void;
  onPlaceWord: (
    groupId: string,
    actorPlayerId: string,
    slotOwnerPlayerId: string,
    slotId: string,
    itemId: string,
  ) => void;
  onCompleteActivity: (groupId: string) => void;
};

export function SandboxStudentPanel({
  activityId,
  activityTitle,
  description,
  pack,
  phase,
  groups,
  players,
  realStudentNickname,
  onJoinAsStudent,
  onLeaveAsStudent,
  onAcquire,
  onPlaceWord,
  onCompleteActivity,
}: Props) {
  void onLeaveAsStudent;
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(Boolean(realStudentNickname?.trim()));

  const showJoinModal = !joined && !realStudentNickname;
  const activeNickname = realStudentNickname?.trim() || nickname.trim();

  const primaryPlayer = useMemo(() => {
    if (!players.length || showJoinModal) return null;
    return players.find((p) => p.isReal) ?? players[0]!;
  }, [players, showJoinModal]);

  const group = useMemo(
    () => (primaryPlayer ? groups.find((t) => t.id === primaryPlayer.groupId) ?? null : null),
    [primaryPlayer, groups],
  );

  const groupMembers = useMemo<GroupMember[]>(() => {
    if (!group) return [];
    return players
      .filter((p) => p.groupId === group.id)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        assigned_role_id: p.roleId,
        assigned_item_ids: p.itemIds,
        word_cards: p.word_cards,
      }));
  }, [group, players]);

  const groupRow: GroupRow | null = useMemo(() => {
    if (!group) return null;
    return {
      id: group.id,
      session_id: null,
      name: group.name,
      worksheet_placements: group.worksheet_placements,
      completed_at: group.completed_at,
    };
  }, [group]);

  const acquiredIds = useMemo(
    () => new Set(primaryPlayer?.word_cards.map((c) => c.itemId) ?? []),
    [primaryPlayer?.word_cards],
  );

  const assignedIds = primaryPlayer?.itemIds ?? [];
  const roleLabel = formatAssignedRoleLabels(pack, assignedIds, `sandbox-${activityId}`);

  const sessionResults = useMemo(() => {
    if (phase !== "results" || showJoinModal) return null;
    return buildSessionResults(
      pack,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        worksheet_placements: g.worksheet_placements,
        completed_at: g.completed_at,
      })),
      players
        .filter((p) => p.groupId)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.groupId,
          assignedRoleId: p.roleId,
          assignedItemIds: p.itemIds,
          word_cards: p.word_cards,
        })),
      `sandbox-${activityId}`,
    );
  }, [phase, pack, groups, players, showJoinModal, activityId]);

  if (showJoinModal) {
    return (
      <PlayAtmosphere variant="contained">
        <PlayJoinModal
          open
          titleId="sandbox-play-join"
          joinCode={SANDBOX_JOIN_CODE}
          nickname={nickname}
          modalVariant="contained"
          joinCodeEditable={false}
          showMissingCodeClue={false}
          onNicknameChange={setNickname}
          onSubmit={() => {
            const nick = nickname.trim();
            if (!nick) return;
            onJoinAsStudent(nick);
            setJoined(true);
          }}
        />
      </PlayAtmosphere>
    );
  }

  if (phase === "waiting") {
    return (
      <PlayPhaseShell contained>
        <div className={activityLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={SANDBOX_JOIN_CODE}
            nickname={activeNickname}
            sessionTitle={activityTitle}
            state="waiting"
          />
          <p className={cn("mt-3 text-center", activityLayoutType.caption)}>
            선생님이 다음 단계로 넘길 때까지 기다려 주세요.
          </p>
        </div>
      </PlayPhaseShell>
    );
  }

  if (phase === "expert_group" && primaryPlayer && group) {
    return (
      <SandboxExpertBridge
        pack={pack}
        roleScopeKey={`sandbox-${activityId}`}
        playerId={primaryPlayer.id}
        groupId={group.id}
        groupName={group.name}
        assignedItemIds={assignedIds}
        acquiredIds={acquiredIds}
        onAcquire={(itemId, answer, clueStage) =>
          onAcquire(group.id, itemId, answer, clueStage)
        }
      />
    );
  }

  if (phase === "home_group" && group && groupRow && primaryPlayer) {
    return (
      <SandboxGroupBridge
        pack={pack}
        group={groupRow}
        groupName={group.name}
        playerId={primaryPlayer.id}
        assignedRoleId={primaryPlayer.roleId}
        wordCards={primaryPlayer.word_cards}
        members={groupMembers}
        onPlaceWord={(slotOwnerPlayerId, slotId, itemId) =>
          onPlaceWord(
            group.id,
            primaryPlayer.id,
            slotOwnerPlayerId,
            slotId,
            itemId,
          )
        }
        onCompleteActivity={() => onCompleteActivity(group.id)}
      />
    );
  }

  if (phase === "overview") {
    return (
      <PlayPhaseShell
        contained
        header={{
          phase: 1,
          title: "활동 소개",
          description:
            "모둠·역할·공유 학습지를 확인하세요. 전문가 집단에서는 5단계 단서로 단어 카드를 얻습니다.",
          rightSlot: (
            <PlayHeaderGroupPlace
              groupName={group?.name ?? null}
              placeName={roleLabel}
              placeLabel="나의 역할"
              contained
            />
          ),
        }}
      >
        <ActivityIntroductionLayout
          loading={false}
          title={activityTitle}
          description={description}
          activityPack={pack}
        />
      </PlayPhaseShell>
    );
  }

  if (phase === "results" && primaryPlayer) {
    return (
      <ResultsPhasePanel
        contained
        loading={false}
        title={activityTitle}
        results={sessionResults}
        highlightGroupId={primaryPlayer.groupId}
        groupName={group?.name ?? null}
        roleLabel={roleLabel}
        currentPlayerId={primaryPlayer.id}
      />
    );
  }

  return (
    <PlayPhaseShell contained>
      <main
        className={cn(
          "flex min-h-[12rem] flex-1 items-center justify-center text-center",
          activityLayoutType.bodyMuted,
        )}
      >
        선생님이 다음 단계로 넘길 때까지 기다려 주세요.
      </main>
    </PlayPhaseShell>
  );
}

function SandboxExpertBridge({
  pack,
  roleScopeKey,
  playerId,
  groupId,
  groupName,
  assignedItemIds,
  acquiredIds,
  onAcquire,
}: {
  pack: ActivityPack;
  roleScopeKey: string;
  playerId: string;
  groupId: string;
  groupName: string;
  assignedItemIds: string[];
  acquiredIds: Set<string>;
  onAcquire: (itemId: string, answer: string, clueStage: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [, bump] = useState(0);
  return (
    <ExpertPhasePanel
      pack={pack}
      roleScopeKey={roleScopeKey}
      playerId={playerId}
      groupId={groupId}
      groupName={groupName}
      assignedItemIds={assignedItemIds}
      acquiredItemIds={acquiredIds}
      onAcquired={() => bump((n) => n + 1)}
      sandboxAcquire={onAcquire}
      contained
    />
  );
}

function SandboxGroupBridge({
  pack,
  group,
  groupName,
  playerId,
  assignedRoleId,
  wordCards,
  members,
  onPlaceWord,
  onCompleteActivity,
}: {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string;
  playerId: string;
  assignedRoleId: string;
  wordCards: SandboxPlayer["word_cards"];
  members: GroupMember[];
  onPlaceWord: (slotOwnerPlayerId: string, slotId: string, itemId: string) => void;
  onCompleteActivity: () => void;
}) {
  const [, bump] = useState(0);
  return (
    <GroupPhasePanel
      pack={pack}
      group={group}
      groupName={groupName}
      playerId={playerId}
      assignedRoleId={assignedRoleId}
      wordCards={wordCards}
      members={members}
      onUpdate={() => bump((n) => n + 1)}
      sandboxPlace={onPlaceWord}
      sandboxComplete={onCompleteActivity}
      contained
    />
  );
}
