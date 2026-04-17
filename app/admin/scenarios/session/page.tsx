"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { advanceSessionPhase, beginHostingSession, endSession, getNextPhase } from "@/lib/api/scenarios";
import { getHostSessionDetails, getHostSessionVoteSummary } from "@/lib/api/play";
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
  { key: "final_vote", label: "최종 투표" },
  { key: "arrest_result", label: "검거 결과 발표" },
];

type TimedPhase = Exclude<ScenarioPhase, "waiting" | "arrest_result" | "session_ended">;

const PHASE_MINUTES: Record<TimedPhase, number> = {
  role_assignment: 10,
  first_investigation: 12,
  briefing: 8,
  second_investigation: 12,
  final_vote: 8,
};

function isTimedPhase(phase: ScenarioPhase): phase is TimedPhase {
  return phase !== "waiting" && phase !== "arrest_result" && phase !== "session_ended";
}

function formatHhMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function formatTimerDisplay(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h === 0) {
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function timerDigitsToSeconds(digits: string) {
  const padded = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  const seconds = Number(padded.slice(4, 6));
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTimerDigits(digits: string) {
  const padded = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

function secondsToTimerDigits(totalSeconds: number) {
  const formatted = formatHhMmSs(totalSeconds).replace(/:/g, "");
  return formatted.replace(/^0+/, "");
}

function PhaseTimerCard({ phase }: { phase: TimedPhase }) {
  const defaultMinutes = PHASE_MINUTES[phase];
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(defaultMinutes * 60);
  const [resetBaselineSec, setResetBaselineSec] = useState<number>(defaultMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [timerInputDigits, setTimerInputDigits] = useState(secondsToTimerDigits(defaultMinutes * 60));
  const timerInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!isEditing || !timerInputRef.current) return;
    const length = timerInputRef.current.value.length;
    timerInputRef.current.setSelectionRange(length, length);
  }, [isEditing, timerInputDigits]);

  const commitTimerValue = () => {
    const nextSeconds = timerDigitsToSeconds(timerInputDigits);
    setTimerRemainingSec(nextSeconds);
    setResetBaselineSec(nextSeconds);
    setIsTimerRunning(false);
    setTimerInputDigits(secondsToTimerDigits(nextSeconds));
    setIsEditing(false);
  };

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[rgba(36,40,43,0.55)] p-6">
      <h2 className="mb-4 text-center text-sm font-semibold text-[var(--foreground)]">타이머</h2>
      <div className="flex flex-col items-center gap-4">
        {isEditing ? (
          <Input
            ref={timerInputRef}
            autoFocus
            value={formatTimerDigits(timerInputDigits)}
            inputMode="numeric"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(-6);
              setTimerInputDigits(digits);
            }}
            onBlur={commitTimerValue}
            onKeyDown={(e) => {
              if (/^\d$/.test(e.key)) {
                e.preventDefault();
                setTimerInputDigits((prev) => (prev + e.key).slice(-6));
                return;
              }

              if (e.key === "Backspace") {
                e.preventDefault();
                setTimerInputDigits((prev) => prev.slice(0, -1));
                return;
              }

              if (e.key === "Enter") {
                e.preventDefault();
                commitTimerValue();
                return;
              }

              if (e.key === "Escape") {
                e.preventDefault();
                setTimerInputDigits(secondsToTimerDigits(timerRemainingSec));
                setIsEditing(false);
                return;
              }

              if (e.key === "Tab" || e.key.startsWith("Arrow")) return;

              e.preventDefault();
            }}
            className="h-20 !w-[9ch] border-none px-0 text-center font-mono text-5xl tabular-nums text-[var(--muted-foreground)] sm:text-6xl"
            aria-label="타이머 시간 입력"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTimerInputDigits("");
              setIsEditing(true);
            }}
            className="h-20 text-center font-mono text-5xl tabular-nums text-[var(--accent)] transition hover:text-[#dce48a] sm:text-6xl"
          >
            {formatTimerDisplay(timerRemainingSec)}
          </button>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => setIsTimerRunning((v) => !v)}>
            {isTimerRunning ? "일시정지" : "시작"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTimerRemainingSec(resetBaselineSec);
              setIsTimerRunning(false);
              setTimerInputDigits(secondsToTimerDigits(resetBaselineSec));
              setIsEditing(false);
            }}
          >
            초기화
          </Button>
        </div>
      </div>
    </section>
  );
}

function ScenarioSessionHostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id")?.trim() ?? "";
  const queryClient = useQueryClient();
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
    queryFn: () => getHostSessionDetails(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
  });

  const voteSummaryQuery = useQuery({
    queryKey: ["host-session-vote-summary", sessionId],
    queryFn: () => getHostSessionVoteSummary(sessionId),
    enabled: Boolean(sessionId && sessionQuery.data?.phase === "arrest_result"),
    staleTime: 0,
    refetchOnMount: "always",
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] });
      await queryClient.invalidateQueries({ queryKey: ["host-session-vote-summary", sessionId] });
    },
  });

  const hostLeaveRef = useRef({
    sessionId: "",
    shouldEnd: false,
    beginPending: false,
  });

  useEffect(() => {
    let leaveGuardReady = false;
    const tid = window.setTimeout(() => {
      leaveGuardReady = true;
    }, 100);

    const runEndSessionOnHostLeave = () => {
      if (!leaveGuardReady) return;
      const s = hostLeaveRef.current;
      if (s.beginPending) return;
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

  useEffect(() => {
    hostLeaveRef.current = {
      sessionId,
      shouldEnd: shouldEndOnHostLeave,
      beginPending: beginMutation.isPending,
    };
  }, [sessionId, shouldEndOnHostLeave, beginMutation.isPending]);

  const presencePlayersOnly = useMemo(
    () => presenceRows.filter((r) => r.payload.role === "player"),
    [presenceRows],
  );

  const playercount = presencePlayersOnly.length;

  const phase = (sessionQuery.data?.phase as ScenarioPhase) ?? "waiting";
  const nextPhase = getNextPhase(phase);
  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_ended";
  const shouldShowTimer = isTimedPhase(phase);

  if (!sessionId) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--muted-foreground)]">세션 ID가 없습니다.</p>
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
          <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
        </main>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--primary)]">세션을 불러올 수 없습니다.</p>
          <Button className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.admin.scenarios)}>
            목록으로
          </Button>
        </main>
      </div>
    );
  }

  const row = sessionQuery.data;
  const voteSummary = voteSummaryQuery.data;
  if (row.host_id !== authQuery.data?.user.id) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--accent)]">이 세션의 호스트가 아닙니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-8">
        <header
          className={`flex flex-wrap items-start justify-between gap-6 pb-6 ${!sessionStarted ? "border-b border-[var(--border)]" : ""}`}
        >
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-[var(--accent)] sm:text-4xl">
                {row.scenarios?.title}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Join code</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-[var(--accent)] sm:text-4xl">
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
            {sessionStarted && !sessionEnded && nextPhase ? (
                <Button
                  variant="secondary"
                  onClick={() => nextPhaseMutation.mutate()}
                  disabled={nextPhaseMutation.isPending}
                >
                  {nextPhaseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Next
                </Button>
            ) : null}
            {sessionEnded ? <span className="text-xs text-[var(--muted-foreground)]">종료됨</span> : null}
          </div>
        </header>
        
        {phase === "waiting" ? (
          <section className="space-y-3 p-4">
            {presencePlayersOnly.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">접속한 학생이 없습니다.</p>
            ) : (
              <ul className="flex flex-wrap w-full gap-2">
                {presencePlayersOnly.map((pr) => (
                  <li
                    key={pr.presenceKey}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] px-3 py-2 text-sm w-fit"
                  >
                    <span className="font-medium text-[var(--foreground)]">
                      {pr.payload.nickname ?? "Player"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {sessionStarted ? (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Phase</h2>
              <div className="grid gap-2 md:grid-cols-6">
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
                          ? "border-[var(--accent)] bg-[rgba(201,209,107,0.1)] text-[var(--accent)]"
                          : isDone
                            ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {phase.label}
                    </div>
                  );
                })}
              </div>
            </section>

            {shouldShowTimer ? <PhaseTimerCard key={phase} phase={phase} /> : null}

            {phase === "arrest_result" ? (
              <section className="space-y-4 rounded-lg border border-[var(--accent)]/40 bg-[rgba(36,40,43,0.55)] p-6">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--accent)]">최종 투표 결과</h2>
                </div>

                {voteSummaryQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                    결과를 집계하는 중…
                  </div>
                ) : voteSummaryQuery.isError ? (
                  <p className="text-sm text-[var(--primary)]">
                    {voteSummaryQuery.error instanceof Error
                      ? voteSummaryQuery.error.message
                      : "투표 결과를 불러오지 못했습니다."}
                  </p>
                ) : !voteSummary ? (
                  <p className="text-sm text-[var(--muted-foreground)]">투표 결과가 아직 없습니다.</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">투표 수</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{voteSummary.totalVotes}</p>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">최다 지목</p>
                        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                          {voteSummary.topVotedCharacterNames.length > 0
                            ? voteSummary.topVotedCharacterNames.join(", ")
                            : "없음"}
                        </p>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">검거 결과</p>
                        <p
                          className={`mt-2 text-sm font-semibold ${
                            voteSummary.culpritArrested ? "text-[var(--accent)]" : "text-[var(--primary)]"
                          }`}
                        >
                          {voteSummary.culpritArrested ? "범인 검거 성공" : "범인 검거 실패"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">시나리오 정답</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                        {row.scenarios?.solution ?? voteSummary.solution ?? "등록된 정답이 없습니다."}
                      </p>
                    </div>

                    <div className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">캐릭터별 득표</p>
                      {voteSummary.results.length === 0 ? (
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">집계할 캐릭터가 없습니다.</p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {voteSummary.results.map((result) => (
                            <li
                              key={result.characterId}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[rgba(36,40,43,0.35)] px-3 py-2 text-sm"
                            >
                              <div>
                                <span className="font-medium text-[var(--foreground)]">{result.name ?? "이름 없음"}</span>
                                {result.role ? <span className="ml-2 text-[var(--muted-foreground)]">{result.role}</span> : null}
                                {result.isCulprit ? <span className="ml-2 text-[var(--primary)]">정답</span> : null}
                                {result.isTopVoted ? <span className="ml-2 text-[var(--accent)]">최다 지목</span> : null}
                              </div>
                              <span className="font-mono text-[var(--foreground)]">{result.voteCount}표</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-40">
        <div className="pointer-events-auto rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.95)] px-3 py-2 text-sm text-[var(--foreground)] shadow-lg backdrop-blur">
          플레이어 <span className="font-semibold text-[var(--accent)]">{playercount}</span>명
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
            <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
          </main>
        </div>
      }
    >
      <ScenarioSessionHostContent />
    </Suspense>
  );
}
