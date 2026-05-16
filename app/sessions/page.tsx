"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import {
  getHostSessionDetails,
  listSessionPlayerReports,
  listSessionPlayers,
  listSessionTeams,
  setPlayersOnline,
} from "@/lib/api/play";
import { parseSuspectRosterFromCase } from "@/lib/suspects";
import {
  advanceSessionPhase,
  beginHostingSession,
  endSession,
  getNextPhase,
  type CasePhase,
} from "@/lib/api/cases";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { groupPlayersByTeam } from "@/lib/teacher/group-players-by-team";
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
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
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { ROUTES } from "@/lib/routes";
import {
  flattenPresenceState,
  getSessionRoomChannelName,
  type SessionPresenceRow,
} from "@/lib/realtime/session-presence";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { isTimedPhase, type TimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

function SessionHostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const queryClient = useQueryClient();
  const [presenceRows, setPresenceRows] = useState<SessionPresenceRow[]>([]);
  /** 단계가 바뀌면 열었던 단계와 달라져 모달이 닫히도록 phaseAtOpen 을 둠 (effect 내 setState 회피) */
  const [timerModal, setTimerModal] = useState<{ open: boolean; phaseAtOpen: CasePhase | null }>({
    open: false,
    phaseAtOpen: null,
  });

  const teacherSession = useRequireTeacherSession();

  const sessionQuery = useQuery({
    queryKey: ["host-session", sessionId],
    queryFn: () => getHostSessionDetails(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
  });

  const playersQuery = useQuery({
    queryKey: ["host-session-players", sessionId],
    queryFn: () => listSessionPlayers(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamsQuery = useQuery({
    queryKey: ["host-session-teams", sessionId],
    queryFn: () => listSessionTeams(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const reportsQuery = useQuery({
    queryKey: ["host-session-player-reports", sessionId],
    queryFn: () => listSessionPlayerReports(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const hostUserId = teacherSession.data?.user?.id;
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_reports", filter: `session_id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["host-session-player-reports", sessionId] });
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
            nickname: "선생님",
          });
        }
      });

    return () => {
      setPresenceRows([]);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient, isVerifiedHost, hostUserId]);

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
      return next;
    },
    onSuccess: async (endedPhase) => {
      await queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] });
      if (endedPhase === "session_end") {
        router.push(ROUTES.cases);
      }
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

  // presence 가 단일 진리원. DB.is_online 은 presence 와 양방향 동기화된다.
  // - presence 에 있는데 DB false → true 로 보정
  // - presence 에 없는데 DB true → 짧은 유예 후 false 로 보정
  // 유예는 (a) 새 플레이어가 track() 을 끝낼 시간, (b) presence 가 일시적으로
  // 비는 짧은 순간을 흡수하기 위함이다. heartbeat 가 10s 라 6s 이면 충분.
  const PRESENCE_GRACE_MS = 6000;
  const playerFirstSeenRef = useRef(new Map<string, number>());
  const lastPresenceSeenRef = useRef(new Map<string, number>());

  useEffect(() => {
    const players = playersQuery.data;
    if (!players) return;

    const now = Date.now();
    const seen = playerFirstSeenRef.current;
    const lastSeen = lastPresenceSeenRef.current;
    for (const p of players) {
      if (!seen.has(p.id)) seen.set(p.id, now);
    }

    const onlinePlayerIds = new Set<string>();
    for (const r of presenceRows) {
      if (r.payload.role === "player" && r.payload.player_id) {
        onlinePlayerIds.add(r.payload.player_id);
        lastSeen.set(r.payload.player_id, now);
      }
    }

    const toOnline: string[] = [];
    const toOffline: string[] = [];
    for (const p of players) {
      const dbOnline = p.is_online === true;
      const presenceOnline = onlinePlayerIds.has(p.id);
      if (presenceOnline && !dbOnline) {
        toOnline.push(p.id);
        continue;
      }
      if (!presenceOnline && dbOnline) {
        // 마지막으로 presence 에 있었던 시점, 또는 처음 본 시점 중 더 늦은 쪽 기준
        const baseline = Math.max(seen.get(p.id) ?? now, lastSeen.get(p.id) ?? 0);
        if (now - baseline < PRESENCE_GRACE_MS) continue;
        toOffline.push(p.id);
      }
    }

    if (toOnline.length > 0) void setPlayersOnline(toOnline, true).catch(() => {});
    if (toOffline.length > 0) void setPlayersOnline(toOffline, false).catch(() => {});
  }, [presenceRows, playersQuery.data]);

  // presence 가 더 자주 바뀌어도 일정 주기로 재조정 (마지막 본 시각 기반 오프라인 판정용)
  useEffect(() => {
    if (!hasSupabaseEnv || !sessionId) return;
    const id = window.setInterval(() => {
      // 의존성 배열 트리거를 위한 더미 재설정
      setPresenceRows((rows) => rows.slice());
    }, 2000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const onlinePlayers = useMemo(
    () => (playersQuery.data ?? []).filter((p) => p.is_online === true),
    [playersQuery.data],
  );

  /** 대기 칩: DB `created_at` 기준 최근 참가가 앞 (같은 시각이면 닉네임) */
  const waitingLobbyPlayers = useMemo(
    () =>
      [...onlinePlayers].sort((a, b) => {
        const ta = Date.parse(a.created_at);
        const tb = Date.parse(b.created_at);
        const na = Number.isNaN(ta) ? 0 : ta;
        const nb = Number.isNaN(tb) ? 0 : tb;
        if (na !== nb) return nb - na;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
      }),
    [onlinePlayers],
  );

  const playercount = onlinePlayers.length;

  const teamRows = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const reportRows = useMemo(
    () => reportsQuery.data ?? [],
    [reportsQuery.data],
  );

  const assignmentGroups = useMemo<TeamAssignmentGroup[]>(() => {
    return groupPlayersByTeam(onlinePlayers, teamRows).map((g) => ({
      team: { id: g.team.id, name: g.team.name },
      members: g.members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        zoneName: m.investigation_zone?.name ?? null,
      })),
    }));
  }, [onlinePlayers, teamRows]);

  const reportByPlayerId = useMemo(
    () => new Map(reportRows.map((r) => [r.player_id, r])),
    [reportRows],
  );

  const reportGroups = useMemo<TeamReportGroup[]>(() => {
    return groupPlayersByTeam(onlinePlayers, teamRows).map((g) => ({
      team: { id: g.team.id, name: g.team.name },
      members: g.members.map((m) => {
        const r = reportByPlayerId.get(m.id);
        return {
          id: m.id,
          nickname: m.nickname,
          report: r ? { suspectId: r.suspect_id } : null,
        };
      }),
    }));
  }, [onlinePlayers, teamRows, reportByPlayerId]);

  const reportRoster = useMemo(
    () => parseSuspectRosterFromCase(sessionQuery.data?.cases?.suspect_roster),
    [sessionQuery.data?.cases?.suspect_roster],
  );

  const phase = (sessionQuery.data?.phase as CasePhase) ?? "waiting";
  const nextPhase = getNextPhase(phase);
  const nextPhaseLabel = nextPhase === "session_end" ? "종료" : "다음 단계";
  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_end";
  const shouldShowTimer = isTimedPhase(phase);

  const timerToolOpen =
    timerModal.open &&
    timerModal.phaseAtOpen !== null &&
    timerModal.phaseAtOpen === phase &&
    shouldShowTimer;

  const openTimerModal = () => {
    if (!shouldShowTimer) return;
    setTimerModal({ open: true, phaseAtOpen: phase });
  };

  const closeTimerModal = () => setTimerModal({ open: false, phaseAtOpen: null });

  if (!sessionId) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--muted-foreground)]">플레이 세션을 찾을 수 없습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.reports)}>
            플레이 세션 기록
          </Button>
        </main>
      </div>
    );
  }

  if (teacherSession.isLoading || (teacherSession.isFetching && !teacherSession.data)) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
          <LoadingState variant="page" />
        </main>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
          <LoadingState variant="page" />
        </main>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--danger)]">플레이 세션을 불러오지 못했습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.reports)}>
            플레이 세션 기록
          </Button>
        </main>
      </div>
    );
  }

  const row = sessionQuery.data;
  if (row.host_id !== teacherSession.data?.user.id) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--accent)]">이 플레이 세션을 진행할 권한이 없습니다.</p>
        </main>
      </div>
    );
  }

  const timerButton = shouldShowTimer ? (
    <Button
      type="button"
      variant="secondary"
      className="shrink-0 gap-2"
      aria-haspopup="dialog"
      aria-expanded={timerToolOpen}
      onClick={openTimerModal}
    >
      <Timer className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
      타이머
    </Button>
  ) : null;

  const startButton = !sessionStarted ? (
    <Button
      type="button"
      onClick={() => beginMutation.mutate()}
      disabled={beginMutation.isPending}
      className="gap-2"
    >
      {beginMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
        </>
      ) : (
        <>플레이 세션 시작</>
      )}
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded && nextPhase ? (
      <Button
        type="button"
        onClick={() => nextPhaseMutation.mutate()}
        disabled={nextPhaseMutation.isPending}
        className="gap-2"
      >
        {nextPhaseMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
          </>
        ) : (
          <>{nextPhaseLabel}</>
        )}
      </Button>
    ) : null;

  const showPhaseGuide = phase !== "waiting" && phase !== "session_end";
  const showPhaseActions = Boolean(timerButton || startButton || nextButton);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pt-5 sm:space-y-5 sm:px-6 sm:pt-6 md:space-y-6 md:px-8 md:pb-12 md:pt-8">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 md:flex-row md:flex-wrap md:items-start md:gap-5">
          <div className="min-w-0 flex-1 space-y-1 md:min-w-[12rem]">
            <p className="break-words font-mono text-2xl font-semibold leading-tight tracking-wide text-[var(--accent)] sm:text-3xl md:text-4xl lg:text-[2.5rem] lg:leading-none">
              {row.cases?.title}
            </p>
            <p className="px-0.5 text-xs text-[var(--muted-foreground)] md:text-sm">
              접속 <span className="font-semibold text-[var(--foreground)]">{playercount}</span>명
            </p>
          </div>
          <div className="w-full shrink-0 md:ml-auto md:w-auto md:max-w-[min(100%,26rem)]">
            <div
              className={cn(
                "flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 shadow-[var(--elevation-sm)] sm:w-auto sm:justify-start sm:py-1.5 md:px-3 md:py-2.5",
                sessionEnded && "justify-center",
              )}
            >
              {sessionEnded ? (
                <div className="py-0.5 text-center sm:text-left">
                  <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-[var(--muted-foreground)] sm:text-base">
                    종료된 세션
                  </p>
                </div>
              ) : (
                <>
                  <div className="leading-tight">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      참가 코드
                    </p>
                    <p className="font-mono text-xl font-semibold tracking-[0.15em] text-[var(--accent)] sm:text-2xl md:text-3xl">
                      {row.join_code}
                    </p>
                  </div>
                  <span className="h-9 w-px bg-[var(--border)]" aria-hidden />
                  <PlayJoinQr joinCode={row.join_code} />
                </>
              )}
            </div>
          </div>
        </header>

        {showPhaseGuide || showPhaseActions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:gap-4 lg:flex-nowrap">
            <div className="min-w-0 flex-1 md:max-w-[min(100%,42rem)]">
              {showPhaseGuide ? <PhaseGuideCard phase={phase} /> : null}
            </div>
            {showPhaseActions ? (
              <div className="flex w-full shrink-0 flex-wrap items-stretch justify-end gap-2 sm:ml-auto sm:w-auto md:gap-3 [&_button]:min-h-11 [&_button]:touch-manipulation">
                {timerButton}
                {startButton ?? nextButton}
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "waiting" ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)] md:p-4">
            <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)] md:mb-2.5 md:text-xs">
              대기 학생
            </p>
            {waitingLobbyPlayers.length === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--muted-foreground)]">아직 없음</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {waitingLobbyPlayers.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs md:px-2.5 md:text-sm"
                  >
                    <span className="h-1 w-1 rounded-full bg-[var(--primary)]" aria-hidden />
                    <span className="font-medium text-[var(--foreground)]">{p.nickname ?? "참가자"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {phase === "briefing" || phase === "investigation" ? (
          <TeamAssignmentDashboard
            groups={assignmentGroups}
            loading={playersQuery.isLoading || teamsQuery.isLoading}
          />
        ) : null}

        {phase === "final_report" || phase === "session_end" ? (
          <TeamReportDashboard
            groups={reportGroups}
            loading={playersQuery.isLoading || teamsQuery.isLoading || reportsQuery.isLoading}
            roster={reportRoster}
            answerSuspectId={row.cases?.answer_suspect_id ?? null}
            totalPlayers={onlinePlayers.length}
            submittedCount={reportRows.length}
          />
        ) : null}
      </main>

      <Modal
        open={timerToolOpen}
        onClose={closeTimerModal}
        title="타이머"
        titleId="host-timer-heading"
        maxWidthClassName="max-w-md"
        zIndexClassName="z-[90]"
        bodyClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>
    </div>
  );
}

export default function SessionHostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      }
    >
      <SessionHostContent />
    </Suspense>
  );
}
