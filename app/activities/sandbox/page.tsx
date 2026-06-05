"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { isSessionEnded } from "@/lib/activity-phases";

import { SandboxStudentPanel } from "@/components/sandbox/sandbox-student-panel";
import { SandboxTeacherPanel } from "@/components/sandbox/sandbox-teacher-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { getActivity, parseActivityPack } from "@/lib/api/activities";
import type { ActivityPhase } from "@/lib/api/activities";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import {
  getPeerPracticeQuestions,
  getTestQuestions,
  isPeerPracticeComplete,
  isQuizComplete,
  PLAYER_MESSAGES,
} from "@/lib/activity-pack/engine";
import type { PracticeQuestionResult } from "@/lib/activity-pack/types";
import type { QuizAnswer } from "@/lib/activity-pack/types";
import {
  buildSandboxAssignments,
  createInitialSandboxState,
  nextSandboxPhase,
  SANDBOX_REAL_STUDENT_PLAYER_ID,
  type SandboxState,
} from "@/lib/sandbox/state";
import { cn } from "@/lib/utils";

function SandboxPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity")?.trim() ?? "";
  const teacherSession = useRequireTeacherSession();

  const activityQuery = useQuery({
    queryKey: ["sandbox-activity", activityId],
    queryFn: () => getActivity(activityId),
    enabled: Boolean(activityId && teacherSession.data),
  });

  const pack = parseActivityPack(activityQuery.data?.activity_pack);

  const [state, setState] = useState<SandboxState>(() => createInitialSandboxState());

  const beginSandbox = useCallback(() => {
    if (!pack || !activityId) return;
    setState((prev) => {
      const { groups, players } = buildSandboxAssignments(activityId, pack, prev.realStudentNickname);
      return { ...prev, phase: "overview", groups, players };
    });
  }, [activityId, pack]);

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

  const handleSubmitPractice = useCallback(
    (playerId: string, results: PracticeQuestionResult[], baseScore: number) => {
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                base_score: baseScore,
                practice_results: results,
                practice_submitted_at: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    [],
  );

  const applyHomeGroupProgress = useCallback(
    (playerId: string, questionId?: string) => {
      if (!pack) return;
      setState((prev) => {
        const player = prev.players.find((p) => p.id === playerId);
        if (!player) return prev;
        const groupPlayers = prev.players.filter((p) => p.groupId === player.groupId);
        const memberRoleIds = groupPlayers.map((p) => p.roleId);
        const peerQuestions = getPeerPracticeQuestions(pack, memberRoleIds, player.roleId);
        const completed = questionId
          ? [...new Set([...(player.peer_practice_completed ?? []), questionId])]
          : (player.peer_practice_completed ?? []);
        const allDone = isPeerPracticeComplete(peerQuestions, completed);
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  peer_practice_completed: completed,
                  home_group_completed_at:
                    allDone && !p.home_group_completed_at
                      ? new Date().toISOString()
                      : p.home_group_completed_at,
                }
              : p,
          ),
        };
      });
    },
    [pack],
  );

  const handlePeerQuestionComplete = useCallback(
    (playerId: string, questionId: string) => {
      applyHomeGroupProgress(playerId, questionId);
    },
    [applyHomeGroupProgress],
  );

  const handleEnsureHomeGroupComplete = useCallback(
    (playerId: string) => {
      applyHomeGroupProgress(playerId);
    },
    [applyHomeGroupProgress],
  );

  const handleSubmitIndividualQuiz = useCallback(
    (playerId: string, answers: QuizAnswer[]) => {
      if (!pack) return;
      if (!isQuizComplete(getTestQuestions(pack), answers)) {
        throw new Error(PLAYER_MESSAGES.quizIncomplete);
      }
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                individual_quiz_answers: answers,
                individual_quiz_submitted_at: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    [pack],
  );

  const phase: ActivityPhase = state.phase;
  const sessionStatus = state.status;

  const sandboxLeaveRef = useRef({ shouldEnd: false });

  useEffect(() => {
    sandboxLeaveRef.current.shouldEnd =
      phase !== "waiting" && !isSessionEnded(sessionStatus);
  }, [phase, sessionStatus]);

  useEffect(() => {
    const endSandboxOnLeave = () => {
      if (!sandboxLeaveRef.current.shouldEnd) return;
      setState((prev) =>
        isSessionEnded(prev.status) ? prev : { ...prev, status: "ended" },
      );
    };

    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      endSandboxOnLeave();
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      endSandboxOnLeave();
    };
  }, []);

  if (!activityId) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--muted-foreground)]">활동 정보를 찾을 수 없습니다.</p>
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

  if (activityQuery.isLoading) {
    return (
      <SandboxFullPageMessage>
        <LoadingState variant="page" />
      </SandboxFullPageMessage>
    );
  }

  if (activityQuery.isError || !activityQuery.data || !pack) {
    return (
      <SandboxFullPageMessage>
        <p className="text-sm text-[var(--danger)]">
          활동 데이터를 불러오지 못했습니다.
          {activityQuery.error instanceof Error ? ` ${activityQuery.error.message}` : null}
        </p>
      </SandboxFullPageMessage>
    );
  }

  const activity = activityQuery.data;

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
          activityTitle={activity.title}
          pack={pack}
          activityId={activityId}
          phase={phase}
          sessionStatus={sessionStatus}
          groups={state.groups}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onBegin={beginSandbox}
          onAdvance={advancePhase}
          onResetPhase={resetSandbox}
        />
      </BrowserWindow>

      <BrowserWindow title="학생 화면" tone="accent" className="min-w-0">
        <SandboxStudentPanel
          activityId={activityId}
          activityTitle={activity.title}
          pack={pack}
          phase={phase}
          groups={state.groups}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onJoinAsStudent={joinAsStudent}
          onLeaveAsStudent={leaveAsStudent}
          realStudentPlayerId={SANDBOX_REAL_STUDENT_PLAYER_ID}
          onSubmitPractice={handleSubmitPractice}
          onSubmitIndividualQuiz={handleSubmitIndividualQuiz}
          onPeerQuestionComplete={handlePeerQuestionComplete}
          onEnsureHomeGroupComplete={handleEnsureHomeGroupComplete}
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
      <div className="@container relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
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
