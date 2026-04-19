"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import {
  getHostSessionDetails,
  listSessionPlayers,
  listSessionTeams,
  type SessionPlayerRow,
  type TeamRow,
} from "@/lib/api/play";
import { advanceSessionPhase, beginHostingSession, endSession, getNextPhase } from "@/lib/api/scenarios";
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
  { key: "briefing", label: "사건 파악" },
  { key: "investigation", label: "단서 수집" },
  { key: "resolution", label: "사건 해결" },
];

type TimedPhase = Exclude<ScenarioPhase, "waiting" | "session_end">;

const PHASE_MINUTES: Record<TimedPhase, number> = {
  briefing: 10,
  investigation: 12,
  resolution: 8,
};

function isTimedPhase(phase: ScenarioPhase): phase is TimedPhase {
  return phase !== "waiting" && phase !== "session_end";
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

type TeamGroup = {
  team: TeamRow;
  members: SessionPlayerRow[];
};

function groupPlayersByTeam(players: SessionPlayerRow[], teams: TeamRow[]): TeamGroup[] {
  const playersByTeamId = new Map<string, SessionPlayerRow[]>();
  for (const p of players) {
    if (!p.team_id) continue;
    const list = playersByTeamId.get(p.team_id) ?? [];
    list.push(p);
    playersByTeamId.set(p.team_id, list);
  }
  return [...teams]
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((team) => ({
      team,
      members: (playersByTeamId.get(team.id) ?? []).sort((a, b) =>
        (a.characters?.name ?? "").localeCompare(b.characters?.name ?? ""),
      ),
    }));
}

function TeamAssignmentDashboard({
  players,
  teams,
  loading,
}: {
  players: SessionPlayerRow[];
  teams: TeamRow[];
  loading: boolean;
}) {
  const groups = useMemo(() => groupPlayersByTeam(players, teams), [players, teams]);
  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[rgba(36,40,43,0.55)] p-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">팀·캐릭터 배정</h2>
        <span className="text-xs text-[var(--muted-foreground)]">총 {players.length}명</span>
      </header>
      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">배정된 팀이 없습니다.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.team.id}
              className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.45)] p-3"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Team
              </p>
              <p className="font-mono text-2xl font-semibold text-[var(--accent)]">{g.team.name ?? "—"}</p>
              <ul className="mt-2 space-y-1">
                {g.members.length === 0 ? (
                  <li className="rounded border border-dashed border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted-foreground)]">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1.5 text-xs"
                    >
                      <span className="text-[var(--foreground)]">{m.nickname ?? "Player"}</span>
                      <span className="text-[var(--accent)]">{m.characters?.name ?? "—"}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TeamSuccessDashboard({
  players,
  teams,
  loading,
}: {
  players: SessionPlayerRow[];
  teams: TeamRow[];
  loading: boolean;
}) {
  const groups = useMemo(() => groupPlayersByTeam(players, teams), [players, teams]);
  const solvedCount = teams.filter((t) => t.is_solved).length;

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[rgba(36,40,43,0.55)] p-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">사건 해결 현황</h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          성공 {solvedCount} / {teams.length}
        </span>
      </header>
      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">학생이 없습니다.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const solved = Boolean(g.team.is_solved);
            const solvedAt = g.team.solved_at;
            return (
              <div
                key={g.team.id}
                className={`rounded-md border p-3 ${
                  solved
                    ? "border-[var(--accent)] bg-[rgba(201,209,107,0.12)]"
                    : "border-[var(--border)] bg-[rgba(15,17,19,0.45)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-2xl font-semibold text-[var(--accent)]">
                    Team {g.team.name ?? "—"}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      solved
                        ? "bg-[var(--accent)] text-black"
                        : "border border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {solved ? "성공" : "진행 중"}
                  </span>
                </div>
                {solvedAt ? (
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    {new Date(solvedAt).toLocaleTimeString()}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1">
                  {g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1.5 text-xs"
                    >
                      <span className="text-[var(--foreground)]">{m.nickname ?? "Player"}</span>
                      <span className="text-[var(--accent)]">{m.characters?.name ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
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

  const playersQuery = useQuery({
    queryKey: ["host-session-players", sessionId],
    queryFn: () => listSessionPlayers(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamsQuery = useQuery({
    queryKey: ["host-session-teams", sessionId],
    queryFn: () => listSessionTeams(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["host-session-players", sessionId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["host-session-teams", sessionId] });
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
    isHostOfLoadedSession && phaseForLeave !== "session_end";

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
  const sessionEnded = phase === "session_end";
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
                {PHASES.map((p, idx) => {
                  const currentIdx = PHASES.findIndex((x) => x.key === phase);
                  const isCurrent = idx === currentIdx;
                  const isDone = idx < currentIdx;
                  return (
                    <div
                      key={p.key}
                      className={`rounded-md border px-2 py-2 text-center text-xs leading-snug ${
                        isCurrent
                          ? "border-[var(--accent)] bg-[rgba(201,209,107,0.1)] text-[var(--accent)]"
                          : isDone
                            ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {p.label}
                    </div>
                  );
                })}
              </div>
            </section>

            {shouldShowTimer ? <PhaseTimerCard key={phase} phase={phase} /> : null}

            {phase === "briefing" || phase === "investigation" ? (
              <TeamAssignmentDashboard
                players={playersQuery.data ?? []}
                teams={teamsQuery.data ?? []}
                loading={playersQuery.isLoading || teamsQuery.isLoading}
              />
            ) : null}

            {phase === "resolution" || phase === "session_end" ? (
              <TeamSuccessDashboard
                players={playersQuery.data ?? []}
                teams={teamsQuery.data ?? []}
                loading={playersQuery.isLoading || teamsQuery.isLoading}
              />
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
