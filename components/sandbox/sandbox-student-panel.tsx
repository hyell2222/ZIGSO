"use client";

import { useMemo, useState } from "react";

import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { ActivityIntroductionLayout } from "@/components/play/overview-layout";
import { GroupPhasePanel } from "@/components/play/home-group-panel";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import { PlayAtmosphere, playLoaderRegion } from "@/components/play/play-atmosphere";
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
import { sandboxType } from "@/components/sandbox/sandbox-typography";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
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
  onCompleteTask: (groupId: string, taskId: string, itemIds: string[]) => void;
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
  onCompleteTask,
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

  const groupRow: GroupRow | null = useMemo(() => {
    if (!group) return null;
    return {
      id: group.id,
      session_id: null,
      name: group.name,
      acquired_items: group.acquired_items,
      completed_tasks: group.completed_tasks,
      completed_at: group.completed_at,
    };
  }, [group]);

  const acquiredIds = useMemo(
    () => new Set(group?.acquired_items.map((a) => a.itemId) ?? []),
    [group],
  );

  const assignedIds = primaryPlayer?.itemIds?.length
    ? primaryPlayer.itemIds
    : primaryPlayer?.itemId
      ? [primaryPlayer.itemId]
      : [];
  const roleLabel = formatAssignedRoleLabels(pack, assignedIds, `sandbox-${activityId}`);

  const sessionResults = useMemo(() => {
    if (phase !== "results" || showJoinModal) return null;
    return buildSessionResults(
      pack,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        acquired_items: g.acquired_items,
        completed_tasks: g.completed_tasks,
        completed_at: g.completed_at,
      })),
      players
        .filter((p) => p.groupId)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.groupId,
          assignedRoleId: p.roleId,
          assignedItemIds: p.itemIds?.length ? p.itemIds : p.itemId ? [p.itemId] : [],
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
        <div className={playLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={SANDBOX_JOIN_CODE}
            nickname={activeNickname}
            sessionTitle={activityTitle}
            state="waiting"
          />
          <p className={cn("mt-3 text-center", sandboxType.caption)}>
            {PLAY_STUDENT_COPY.waiting.waitForTeacher}
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

  if (phase === "home_group" && group && groupRow) {
    return (
      <SandboxGroupBridge
        pack={pack}
        group={groupRow}
        groupName={group.name}
        onCompleteTask={(taskId, itemIds) =>
          onCompleteTask(group.id, taskId, itemIds)
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
          title: PLAY_STUDENT_COPY.phaseOverview.title,
          description: PLAY_STUDENT_COPY.phaseOverview.description,
          rightSlot: (
            <PlayHeaderGroupPlace
              groupName={group?.name ?? null}
              placeName={roleLabel}
              placeLabel={PLAY_STUDENT_COPY.phaseOverview.placeLabel}
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
          sandboxType.bodyMuted,
        )}
      >
        {PLAY_STUDENT_COPY.waiting.waitForTeacher}
      </main>
    </PlayPhaseShell>
  );
}

/** API 대신 샌드박스 콜백으로 아이템 획득 */
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
  onCompleteTask,
  onCompleteActivity,
}: {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string;
  onCompleteTask: (taskId: string, itemIds: string[]) => void;
  onCompleteActivity: () => void;
}) {
  const [, bump] = useState(0);
  return (
    <GroupPhasePanel
      pack={pack}
      group={group}
      groupName={groupName}
      onUpdate={() => bump((n) => n + 1)}
      sandboxCompleteTask={onCompleteTask}
      sandboxCompleteActivity={onCompleteActivity}
      contained
    />
  );
}
