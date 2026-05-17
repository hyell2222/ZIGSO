"use client";

import { Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { PhaseTimerContent } from "@/components/teacher/phase-timer-content";
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
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ActivityPhase } from "@/lib/api/activities";
import type { ActivityPack } from "@/lib/activity-pack/types";
import {
  SANDBOX_JOIN_CODE,
  buildSandboxWaitingRoster,
  getSandboxNextPhaseLabel,
  type SandboxPlayer,
  type SandboxGroup,
} from "@/lib/sandbox/state";
import type { SessionStatus } from "@/lib/types";
import { isSessionEnded } from "@/lib/activity-phases";
import { isTimedPhase, type TimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

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
  onResetPhase,
}: Props) {
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
    () => buildSandboxWaitingRoster(activityId, pack, realStudentNickname),
    [activityId, pack, realStudentNickname],
  );

  const playercount = sessionStarted ? players.length : waitingOnlinePlayers.length;

  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ing of pack.items) map.set(ing.id, ing.name);
    return map;
  }, [pack]);

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
        zoneName: itemNameById.get(m.itemId) ?? m.itemId,
      })),
    }));
  }, [players, groups, itemNameById]);

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
        assignedRoleId: p.itemId,
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

  const startButton = !sessionStarted ? (
    <Button type="button" onClick={onBegin}>
      {getSandboxNextPhaseLabel(phase)}
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded && hasNextPhase ? (
      <Button type="button" onClick={onAdvance}>
        {getSandboxNextPhaseLabel(phase)}
      </Button>
    ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 md:flex-row md:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-2xl font-semibold text-[var(--accent)] sm:text-3xl">
              {activityTitle ?? "시뮬레이션"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              접속 <span className="font-semibold text-[var(--foreground)]">{playercount}</span>명
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              참가 코드 (샌드박스)
            </p>
            <p className="font-mono text-xl font-semibold tracking-[0.15em] text-[var(--accent)]">
              {SANDBOX_JOIN_CODE}
            </p>
            <PlayJoinQr joinCode={SANDBOX_JOIN_CODE} />
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {shouldShowTimer ? (
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => setTimerModalOpen({ open: true, phaseAtOpen: phase })}
            >
              <Timer className="h-4 w-4" aria-hidden />
              타이머
            </Button>
          ) : null}
          {startButton}
          {nextButton}
        </div>

        {isTimedPhase(phase) ? <PhaseGuideCard phase={phase} /> : null}

        {phase === "waiting" ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">대기 학생</p>
            <ul className="flex flex-wrap gap-1.5">
              {waitingOnlinePlayers.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs"
                >
                  {p.nickname}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {phase === "overview" || phase === "expert_group" ? (
          <GroupAssignmentDashboard groups={assignmentGroups} loading={false} />
        ) : null}

        {phase === "home_group" ? (
          <GroupProgressDashboard groups={progressGroups} loading={false} pack={pack} />
        ) : null}

        {phase === "results" ? (
          <SessionResultsDashboard
            groups={resultsGroups}
            members={resultsMembers}
            pack={pack}
            loading={false}
          />
        ) : null}
      </main>

      <Modal
        open={timerToolOpen}
        onClose={() => setTimerModalOpen({ open: false, phaseAtOpen: null })}
        title="타이머"
        titleId="sandbox-timer-heading"
        maxWidthClassName="max-w-md"
        bodyClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>
    </div>
  );
}
