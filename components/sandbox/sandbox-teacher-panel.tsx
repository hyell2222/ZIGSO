"use client";

import { Timer } from "lucide-react";
import { useMemo, useState } from "react";

import {
  GroupAssignmentDashboard,
  type GroupAssignmentGroup,
} from "@/components/teacher/group-assignment-dashboard";
import {
  GroupProgressDashboard,
  type GroupProgressGroup,
} from "@/components/teacher/group-progress-dashboard";
import {
  SessionResultsDashboard,
  type SessionResultsMember,
} from "@/components/teacher/session-results-dashboard";
import { SessionHostLayout } from "@/components/teacher/session-host-layout";
import { SessionHostWaitingRoster } from "@/components/teacher/session-host-waiting-roster";
import { PhaseTimerContent } from "@/components/teacher/phase-timer-content";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack } from "@/lib/activity-pack/types";
import {
  SANDBOX_JOIN_CODE,
  buildSandboxWaitingRoster,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import type { SessionStatus } from "@/lib/types";
import { isSessionEnded } from "@/lib/activity-phases";
import {
  HOST_SESSION_START_LABEL,
  hostSessionNextPhaseLabel,
  isTimedPhase,
  type TimedPhase,
} from "@/lib/copy/teacher";
import { buildRoleCodenameMap } from "@/lib/play/role-codenames";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";

type Props = {
  activityTitle: string | null;
  pack: ActivityPack;
  activityId: string;
  phase: ActivityPhase;
  sessionStatus: SessionStatus;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onBegin: () => void;
  onAdvance: () => void;
  onResetPhase: () => void;
};

export function SandboxTeacherPanel({
  activityTitle,
  pack,
  activityId,
  phase,
  sessionStatus,
  groups,
  players,
  realStudentNickname,
  onBegin,
  onAdvance,
  onResetPhase: _onResetPhase,
}: Props) {
  void _onResetPhase;
  const [timerModalOpen, setTimerModalOpen] = useState<{
    open: boolean;
    phaseAtOpen: ActivityPhase | null;
  }>({ open: false, phaseAtOpen: null });

  const sessionStarted = phase !== "waiting";
  const sessionEnded = isSessionEnded(sessionStatus);
  const hasNextPhase = Boolean(
    phase === "waiting" ||
      phase === "overview" ||
      phase === "expert_group" ||
      phase === "home_group",
  );

  const waitingOnlinePlayers = useMemo(
    () => buildSandboxWaitingRoster(activityId, realStudentNickname, pack.groupSize),
    [activityId, realStudentNickname, pack.groupSize],
  );

  const playercount = sessionStarted ? players.length : waitingOnlinePlayers.length;

  const roleCodenameById = useMemo(
    () => buildRoleCodenameMap(`sandbox-${activityId}`, pack.roles.map((r) => r.id)),
    [activityId, pack.roles],
  );
  const assignmentGroups = useMemo<GroupAssignmentGroup[]>(() => {
    const byGroup = new Map<string, SandboxPlayer[]>();
    for (const p of players) {
      const list = byGroup.get(p.groupId) ?? [];
      list.push(p);
      byGroup.set(p.groupId, list);
    }
    return groups.map((group) => ({
      group: { id: group.id, name: group.name },
      members: (byGroup.get(group.id) ?? []).map((m) => ({
        id: m.id,
        nickname: m.nickname,
        zoneName:
          formatAssignedRoleLabels(pack, m.itemIds, `sandbox-${activityId}`) ??
          roleCodenameById.get(m.roleId) ??
          null,
      })),
    }));
  }, [players, groups, pack, activityId, roleCodenameById]);

  const progressGroups = useMemo<GroupProgressGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const p of players) counts.set(p.groupId, (counts.get(p.groupId) ?? 0) + 1);
    return groups.map((group) => ({
      group: {
        id: group.id,
        session_id: null,
        name: group.name,
        acquired_items: group.acquired_items,
        completed_tasks: group.completed_tasks,
        completed_at: group.completed_at,
      },
      memberCount: counts.get(group.id) ?? 0,
    }));
  }, [groups, players]);

  const resultsMembers = useMemo<SessionResultsMember[]>(
    () =>
      players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        groupId: p.groupId,
        assignedRoleId: p.roleId,
        assignedItemIds: p.itemIds?.length ? p.itemIds : p.itemId ? [p.itemId] : [],
      })),
    [players],
  );

  const resultsGroups = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        session_id: null as string | null,
        name: group.name,
        acquired_items: group.acquired_items,
        completed_tasks: group.completed_tasks,
        completed_at: group.completed_at,
      })),
    [groups],
  );

  const shouldShowTimer = isTimedPhase(phase);
  const timerToolOpen =
    timerModalOpen.open &&
    timerModalOpen.phaseAtOpen === phase &&
    shouldShowTimer;

  const timerButton = shouldShowTimer ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-1.5"
      onClick={() => setTimerModalOpen({ open: true, phaseAtOpen: phase })}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden />
      타이머
    </Button>
  ) : null;

  const startButton = !sessionStarted ? (
    <Button type="button" size="sm" onClick={onBegin}>
      {HOST_SESSION_START_LABEL}
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded && hasNextPhase ? (
      <Button type="button" size="sm" onClick={onAdvance}>
        {hostSessionNextPhaseLabel(phase)}
      </Button>
    ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto text-sm">
      <SessionHostLayout
        contained
        activityTitle={activityTitle}
        playerCount={playercount}
        joinCode={SANDBOX_JOIN_CODE}
        sessionEnded={sessionEnded}
        phase={phase}
        timerButton={timerButton}
        startButton={startButton}
        nextButton={nextButton}
      >
        {phase === "waiting" ? (
          <SessionHostWaitingRoster players={waitingOnlinePlayers} />
        ) : null}

        {phase === "overview" || phase === "expert_group" ? (
          <GroupAssignmentDashboard
            groups={assignmentGroups}
            loading={false}
            groupBy={phase === "expert_group" ? "item" : "group"}
            contained
          />
        ) : null}

        {phase === "home_group" ? (
          <GroupProgressDashboard
            groups={progressGroups}
            loading={false}
            pack={pack}
            contained
          />
        ) : null}

        {phase === "results" ? (
          <SessionResultsDashboard
            groups={resultsGroups}
            members={resultsMembers}
            pack={pack}
            roleScopeKey={`sandbox-${activityId}`}
            loading={false}
            contained
          />
        ) : null}
      </SessionHostLayout>

      <Modal
        open={timerToolOpen}
        onClose={() => setTimerModalOpen({ open: false, phaseAtOpen: null })}
        title="타이머"
        titleId="sandbox-timer-heading"
        contentClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>
    </div>
  );
}
