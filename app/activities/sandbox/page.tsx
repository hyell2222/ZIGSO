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
import { tryAcquireWordCard, tryPlaceWordCard, isWorksheetComplete } from "@/lib/activity-pack/engine";
import type { WordCard } from "@/lib/activity-pack/types";
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

  const handleAcquire = useCallback(
    (groupId: string, playerId: string, itemId: string, answer: string, clueLevelUsed: 1 | 2 | 3 | 4 | 5) => {
      if (!pack) return;
      const result = tryAcquireWordCard(pack, itemId, answer, clueLevelUsed);
      if (!result.ok) throw new Error(result.reason);
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.word_cards.some((c) => c.itemId === itemId && !c.placedAt)) return p;
          return { ...p, word_cards: [...p.word_cards, result.record] };
        }),
      }));
    },
    [pack],
  );

  const handlePlaceWord = useCallback(
    (groupId: string, actorPlayerId: string, slotOwnerPlayerId: string, slotId: string, itemId: string) => {
      if (!pack) return;
      setState((prev) => {
        const group = prev.groups.find((t) => t.id === groupId);
        const actor = prev.players.find((p) => p.id === actorPlayerId);
        const owner = prev.players.find((p) => p.id === slotOwnerPlayerId);
        if (!group || !actor || !owner) return prev;

        const result = tryPlaceWordCard(pack, actor.word_cards, group.worksheet_placements, {
          actorPlayerId,
          slotOwnerPlayerId,
          slotOwnerRoleId: owner.roleId,
          slotId,
          itemId,
        });
        if (!result.ok) throw new Error(result.reason);

        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === actorPlayerId
              ? {
                  ...p,
                  word_cards: p.word_cards.map((c) =>
                    c.itemId === itemId && !c.placedAt ? result.updatedCard : c,
                  ),
                }
              : p,
          ),
          groups: prev.groups.map((t) =>
            t.id === groupId
              ? { ...t, worksheet_placements: [...t.worksheet_placements, result.record] }
              : t,
          ),
        };
      });
    },
    [pack],
  );

  const handleCompleteActivity = useCallback(
    (groupId: string) => {
      if (!pack) return;
      setState((prev) => {
        const group = prev.groups.find((t) => t.id === groupId);
        if (!group || group.completed_at) return prev;
        if (!isWorksheetComplete(pack, group.worksheet_placements)) {
          throw new Error("아직 채우지 않은 학습지 빈칸이 있습니다.");
        }
        return {
          ...prev,
          groups: prev.groups.map((t) =>
            t.id === groupId ? { ...t, completed_at: new Date().toISOString() } : t,
          ),
        };
      });
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
          description={activity.description}
          pack={pack}
          phase={phase}
          groups={state.groups}
          players={state.players}
          realStudentNickname={state.realStudentNickname}
          onJoinAsStudent={joinAsStudent}
          onLeaveAsStudent={leaveAsStudent}
          onAcquire={(groupId, itemId, answer, clueStage) =>
            handleAcquire(groupId, SANDBOX_REAL_STUDENT_PLAYER_ID, itemId, answer, clueStage)
          }
          onPlaceWord={handlePlaceWord}
          onCompleteActivity={handleCompleteActivity}
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
