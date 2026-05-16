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
  TeamReportDashboard,
  type TeamReportGroup,
} from "@/components/teacher/team-report-dashboard";
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { CasePhase } from "@/lib/api/cases";
import type { CaseLocationRow, CaseRecord } from "@/lib/api/cases";
import {
  SANDBOX_JOIN_CODE,
  buildSandboxWaitingRoster,
  type SandboxPlayer,
  type SandboxTeam,
} from "@/lib/sandbox/state";
import { parseSuspectRosterFromCase } from "@/lib/suspects";
import { isTimedPhase, type TimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

type SandboxTeacherPanelProps = {
  caseRecord: CaseRecord;
  locations: CaseLocationRow[];
  phase: CasePhase;
  teams: SandboxTeam[];
  players: SandboxPlayer[];
  /** 학생 패널에서 참가 후 대기 명단 맨 위에 표시되는 실제 닉네임 */
  realStudentNickname: string | null;
  onBegin: () => void;
  onAdvance: () => void;
  onResetPhase: () => void;
};

/**
 * 시뮬레이션 교사 화면 — `app/sessions/page.tsx` 의 호스트 UI 를 거의 그대로 모방하되,
 * 데이터를 in-memory sandbox state 로 채웁니다. (참가 코드/QR 자리에는 SANDBOX 뱃지)
 */
export function SandboxTeacherPanel({
  caseRecord,
  locations,
  phase,
  teams,
  players,
  realStudentNickname,
  onBegin,
  onAdvance,
  onResetPhase,
}: SandboxTeacherPanelProps) {
  const [timerModalOpen, setTimerModalOpen] = useState<{
    open: boolean;
    phaseAtOpen: CasePhase | null;
  }>({ open: false, phaseAtOpen: null });

  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_end";

  const waitingOnlinePlayers = useMemo(
    () =>
      buildSandboxWaitingRoster(
        caseRecord.id,
        locations,
        realStudentNickname,
      ),
    [caseRecord.id, locations, realStudentNickname],
  );

  const playercount = sessionStarted
    ? players.length
    : waitingOnlinePlayers.length;

  const locNameById = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name])),
    [locations],
  );

  const groups = useMemo(
    () => groupSandboxPlayers(players, teams, locNameById),
    [players, teams, locNameById],
  );

  const assignmentGroups: TeamAssignmentGroup[] = useMemo(
    () =>
      groups.map((g) => ({
        team: { id: g.team.id, name: g.team.name },
        members: g.members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          zoneName: m.zoneName,
        })),
      })),
    [groups],
  );

  const reportGroups: TeamReportGroup[] = useMemo(
    () =>
      groups.map((g) => ({
        team: { id: g.team.id, name: g.team.name },
        members: g.members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          report: m.player.report
            ? { suspectId: m.player.report.suspectId }
            : null,
        })),
      })),
    [groups],
  );

  const reportRoster = useMemo(
    () => parseSuspectRosterFromCase(caseRecord.suspect_roster),
    [caseRecord.suspect_roster],
  );

  const submittedCount = players.filter((p) => p.report).length;

  const shouldShowTimer = isTimedPhase(phase);

  const timerToolOpen =
    timerModalOpen.open &&
    timerModalOpen.phaseAtOpen !== null &&
    timerModalOpen.phaseAtOpen === phase &&
    shouldShowTimer;

  const openTimerModal = () => {
    if (!shouldShowTimer) return;
    setTimerModalOpen({ open: true, phaseAtOpen: phase });
  };

  const closeTimerModal = () =>
    setTimerModalOpen({ open: false, phaseAtOpen: null });

  const noLocations = locations.length === 0;

  const timerButton = shouldShowTimer ? (
    <Button
      type="button"
      variant="secondary"
      className="shrink-0 gap-2"
      aria-haspopup="dialog"
      aria-expanded={timerToolOpen}
      onClick={openTimerModal}
    >
      <Timer
        className="h-4 w-4 shrink-0 text-[var(--accent)]"
        aria-hidden
      />
      타이머
    </Button>
  ) : null;

  const startButton = !sessionStarted ? (
    <Button
      type="button"
      onClick={onBegin}
      disabled={noLocations}
      className="gap-2"
    >
      시작
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded ? (
      <Button type="button" onClick={onAdvance} className="gap-2">
        {phase === "final_report" ? "종료" : "다음 단계"}
      </Button>
    ) : null;

  const restartButton = sessionEnded ? (
    <Button type="button" variant="secondary" onClick={onResetPhase}>
      새 시뮬레이션
    </Button>
  ) : null;

  const showPhaseGuide = phase !== "waiting" && phase !== "session_end";
  const showPhaseActions = Boolean(
    timerButton || startButton || nextButton || restartButton,
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-[var(--background)]">
      <main className="mx-auto w-full max-w-7xl space-y-3 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-4 sm:space-y-4 sm:px-4 sm:pt-5 md:space-y-5 md:px-6 md:pb-10 md:pt-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:gap-3.5 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-4">
          <div className="min-w-0 flex-1 space-y-0.5 md:min-w-[12rem]">
            <p className="break-words font-mono text-base font-semibold leading-snug tracking-wide text-[var(--accent)] sm:text-lg md:text-xl">
              {caseRecord.title?.trim() || "제목 없는 사건"}
            </p>
            <p className="px-0.5 text-xs text-[var(--muted-foreground)] md:text-sm">
              접속{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {playercount}
              </span>
              명
            </p>
          </div>
          <div className="w-full shrink-0 md:ml-auto md:w-auto md:max-w-[min(100%,26rem)]">
            <div
              className={cn(
                "flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 shadow-[var(--elevation-sm)] sm:w-auto sm:justify-start sm:py-1.5 md:px-2.5 md:py-2",
                sessionEnded && "justify-center",
              )}
            >
              {sessionEnded ? (
                <div className="py-0.5 text-center sm:text-left">
                  <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-[var(--muted-foreground)] sm:text-base">
                    종료된 시뮬레이션
                  </p>
                </div>
              ) : (
                <>
                  <div className="leading-tight">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      참가 코드
                    </p>
                    <p className="font-mono text-base font-semibold tracking-[0.12em] text-[var(--accent)] sm:text-lg md:text-xl">
                      {SANDBOX_JOIN_CODE}
                    </p>
                  </div>
                  <span className="h-8 w-px bg-[var(--border)]" aria-hidden />
                  <PlayJoinQr joinCode={SANDBOX_JOIN_CODE} size={44} />
                </>
              )}
            </div>
          </div>
        </header>

        {showPhaseGuide || showPhaseActions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:gap-3 lg:flex-nowrap">
            <div className="min-w-0 flex-1 md:max-w-[min(100%,42rem)]">
              {showPhaseGuide ? <PhaseGuideCard phase={phase} compact /> : null}
            </div>
            {showPhaseActions ? (
              <div className="flex w-full shrink-0 flex-wrap items-stretch gap-2 sm:w-auto sm:justify-end md:gap-3 [&_button]:min-h-11 [&_button]:touch-manipulation">
                {timerButton}
                {startButton ?? nextButton ?? restartButton}
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "waiting" ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2.5 shadow-[var(--elevation-sm)] md:p-3">
            <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)] md:mb-2.5 md:text-xs">
              대기 학생
            </p>
            {waitingOnlinePlayers.length === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--muted-foreground)]">
                {noLocations
                  ? "이 사건에 조사 장소가 없어 시뮬레이션을 시작할 수 없습니다."
                  : "아직 없음"}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {waitingOnlinePlayers.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs md:px-2.5 md:text-sm"
                  >
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--primary)]"
                      aria-hidden
                    />
                    <span className="font-medium text-[var(--foreground)]">
                      {p.nickname ?? "참가자"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {phase === "briefing" || phase === "investigation" ? (
          <TeamAssignmentDashboard
            groups={assignmentGroups}
            loading={false}
          />
        ) : null}

        {phase === "final_report" || phase === "session_end" ? (
          <TeamReportDashboard
            groups={reportGroups}
            loading={false}
            roster={reportRoster}
            answerSuspectId={caseRecord.answer_suspect_id ?? null}
            totalPlayers={players.length}
            submittedCount={submittedCount}
          />
        ) : null}
      </main>

      <Modal
        open={timerToolOpen}
        onClose={closeTimerModal}
        title="타이머"
        titleId="sandbox-host-timer-heading"
        maxWidthClassName="max-w-md"
        zIndexClassName="z-[90]"
        bodyClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>
    </div>
  );
}

function groupSandboxPlayers(
  players: SandboxPlayer[],
  teams: SandboxTeam[],
  locNameById: Map<string, string | null>,
) {
  const byTeam = new Map<string, SandboxPlayer[]>();
  for (const p of players) {
    const list = byTeam.get(p.teamId) ?? [];
    list.push(p);
    byTeam.set(p.teamId, list);
  }
  return [...teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      team,
      members: (byTeam.get(team.id) ?? [])
        .slice()
        .sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"))
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          zoneName: locNameById.get(p.locationId) ?? null,
          player: p,
        })),
    }));
}

