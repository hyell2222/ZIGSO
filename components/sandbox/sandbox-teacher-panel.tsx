"use client";

import { Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { PhaseTimerContent } from "@/components/teacher/phase-timer-content";
import {
  TeamAssignmentDashboard,
  type TeamAssignmentGroup,
} from "@/components/teacher/team-assignment-dashboard";
import {
  TeamProgressDashboard,
  type TeamProgressGroup,
} from "@/components/teacher/team-progress-dashboard";
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { SessionPhase } from "@/lib/api/lessons";
import type { ScenarioPack } from "@/lib/lunch/types";
import {
  SANDBOX_JOIN_CODE,
  buildSandboxWaitingRoster,
  getSandboxNextPhaseLabel,
  type SandboxPlayer,
  type SandboxTeam,
} from "@/lib/sandbox/state";
import { isTimedPhase, type TimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

type Props = {
  lessonTitle: string | null;
  pack: ScenarioPack;
  lessonId: string;
  phase: SessionPhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
  onBegin: () => void;
  onAdvance: () => void;
  onResetPhase: () => void;
};

export function SandboxTeacherPanel({
  lessonTitle,
  pack,
  lessonId,
  phase,
  teams,
  players,
  realStudentNickname,
  onBegin,
  onAdvance,
  onResetPhase,
}: Props) {
  const [timerModalOpen, setTimerModalOpen] = useState<{
    open: boolean;
    phaseAtOpen: SessionPhase | null;
  }>({ open: false, phaseAtOpen: null });

  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_end";

  const waitingOnlinePlayers = useMemo(
    () => buildSandboxWaitingRoster(lessonId, pack, realStudentNickname),
    [lessonId, pack, realStudentNickname],
  );

  const playercount = sessionStarted ? players.length : waitingOnlinePlayers.length;

  const ingredientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ing of pack.ingredients) map.set(ing.id, ing.name);
    return map;
  }, [pack]);

  const assignmentGroups = useMemo<TeamAssignmentGroup[]>(() => {
    const byTeam = new Map<string, SandboxPlayer[]>();
    for (const p of players) {
      const list = byTeam.get(p.teamId) ?? [];
      list.push(p);
      byTeam.set(p.teamId, list);
    }
    return teams.map((team) => ({
      team: { id: team.id, name: team.name },
      members: (byTeam.get(team.id) ?? []).map((m) => ({
        id: m.id,
        nickname: m.nickname,
        zoneName: ingredientNameById.get(m.ingredientId) ?? m.ingredientId,
      })),
    }));
  }, [players, teams, ingredientNameById]);

  const progressGroups = useMemo<TeamProgressGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const p of players) counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);
    return teams.map((team) => ({
      team: {
        id: team.id,
        session_id: null,
        name: team.name,
        acquired_ingredients: team.acquired_ingredients,
        completed_menus: team.completed_menus,
        tray_submitted_at: team.tray_submitted_at,
      },
      memberCount: counts.get(team.id) ?? 0,
    }));
  }, [teams, players]);

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
    sessionStarted && !sessionEnded ? (
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
              {lessonTitle ?? "시뮬레이션"}
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
          {startButton ?? nextButton}
        </div>

        {phase !== "waiting" && phase !== "session_end" ? <PhaseGuideCard phase={phase} /> : null}

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

        {phase === "briefing" || phase === "investigation" ? (
          <TeamAssignmentDashboard groups={assignmentGroups} loading={false} />
        ) : null}

        {phase === "final_report" || phase === "session_end" ? (
          <TeamProgressDashboard groups={progressGroups} loading={false} pack={pack} />
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
