"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  getHostSessionDetails,
  listSessionPlayerReports,
  listSessionPlayers,
  listSessionTeams,
  setPlayersOnline,
  type PlayerReportRow,
  type SessionDetailsRow,
  type SessionPlayerRow,
  type TeamRow,
} from "@/lib/api/play";
import { isCulpritCorrect } from "@/lib/report-compare";
import { findSuspectName, parseSuspectRosterFromCase } from "@/lib/suspects";
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
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import {
  flattenPresenceState,
  getSessionRoomChannelName,
  type SessionPresenceRow,
} from "@/lib/realtime/session-presence";
import { clubRoleLabelKr } from "@/lib/club-role";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type TimedPhase = Exclude<CasePhase, "waiting" | "session_end">;

type StepDef = {
  key: TimedPhase;
  number: number;
  label: string;
};

const PHASES: StepDef[] = [
  { key: "briefing", number: 1, label: "사건 파악" },
  { key: "investigation", number: 2, label: "단서 수집" },
  { key: "final_report", number: 3, label: "범인 지목" },
];

type PhaseGuide = {
  title: string;
  summary: string;
};

const PHASE_GUIDES: Record<TimedPhase, PhaseGuide> = {
  briefing: {
    title: "사건 파악",
    summary: "팀별로 모여 사건 파일과 용의자 프로필을 확인합니다.",
  },
  investigation: {
    title: "단서 수집",
    summary: "배정 장소를 탐색하고 단서를 수집합니다.",
  },
  final_report: {
    title: "범인 지목",
    summary: "팀 토의 후 범인을 지목합니다.",
  },
};

const PHASE_MINUTES: Record<TimedPhase, number> = {
  briefing: 10,
  investigation: 12,
  final_report: 10,
};

function isTimedPhase(phase: CasePhase): phase is TimedPhase {
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

function PhaseTimerContent({ phase }: { phase: TimedPhase }) {
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
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTimerInputDigits("");
            setIsEditing(true);
          }}
          className="h-20 text-center font-mono text-5xl tabular-nums text-[var(--accent)] transition hover:text-[var(--highlight)] sm:text-6xl"
        >
          {formatTimerDisplay(timerRemainingSec)}
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" size="sm" onClick={() => setIsTimerRunning((v) => !v)}>
          {isTimerRunning ? "일시정지" : "시작"}
        </Button>
        <Button
          type="button"
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
  );
}

