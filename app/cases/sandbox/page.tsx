"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, type ReactNode } from "react";

import { SandboxStudentPanel } from "@/components/sandbox/sandbox-student-panel";
import { SandboxTeacherPanel } from "@/components/sandbox/sandbox-teacher-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { getCaseFull } from "@/lib/api/cases";
import type { CasePhase } from "@/lib/api/cases";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import {
  buildSandboxAssignments,
  createInitialSandboxState,
  nextSandboxPhase,
  type SandboxPlayerReport,
  type SandboxState,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

function SandboxPageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";
  const teacherSession = useRequireTeacherSession();

  const caseQuery = useQuery({
    queryKey: ["sandbox-case", caseId],
    queryFn: () => getCaseFull(caseId),
    enabled: Boolean(caseId && teacherSession.data),
  });

  const [state, setState] = useState<SandboxState>(() =>
    createInitialSandboxState(),
  );

  const beginSandbox = useCallback(() => {
    if (!caseQuery.data) return;
    if (caseQuery.data.locations.length === 0) return;
    const cid = caseId.trim();
    if (!cid) return;
    setState((prev) => {
      const { teams, players } = buildSandboxAssignments(
        cid,
        caseQuery.data!.locations,
        prev.realStudentNickname,
      );
      return { ...prev, phase: "briefing", teams, players };
    });
  }, [caseId, caseQuery.data]);

  const advancePhase = useCallback(() => {
    setState((prev) => {
      const next = nextSandboxPhase(prev.phase);
      if (!next) return prev;
      return { ...prev, phase: next };
    });
  }, []);

  const resetSandbox = useCallback(() => {
    setState((prev) => ({
      ...createInitialSandboxState(),
      realStudentNickname: prev.realStudentNickname,
    }));
  }, []);

  const joinAsStudent = useCallback((nickname: string) => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, realStudentNickname: trimmed }));
  }, []);

  const leaveAsStudent = useCallback(() => {
    setState((prev) => ({ ...prev, realStudentNickname: null }));
  }, []);

  const handleTeamCluesFound = useCallback(
    (teamId: string, clueIds: string[]) => {
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        const set = new Set(team.foundClueIds);
        let changed = false;
        for (const id of clueIds) {
          if (!set.has(id)) {
            set.add(id);
            changed = true;
          }
        }
        if (!changed) return prev;
        return {
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, foundClueIds: Array.from(set) } : t,
          ),
        };
      });
    },
    [],
  );

  const handleSubmitReport = useCallback(
    (
      playerId: string,
      report: {
        suspectId: string;
        method: string;
        motive: string;
        decisiveClue: string;
      },
    ) => {
      setState((prev) => {
        const idx = prev.players.findIndex((p) => p.id === playerId);
        if (idx < 0) return prev;
        if (prev.players[idx]!.report) return prev;
        const submission: SandboxPlayerReport = {
          suspectId: report.suspectId.trim(),
          method: report.method.trim(),
          motive: report.motive.trim(),
          decisiveClue: report.decisiveClue.trim(),
          submittedAt: new Date().toISOString(),
        };
        const nextPlayers = prev.players.slice();
        nextPlayers[idx] = { ...prev.players[idx]!, report: submission };
        return { ...prev, players: nextPlayers };
      });
    },
    [],
  );

  const phase: CasePhase = state.phase;

  if (!caseId) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--muted-foreground)]">
          사건 정보를 찾을 수 없습니다.
        </p>
      </SandboxFullPageMessage>
    );
  }

  if (
    teacherSession.isLoading ||
    (teacherSession.isFetching && !teacherSession.data)
  ) {
    return (
      <SandboxFullPageMessage>
        <LoadingState variant="page" />
      </SandboxFullPageMessage>
    );
  }

  if (caseQuery.isLoading) {
    return (
      <SandboxFullPageMessage>
        <LoadingState variant="page" />
      </SandboxFullPageMessage>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--danger)]">
          사건 데이터를 불러오지 못했습니다.
          {caseQuery.error instanceof Error
            ? ` ${caseQuery.error.message}`
            : null}
        </p>
      </SandboxFullPageMessage>
    );
  }

  const { caseRecord, locations, clues } = caseQuery.data;

  return (
    <main
      className="grid h-dvh min-h-0 w-full grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 lg:gap-4 lg:p-5"
      style={{
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, var(--surface))",
        backgroundImage:
          "radial-gradient(circle at 12% -10%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 50%), radial-gradient(circle at 90% 110%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 55%)",
      }}
    >
      <BrowserWindow title="교사 화면" tone="primary">
        <SandboxTeacherPanel
          caseRecord={caseRecord}
          locations={locations}
          phase={phase}
          teams={state.teams}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onBegin={beginSandbox}
          onAdvance={advancePhase}
          onResetPhase={resetSandbox}
        />
      </BrowserWindow>

      <BrowserWindow title="학생 화면" tone="accent">
        <SandboxStudentPanel
          caseRecord={caseRecord}
          locations={locations}
          clues={clues}
          phase={phase}
          teams={state.teams}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onJoinAsStudent={joinAsStudent}
          onLeaveAsStudent={leaveAsStudent}
          onTeamCluesFound={handleTeamCluesFound}
          onSubmitReport={handleSubmitReport}
        />
      </BrowserWindow>
    </main>
  );
}

/**
 * "브라우저 창" 외관 — 트래픽 라이트 + 화면 라벨 + 컨텐츠 영역.
 * 컨텐츠 자체가 내부 높이를 관리하도록 `min-h-0 flex-1 overflow-hidden` 컨테이너를
 * 그대로 자식에게 넘기며, 자식 패널이 `h-full` 로 채워 자체 스크롤을 가집니다.
 */
function BrowserWindow({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "primary" | "accent";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-[var(--card-bg)] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.45),0_8px_24px_-8px_rgba(0,0,0,0.25)]",
        tone === "primary"
          ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
          : "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2",
          tone === "primary"
            ? "bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))]"
            : "bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]",
        )}
      >
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:px-2 sm:text-[10px]",
            tone === "primary"
              ? "bg-[var(--primary)] text-[var(--on-primary)]"
              : "bg-[var(--accent)] text-[var(--background)]",
          )}
        >
          {title}
        </span>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
        {children}
      </div>
    </section>
  );
}

function SandboxFullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[var(--background)] p-8">
      {children}
    </div>
  );
}

export default function SandboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-[var(--background)]">
          <LoadingState variant="page" />
        </div>
      }
    >
      <SandboxPageContent />
    </Suspense>
  );
}
