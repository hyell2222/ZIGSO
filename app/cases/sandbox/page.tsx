"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, type ReactNode } from "react";

import { SandboxStudentPanel } from "@/components/sandbox/sandbox-student-panel";
import { SandboxTeacherPanel } from "@/components/sandbox/sandbox-teacher-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { getLesson, parseScenarioPack } from "@/lib/api/lessons";
import type { SessionPhase } from "@/lib/api/lessons";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { tryAcquireIngredient, tryCompleteMenu } from "@/lib/lunch/engine";
import type { AcquiredIngredient, CompletedMenu } from "@/lib/lunch/types";
import {
  buildSandboxAssignments,
  createInitialSandboxState,
  nextSandboxPhase,
  type SandboxState,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

function SandboxPageContent() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("case")?.trim() ?? searchParams.get("lesson")?.trim() ?? "";
  const teacherSession = useRequireTeacherSession();

  const lessonQuery = useQuery({
    queryKey: ["sandbox-lesson", lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: Boolean(lessonId && teacherSession.data),
  });

  const pack = parseScenarioPack(lessonQuery.data?.scenario_pack);

  const [state, setState] = useState<SandboxState>(() => createInitialSandboxState());

  const beginSandbox = useCallback(() => {
    if (!pack || !lessonId) return;
    setState((prev) => {
      const { teams, players } = buildSandboxAssignments(lessonId, pack, prev.realStudentNickname);
      return { ...prev, phase: "briefing", teams, players };
    });
  }, [lessonId, pack]);

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

  const handleAcquire = useCallback(
    (teamId: string, ingredientId: string, answer: string, hintStageUsed: 1 | 2 | 3 | 4 | 5) => {
      if (!pack) return;
      const result = tryAcquireIngredient(pack, ingredientId, answer, hintStageUsed);
      if (!result.ok) throw new Error(result.reason);
      setState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.id !== teamId) return t;
          if (t.acquired_ingredients.some((a) => a.ingredientId === ingredientId)) return t;
          return {
            ...t,
            acquired_ingredients: [...t.acquired_ingredients, result.record],
          };
        }),
      }));
    },
    [pack],
  );

  const handleCompleteMenu = useCallback(
    (teamId: string, menuId: string, submittedSteps: string[]) => {
      if (!pack) return;
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        const result = tryCompleteMenu(pack, menuId, team.acquired_ingredients, submittedSteps);
        if (!result.ok) throw new Error(result.reason);
        return {
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId
              ? { ...t, completed_menus: [...t.completed_menus, result.record] }
              : t,
          ),
        };
      });
    },
    [pack],
  );

  const handleSubmitTray = useCallback(
    (teamId: string) => {
      if (!pack) return;
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team || team.tray_submitted_at) return prev;
        const required = pack.menus.map((m) => m.id);
        const done = new Set(team.completed_menus.map((m) => m.menuId));
        if (required.some((id) => !done.has(id))) {
          throw new Error("아직 완성하지 않은 메뉴가 있습니다.");
        }
        return {
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, tray_submitted_at: new Date().toISOString() } : t,
          ),
        };
      });
    },
    [pack],
  );

  const phase: SessionPhase = state.phase;

  if (!lessonId) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--muted-foreground)]">수업 정보를 찾을 수 없습니다.</p>
      </SandboxFullPageMessage>
    );
  }

  if (teacherSession.isLoading || (teacherSession.isFetching && !teacherSession.data)) {
    return (
      <SandboxFullPageMessage>
        <LoadingState variant="page" />
      </SandboxFullPageMessage>
    );
  }

  if (lessonQuery.isLoading) {
    return (
      <SandboxFullPageMessage>
        <LoadingState variant="page" />
      </SandboxFullPageMessage>
    );
  }

  if (lessonQuery.isError || !lessonQuery.data || !pack) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--danger)]">
          수업 데이터를 불러오지 못했습니다.
          {lessonQuery.error instanceof Error ? ` ${lessonQuery.error.message}` : null}
        </p>
      </SandboxFullPageMessage>
    );
  }

  const lesson = lessonQuery.data;

  return (
    <main
      className="grid h-dvh min-h-0 w-full grid-cols-2 grid-rows-1 gap-3 p-3 sm:gap-4 sm:p-4"
      style={{
        backgroundColor: "color-mix(in srgb, var(--ink) 8%, var(--surface))",
        backgroundImage:
          "radial-gradient(circle at 12% -10%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 50%), radial-gradient(circle at 90% 110%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 55%)",
      }}
    >
      <BrowserWindow title="교사 화면" tone="primary" className="min-w-0">
        <SandboxTeacherPanel
          lessonTitle={lesson.title}
          pack={pack}
          lessonId={lessonId}
          phase={phase}
          teams={state.teams}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onBegin={beginSandbox}
          onAdvance={advancePhase}
          onResetPhase={resetSandbox}
        />
      </BrowserWindow>

      <BrowserWindow title="학생 화면" tone="accent" className="min-w-0">
        <SandboxStudentPanel
          lessonTitle={lesson.title}
          description={lesson.description}
          pack={pack}
          phase={phase}
          teams={state.teams}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onJoinAsStudent={joinAsStudent}
          onLeaveAsStudent={leaveAsStudent}
          onAcquire={handleAcquire}
          onCompleteMenu={handleCompleteMenu}
          onSubmitTray={handleSubmitTray}
        />
      </BrowserWindow>
    </main>
  );
}

function BrowserWindow({
  title,
  tone,
  children,
  className,
}: {
  title: string;
  tone: "primary" | "accent";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-[var(--card-bg)] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.45),0_8px_24px_-8px_rgba(0,0,0,0.25)]",
        tone === "primary"
          ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
          : "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]",
        className,
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