function TeamAssignmentDashboard({
  players,
  teams,
  loading,
  phase,
}: {
  players: SessionPlayerRow[];
  teams: TeamRow[];
  loading: boolean;
  phase: "briefing" | "investigation";
}) {
  const groups = useMemo(() => groupPlayersByTeam(players, teams), [players, teams]);

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">배정 결과</h2>
        </div>
      </header>
      {loading ? (
        <LoadingState variant="section" label="참가자·팀 정보를 불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">배정된 팀이 없습니다.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.team.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-lg font-semibold text-[var(--accent)]">{g.team.name ?? "—"}</p>
                <span className="text-[10px] text-[var(--muted-foreground)]">{g.members.length}명</span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {g.members.length === 0 ? (
                  <li className="rounded border border-dashed border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted-foreground)]">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-[11px]"
                    >
                      <span className="min-w-0 flex-1 text-[var(--foreground)]">
                        {m.nickname ?? "참가자"}
                        <span className="ml-1 text-[10px] text-[var(--muted-foreground)]">
                          {clubRoleLabelKr(m.club_role)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[var(--accent)]">
                        {m.investigation_zone?.name ?? "—"}
                      </span>
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

function PhaseGuideCard({ phase, meta }: { phase: CasePhase; meta?: ReactNode }) {
  if (phase === "waiting" || phase === "session_end") {
    return null;
  }

  const guide = PHASE_GUIDES[phase];
  const stepNumber = PHASES.find((s) => s.key === phase)?.number ?? 1;

  return (
    <div className="space-y-2 px-2 py-1">
      {meta ? <div className="mt-1">{meta}</div> : null}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] text-[12px] font-semibold tabular-nums text-[var(--on-primary)] shadow-sm"
          aria-hidden
        >
          {stepNumber}
        </span>
        <h2 className="text-xl font-bold leading-tight text-[var(--foreground)]">{guide.title}</h2>
      </div>
      <p className="text-xs leading-snug text-[var(--muted-foreground)]">{guide.summary}</p>
    </div>
  );
}

/**
 * 팀 다수결: 가장 많이 지목된 용의자. 동률(의견 불일치)이면 tied=true.
 */
function computeTeamMajority(reports: ReadonlyArray<{ suspect_id: string }>) {
  if (reports.length === 0) {
    return { suspectId: null as string | null, tied: false, count: 0 };
  }
  const counts = new Map<string, number>();
  for (const r of reports) {
    const id = r.suspect_id?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let bestId: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  return { suspectId: bestId, tied, count: bestCount };
}

function TeamReportDashboard({
  reportKey,
  players,
  teams,
  reports,
  loading,
}: {
  reportKey: SessionDetailsRow["cases"];
  players: SessionPlayerRow[];
  teams: TeamRow[];
  reports: PlayerReportRow[];
  loading: boolean;
}) {
  const groups = useMemo(() => groupPlayersByTeam(players, teams), [players, teams]);
  const reportByPlayerId = useMemo(
    () => new Map(reports.map((r) => [r.player_id, r])),
    [reports],
  );
  const submittedCount = reports.length;
  const totalPlayers = players.length;
  const answerRoster = useMemo(
    () => parseSuspectRosterFromCase(reportKey?.suspect_roster),
    [reportKey?.suspect_roster],
  );
  const answerId = reportKey?.answer_suspect_id;
  const trueName = findSuspectName(answerRoster, answerId);
  const hasAnswer = Boolean(answerId?.trim() && trueName);

  const submissionRate =
    totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0;

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">범인 지목</h2>
        <div className="flex text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            제출 {submittedCount}/{totalPlayers}
          </span>
        </div>
      </header>
      {loading ? (
        <LoadingState variant="section" label="참가자·보고서를 불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">제출한 학생이 없습니다.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const teamReports = g.members
              .map((m) => reportByPlayerId.get(m.id))
              .filter((r): r is PlayerReportRow => Boolean(r));
            const teamSubmitted = teamReports.length;
            const majority = computeTeamMajority(teamReports);
            const majorityName = findSuspectName(answerRoster, majority.suspectId);
            const majorityCorrect =
              !majority.tied && isCulpritCorrect(answerId, majority.suspectId);
            const allSubmitted = teamSubmitted === g.members.length && g.members.length > 0;
            return (
              <div
                key={g.team.id}
                className={`rounded-md border p-2.5 ${
                  allSubmitted
                    ? "border-[var(--accent)] bg-[var(--tint-accent-medium)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-lg font-semibold text-[var(--accent)]">{g.team.name ?? "—"}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      allSubmitted
                        ? "bg-[var(--accent)] text-[var(--background)]"
                        : "border border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    제출 {teamSubmitted}/{g.members.length}
                  </span>
                </div>
                {teamReports.length > 0 && hasAnswer ? (
                  <p
                    className={
                      "mt-2 text-[11px] font-semibold " +
                      (majority.tied
                        ? "text-[var(--muted-foreground)]"
                        : majorityCorrect
                          ? "text-[var(--primary)]"
                          : "text-[var(--danger)]")
                    }
                  >
                    팀 다수결:{" "}
                    {majority.tied
                      ? "의견 불일치"
                      : `${majorityName ?? majority.suspectId ?? "—"} (${majorityCorrect ? "검거 성공" : "검거 실패"})`}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1">
                  {g.members.map((m) => {
                    const r = reportByPlayerId.get(m.id);
                    const submitted = Boolean(r);
                    const memberSuspectName = findSuspectName(answerRoster, r?.suspect_id);
                    const memberCorrect =
                      submitted && hasAnswer && r
                        ? isCulpritCorrect(answerId, r.suspect_id)
                        : null;
                    return (
                      <li
                        key={m.id}
                        className={`rounded border px-2 py-1 text-[11px] ${
                          submitted
                            ? "border-[var(--accent)]/40 bg-[var(--tint-accent-weak)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 text-[var(--foreground)]">
                            {m.nickname ?? "참가자"}
                            <span className="ml-1 text-[10px] text-[var(--muted-foreground)]">
                              {clubRoleLabelKr(m.club_role)}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                              submitted ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"
                            }`}
                          >
                            {submitted ? "제출" : "대기"}
                          </span>
                        </div>
                        {submitted ? (
                          <p
                            className={
                              "mt-1 text-[11px] " +
                              (hasAnswer
                                ? memberCorrect
                                  ? "text-[var(--primary)]"
                                  : "text-[var(--danger)]"
                                : "text-[var(--foreground)]")
                            }
                          >
                            지목: {memberSuspectName ?? r?.suspect_id ?? "—"}
                            {hasAnswer ? ` · ${memberCorrect ? "맞음" : "틀림"}` : ""}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionHostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const queryClient = useQueryClient();
  const [presenceRows, setPresenceRows] = useState<SessionPresenceRow[]>([]);
  const [timerToolOpen, setTimerToolOpen] = useState(false);

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

  const playercount = onlinePlayers.length;

  const phase = (sessionQuery.data?.phase as CasePhase) ?? "waiting";
  const nextPhase = getNextPhase(phase);
  const nextPhaseLabel = nextPhase === "session_end" ? "수사 종료" : "다음 단계";
  const sessionStarted = phase !== "waiting";
  const sessionEnded = phase === "session_end";
  const shouldShowTimer = isTimedPhase(phase);

  useEffect(() => {
    setTimerToolOpen(false);
  }, [phase]);

  if (!sessionId) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--muted-foreground)]">수사 세션을 찾을 수 없습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.reports)}>
            수사 기록
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
          <p className="text-sm text-[var(--danger)]">수사 세션을 불러오지 못했습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.reports)}>
            수사 기록
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
          <p className="text-sm text-[var(--accent)]">이 수사를 진행할 권한이 없습니다.</p>
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
      onClick={() => setTimerToolOpen(true)}
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
        <>수사 시작</>
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
      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-[40px] font-semibold tracking-wide text-[var(--accent)]">
              {row.cases?.title}
            </p>
            <p className="px-1 text-xs text-[var(--muted-foreground)]">
              접속 <span className="font-semibold text-[var(--foreground)]">{playercount}</span>명
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-1.5 shadow-[var(--elevation-sm)]",
                sessionEnded && "justify-center",
              )}
            >
              {sessionEnded ? (
                <div className="py-0.5 text-center sm:text-left">
                  <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-[var(--muted-foreground)] sm:text-md">
                    종료된 세션
                  </p>
                </div>
              ) : (
                <>
                  <div className="leading-tight">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      참가 코드
                    </p>
                    <p className="font-mono text-xl font-semibold tracking-[0.15em] text-[var(--accent)] sm:text-2xl">
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
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              {showPhaseGuide ? <PhaseGuideCard phase={phase} /> : null}
            </div>
            {showPhaseActions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {timerButton}
                {startButton ?? nextButton}
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "waiting" ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)]">
            <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)]">입장한 학생</p>
            {onlinePlayers.length === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--muted-foreground)]">아직 없음</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {onlinePlayers.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1 text-xs"
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
            phase={phase}
            players={onlinePlayers}
            teams={teamsQuery.data ?? []}
            loading={playersQuery.isLoading || teamsQuery.isLoading}
          />
        ) : null}

        {phase === "final_report" || phase === "session_end" ? (
          <TeamReportDashboard
            reportKey={row.cases}
            players={onlinePlayers}
            teams={teamsQuery.data ?? []}
            reports={reportsQuery.data ?? []}
            loading={playersQuery.isLoading || teamsQuery.isLoading || reportsQuery.isLoading}
          />
        ) : null}
      </main>

      <Modal
        open={timerToolOpen && shouldShowTimer}
        onClose={() => setTimerToolOpen(false)}
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
