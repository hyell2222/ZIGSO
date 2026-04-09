"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { advanceSessionPhase, beginHostingSession, endSession, getNextPhase } from "@/lib/api/scenarios";
import { getSessionDetails } from "@/lib/api/play";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import {
  flattenPresenceState,
  getSessionRoomChannelName,
  type SessionPresenceRow,
} from "@/lib/realtime/session-presence";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import type { ScenarioPhase } from "@/lib/api/scenarios";

const PHASES: { key: ScenarioPhase; label: string }[] = [
  { key: "role_assignment", label: "역할 분담 및 사건 인지" },
  { key: "first_investigation", label: "1차 현장 검증" },
  { key: "briefing", label: "브리핑" },
  { key: "second_investigation", label: "2차 현장 검증" },
  { key: "final_vote", label: "최종 투표 및 검거" },
];

const PHASE_MINUTES: Record<ScenarioPhase, number> = {
  waiting: 10,
  role_assignment: 10,
  first_investigation: 12,
  briefing: 8,
  second_investigation: 12,
  final_vote: 8,
  session_ended: 10,
};

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function ScenarioSessionHostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id")?.trim() ?? "";
  const queryClient = useQueryClient();
  const [timerInputMinutes, setTimerInputMinutes] = useState<number>(10);
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(10 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [presenceRows, setPresenceRows] = useState<SessionPresenceRow[]>([]);

  const authQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["host-session", sessionId],
    queryFn: () => getSessionDetails(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
  });

  const hostUserId = authQuery.data?.user?.id;
  const isVerifiedHost = Boolean(
    sessionId &&
      hostUserId &&
      sessionQuery.data &&
      sessionQuery.data.host_id === hostUserId,
  );

  useEffect(() => {
    if (!hasSupabaseEnv || !sessionId || !isVerifiedHost || !hostUserId) return;

    const channel = supabase
      .channel(getSessionRoomChannelName(sessionId), {
        config: {
          presence: {
            key: `host:${hostUserId}`,
          },
        },
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] });
        },
      )
      .on("presence", { event: "sync" }, () => {
        setPresenceRows(flattenPresenceState(channel.presenceState()));
      })
      .on("presence", { event: "join" }, () => {
        setPresenceRows(flattenPresenceState(channel.presenceState()));
      })
      .on("presence", { event: "leave" }, () => {
        setPresenceRows(flattenPresenceState(channel.presenceState()));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role: "host",
            nickname: "호스트",
          });
        }
      });

    return () => {
      setPresenceRows([]);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient, isVerifiedHost, hostUserId]);

  useEffect(() => {
    if (authQuery.isLoading) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.signIn);
      return;
    }
    if (!authQuery.data) router.replace(ROUTES.admin.signIn);
  }, [router, authQuery.data, authQuery.isLoading]);

  useEffect(() => {
    const phase = (sessionQuery.data?.phase as ScenarioPhase) ?? "waiting";
    const defaultMinutes = PHASE_MINUTES[phase] ?? 10;
    setTimerInputMinutes(defaultMinutes);
    setTimerRemainingSec(defaultMinutes * 60);
    setIsTimerRunning(false);
  }, [sessionQuery.data?.phase]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(() => {
      setTimerRemainingSec((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTimerRunning]);

  const beginMutation = useMutation({
    mutationFn: () => beginHostingSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] }),
  });

  const nextPhaseMutation = useMutation({
    mutationFn: async () => {
      const current = sessionQuery.data?.phase ?? "waiting";
      const next = getNextPhase(current);
      if (!next) throw new Error("Already at final phase.");
      await advanceSessionPhase(sessionId, next);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] }),
  });

  const endMutation = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] });
      router.push(ROUTES.admin.scenarios);
    },
  });

  const hostLeaveRef = useRef({
    sessionId: "",
    shouldEnd: false,
    beginPending: false,
    endPending: false,
  });

  useEffect(() => {
    let leaveGuardReady = false;
    const tid = window.setTimeout(() => {
      leaveGuardReady = true;
    }, 100);

    const runEndSessionOnHostLeave = () => {
      if (!leaveGuardReady) return;
      const s = hostLeaveRef.current;
      if (s.beginPending || s.endPending) return;
      if (!s.shouldEnd || !s.sessionId) return;
      void endSession(s.sessionId);
    };

    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      runEndSessionOnHostLeave();
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener("pagehide", onPageHide);
      runEndSessionOnHostLeave();
    };
  }, []);

  const sessionRowForLeave = sessionQuery.data;
  const isHostOfLoadedSession = Boolean(
    sessionId && sessionRowForLeave && hostUserId && sessionRowForLeave.host_id === hostUserId,
  );
  const phaseForLeave = sessionRowForLeave?.phase ?? null;
  const shouldEndOnHostLeave =
    isHostOfLoadedSession && phaseForLeave !== "session_ended";

  hostLeaveRef.current = {
    sessionId,
    shouldEnd: shouldEndOnHostLeave,
    beginPending: beginMutation.isPending,
    endPending: endMutation.isPending,
  };

  const presencePlayersOnly = useMemo(
    () => presenceRows.filter((r) => r.payload.role === "player"),
    [presenceRows],
  );

  const playercount = presencePlayersOnly.length;

  const phase = (sessionQuery.data?.phase as ScenarioPhase) ?? "waiting";
  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_ended";

  if (!sessionId) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-slate-400">세션 ID가 없습니다.</p>
          <Button className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.admin.scenarios)}>
            목록으로
          </Button>
        </main>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-slate-400">불러오는 중…</p>
        </main>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-red-400">세션을 불러올 수 없습니다.</p>
          <Button className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.admin.scenarios)}>
            목록으로
          </Button>
        </main>
      </div>
    );
  }

  const row = sessionQuery.data;
  if (row.host_id !== authQuery.data?.user.id) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-amber-200">이 세션의 호스트가 아닙니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-8">
        <header
          className={`flex flex-wrap items-start justify-between gap-6 pb-6 ${!sessionStarted ? "border-b border-slate-800" : ""}`}
        >
          <div className="min-w-0 flex-1 space-y-3">
            <Button variant="secondary" onClick={() => router.push(ROUTES.admin.scenarios)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-cyan-300 sm:text-4xl">
                {row.scenarios?.title}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Join code</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-cyan-300 sm:text-4xl">
                {row.join_code}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            {!sessionStarted ? (
              <Button onClick={() => beginMutation.mutate()} disabled={beginMutation.isPending}>
                {beginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start
              </Button>
            ) : null}
            {sessionStarted && !sessionEnded ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => nextPhaseMutation.mutate()}
                  disabled={nextPhaseMutation.isPending || !getNextPhase(row.phase)}
                >
                  {nextPhaseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Next
                </Button>
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-red-300"
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                >
                  {endMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  End
                </Button>
              </>
            ) : null}
            {sessionEnded ? <span className="text-xs text-slate-500">종료됨</span> : null}
          </div>
        </header>
        
        {phase === "waiting" ? (
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <h2 className="text-sm font-semibold text-slate-300">실시간 접속</h2>
            {presencePlayersOnly.length === 0 ? (
              <p className="text-sm text-slate-500">접속한 학생이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {presencePlayersOnly.map((pr) => (
                  <li
                    key={pr.presenceKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-100">{pr.payload.nickname ?? "Player"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {sessionStarted ? (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">Phase</h2>
              <div className="grid gap-2 md:grid-cols-5">
                {PHASES.map((phase, idx) => {
                  const currentIdx = PHASES.findIndex(
                    (p) => p.key === ((row.phase as ScenarioPhase) ?? "role_assignment"),
                  );
                  const isCurrent = idx === currentIdx;
                  const isDone = idx < currentIdx;
                  return (
                    <div
                      key={phase.key}
                      className={`rounded-md border px-2 py-2 text-center text-xs leading-snug ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                          : isDone
                            ? "border-slate-700 bg-slate-800 text-slate-200"
                            : "border-slate-800 text-slate-500"
                      }`}
                    >
                      {phase.label}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="mb-4 text-center text-sm font-semibold text-slate-300">타이머</h2>
              <div className="flex flex-col items-center gap-4">
                <span className="font-mono text-5xl tabular-nums text-cyan-200 sm:text-6xl">
                  {formatMmSs(timerRemainingSec)}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={timerInputMinutes}
                    onChange={(e) => setTimerInputMinutes(Number(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-500">분</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTimerRemainingSec(Math.max(1, timerInputMinutes) * 60);
                      setIsTimerRunning(false);
                    }}
                  >
                    설정
                  </Button>
                  <Button size="sm" onClick={() => setIsTimerRunning((v) => !v)}>
                    {isTimerRunning ? "일시정지" : "시작"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const phase = (row.phase as ScenarioPhase) ?? "role_assignment";
                      const defaults = PHASE_MINUTES[phase];
                      setTimerInputMinutes(defaults);
                      setTimerRemainingSec(defaults * 60);
                      setIsTimerRunning(false);
                    }}
                  >
                    초기화
                  </Button>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-40">
        <div className="pointer-events-auto rounded-md border border-slate-700 bg-slate-950/95 px-3 py-2 text-sm text-slate-200 shadow-lg backdrop-blur">
          플레이어 <span className="font-semibold text-cyan-300">{playercount}</span>명
        </div>
      </div>
    </div>
  );
}

export default function ScenarioSessionHostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-8">
            <p className="text-sm text-slate-400">불러오는 중…</p>
          </main>
        </div>
      }
    >
      <ScenarioSessionHostContent />
    </Suspense>
  );
}
