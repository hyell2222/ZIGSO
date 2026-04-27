"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { DetectiveIdCard } from "@/components/play/detective-id-card";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { StudentBlackoutLanding } from "@/components/play/student-blackout-landing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addFoundClueToTeam,
  getPlayerById,
  getPlayerWithPatrolZone,
  getPlaySessionDetails,
  getCaseMapEntities,
  getSessionByJoinCode,
  getTeamById,
  joinPlayerSession,
  setPlayerOnline,
  submitTeamReport,
} from "@/lib/api/play";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play-resume";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { isCulpritCorrect } from "@/lib/report-compare";
import { findSuspectName, parseSuspectRosterFromCase } from "@/lib/suspects";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const joinCodeRaw = searchParams.get("code")?.trim() ?? "";
  const nicknameRaw = searchParams.get("nickname")?.trim() ?? "";
  if (!joinCodeRaw) {
    return <StudentBlackoutLanding />;
  }
  return (
    <PlaySessionShell joinCode={joinCodeRaw.toUpperCase()} initialNickname={nicknameRaw} />
  );
}

function PlaySessionShell({
  joinCode,
  initialNickname = "",
}: {
  joinCode: string;
  initialNickname?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState(initialNickname);
  const autoJoinAttempted = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [resumeDecided, setResumeDecided] = useState(false);
  const [reportSuspectId, setReportSuspectId] = useState("");
  const [reportMethod, setReportMethod] = useState("");
  const [reportMotive, setReportMotive] = useState("");
  const [reportDecisive, setReportDecisive] = useState("");

  const playerQuery = useQuery({
    queryKey: ["play-player", playerId],
    queryFn: async () => getPlayerWithPatrolZone(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const patrolLocationId = playerQuery.data?.patrol_location_id ?? null;
  const teamId = playerQuery.data?.team_id ?? null;
  const zoneName = playerQuery.data?.patrol_zone?.name ?? null;

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId],
    queryFn: async () => getTeamById(teamId as string),
    enabled: Boolean(teamId),
    refetchInterval: teamId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamName = teamQuery.data?.name ?? null;
  const reportSubmitted = Boolean(teamQuery.data?.report_submitted_at);

  const sessionQuery = useQuery({
    queryKey: ["play-session", sessionId],
    queryFn: async () => getPlaySessionDetails(sessionId as string),
    enabled: Boolean(sessionId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: sessionId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const caseRoster = useMemo(
    () => parseSuspectRosterFromCase(sessionQuery.data?.cases?.suspect_roster),
    [sessionQuery.data?.cases?.suspect_roster],
  );
  const answerSuspectId = sessionQuery.data?.cases?.answer_suspect_id ?? null;
  const submittedSuspectId = teamQuery.data?.report_suspect_id ?? null;
  const culpritCorrect = isCulpritCorrect(answerSuspectId, submittedSuspectId);
  const trueCulpritName = findSuspectName(caseRoster, answerSuspectId);
  const chosenSuspectName = findSuspectName(caseRoster, submittedSuspectId);

  const resumeQuery = useQuery({
    queryKey: ["play-resume", joinCode],
    queryFn: async (): Promise<ResumeRecord | null> => {
      const stored = getResumeRecord(joinCode);
      if (!stored) return null;
      try {
        const session = await getSessionByJoinCode(joinCode);
        if (session.id !== stored.sessionId) {
          clearResumeRecord(joinCode);
          return null;
        }
        const player = await getPlayerById(stored.playerId);
        if (player.session_id !== stored.sessionId) {
          clearResumeRecord(joinCode);
          return null;
        }
        return stored;
      } catch {
        clearResumeRecord(joinCode);
        return null;
      }
    },
    enabled: Boolean(hasSupabaseEnv && joinCode && !playerId && !resumeDecided),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    if (!hasSupabaseEnv || !sessionId || !playerId) return;

    const channel = supabase
      .channel(getSessionRoomChannelName(sessionId), {
        config: { presence: { key: `player:${playerId}` } },
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${sessionId}` },
        () => {
          if (teamId) void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role: "player",
            player_id: playerId,
            nickname: nickname.trim() || "탐정원",
            patrol_location_id: patrolLocationId ?? undefined,
            zone_name: zoneName ?? undefined,
          });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          void queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        }
      });

    return () => {
      void channel.untrack().catch(() => {});
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, teamId, patrolLocationId, zoneName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  useEffect(() => {
    if (sessionPhase !== "session_end") return;
    if (joinCode) clearResumeRecord(joinCode);
    router.replace(ROUTES.home);
  }, [sessionPhase, router, joinCode]);

  useEffect(() => {
    if (!playerId) return;
    void setPlayerOnline(playerId, true).catch(() => {});
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void setPlayerOnline(playerId, true).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [playerId]);

  const joinAndRegisterMutation = useMutation({
    mutationFn: async (args?: { nickname?: string }) => {
      const normalizedJoinCode = joinCode.trim().toUpperCase();
      const nick = (args?.nickname ?? nickname).trim();
      if (!normalizedJoinCode) throw new Error("사건 코드를 입력해 주세요.");
      if (!nick) throw new Error("닉네임을 입력해 주세요.");
      const session = await getSessionByJoinCode(normalizedJoinCode);
      setSessionId(session.id);
      const result = await joinPlayerSession({
        session_id: session.id,
        nickname: nick,
      });
      setPlayerId(result.player.id);
      saveResumeRecord({
        joinCode: normalizedJoinCode,
        sessionId: session.id,
        playerId: result.player.id,
        nickname: nick,
      });
    },
    onSuccess: () => setMessage(null),
    onError: (e: Error) => setMessage(e.message),
  });

  const handleContinueAsPlayer = (rec: ResumeRecord) => {
    setSessionId(rec.sessionId);
    setPlayerId(rec.playerId);
    setNickname(rec.nickname);
    setResumeDecided(true);
    saveResumeRecord({
      joinCode: rec.joinCode,
      sessionId: rec.sessionId,
      playerId: rec.playerId,
      nickname: rec.nickname,
    });
  };

  const handleJoinAsNewPlayer = () => {
    if (joinCode) clearResumeRecord(joinCode);
    setResumeDecided(true);
    if (initialNickname.trim()) {
      autoJoinAttempted.current = false;
    }
  };

  useEffect(() => {
    if (!initialNickname.trim()) return;
    if (playerId || sessionId) return;
    if (resumeQuery.isLoading) return;
    if (resumeQuery.data && !resumeDecided) return;
    if (autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    setNickname(initialNickname.trim());
    joinAndRegisterMutation.mutate({ nickname: initialNickname.trim() });
    // mutate is stable; omit mutation object from deps to avoid redundant runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname, playerId, sessionId, resumeQuery.isLoading, resumeQuery.data, resumeDecided]);

  const hasJoinedSession = Boolean(playerId && sessionId);
  const hasAssignment = Boolean(patrolLocationId && teamId && playerQuery.data?.club_role);

  const isWaitingLobby =
    hasJoinedSession && (sessionQuery.isLoading || sessionPhase === "waiting" || !hasAssignment);
  const waitingLobbyState = useMemo(() => {
    if (sessionQuery.isLoading) return "session_loading" as const;
    if (sessionPhase === "waiting") return "host_not_started" as const;
    return "assigning" as const;
  }, [sessionQuery.isLoading, sessionPhase]);
  const isBriefing = hasJoinedSession && hasAssignment && sessionPhase === "briefing";
  const isInvestigation = hasJoinedSession && hasAssignment && sessionPhase === "investigation";
  const isFinalReport = hasJoinedSession && hasAssignment && sessionPhase === "final_report";

  const mapQuery = useQuery({
    queryKey: ["play-case-map", sessionQuery.data?.case_id, patrolLocationId, sessionPhase],
    queryFn: async () =>
      getCaseMapEntities(sessionQuery.data!.case_id!, {
        restrictToPatrolLocationId: patrolLocationId,
      }),
    enabled: Boolean(isInvestigation && sessionQuery.data?.case_id),
  });

  const syncedClueIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!teamId) return;
    const newlyFound = discoveredClueIds.filter((id) => !syncedClueIdsRef.current.has(id));
    if (newlyFound.length === 0) return;
    newlyFound.forEach((id) => syncedClueIdsRef.current.add(id));
    void Promise.all(newlyFound.map((id) => addFoundClueToTeam(teamId, id))).catch(() => {});
  }, [discoveredClueIds, teamId]);

  useEffect(() => {
    if (!sessionId) return;
    const t = window.setTimeout(() => {
      setDiscoveredClueIds([]);
      syncedClueIdsRef.current = new Set();
    }, 0);
    return () => window.clearTimeout(t);
  }, [sessionId]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("팀 정보가 없습니다.");
      await submitTeamReport(teamId, {
        suspectId: reportSuspectId,
        method: reportMethod,
        motive: reportMotive,
        decisiveClue: reportDecisive,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const handleReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!reportSuspectId.trim() || !reportMethod.trim() || !reportMotive.trim() || !reportDecisive.trim()) {
      setMessage("용의자 선택과 나머지 항목을 모두 입력해 주세요.");
      return;
    }
    reportMutation.mutate();
  };

  if (hasSupabaseEnv && isInvestigation && sessionPhase) {
    return (
      <InvestigationMapShell
        mapLoading={mapQuery.isLoading}
        mapError={mapQuery.error as Error | null}
        locations={mapQuery.data?.locations ?? []}
        clues={mapQuery.data?.clues ?? []}
        discoveredClueIds={discoveredClueIds}
        onDiscoveredClueIdsChange={setDiscoveredClueIds}
      />
    );
  }

  if (hasSupabaseEnv && isFinalReport && teamId) {
    return (
      <PlayAtmosphere>
        <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 pb-12">
          <TeamBadge teamName={teamName} />
          <Card className="overflow-hidden border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] text-[color:var(--entry-parchment)] shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_45%,transparent)] motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:60ms]">
            <CardHeader className="space-y-1 border-b border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_55%,#151210)]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[color:var(--entry-accent-soft)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-lg text-[color:var(--entry-parchment)]">3단계 · 최종 보고서</CardTitle>
                  <p className="text-xs font-normal text-[color:var(--entry-parchment-muted)]">
                    팀 단위로 1회 제출합니다. 범인은 등록된 용의자 중에서만 선택할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {reportSubmitted ? (
                <div className="space-y-5 text-sm text-[color:var(--entry-parchment)]">
                  <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,#141a17)] px-4 py-3 shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_12%,transparent)]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                      제출 완료
                    </p>
                    <p className="mt-1 font-medium text-[color:var(--entry-parchment)]">팀 보고서가 접수되었습니다.</p>
                    {teamQuery.data?.report_submitted_at ? (
                      <p className="mt-1 text-xs text-[color:var(--entry-parchment-muted)]">
                        {new Date(teamQuery.data.report_submitted_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {answerSuspectId ? (
                    <div
                      className={
                        "rounded-lg border-2 p-4 " +
                        (culpritCorrect
                          ? "border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,#121814)]"
                          : "border-[color-mix(in_srgb,var(--highlight)_50%,#4a2a1a)] bg-[color-mix(in_srgb,var(--highlight)_8%,#1a1210)]")
                      }
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                        범인 검거 결과
                      </p>
                      <p className="mt-2 text-xl font-bold text-[color:var(--entry-parchment)]">
                        {culpritCorrect ? "검거 성공" : "검거 실패"}
                      </p>
                      <dl className="mt-3 grid gap-2 text-sm">
                        <div className="flex flex-wrap justify-between gap-2 border-t border-[color-mix(in_srgb,var(--entry-parchment)_12%,transparent)] pt-2">
                          <dt className="text-[color:var(--entry-parchment-muted)]">팀이 지목한 사람</dt>
                          <dd className="font-semibold text-[color:var(--entry-parchment)]">{chosenSuspectName ?? "—"}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-[color:var(--entry-parchment-muted)]">사건 정답(범인)</dt>
                          <dd className="font-semibold text-[color:var(--entry-parchment)]">{trueCulpritName ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <p className="text-xs text-[color:var(--entry-parchment-muted)]">
                      이 사건에는 정답 범인이 등록되지 않아 검거 여부를 표시하지 않습니다.
                    </p>
                  )}
                  <p className="text-sm text-[color:var(--entry-parchment-muted)]">
                    교사가 세션을 마칠 때까지 잠시 기다려 주세요.
                  </p>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleReportSubmit}>
                  <p className="rounded-md border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,#141816)] px-3 py-2 text-sm text-[color:var(--entry-parchment)]">
                    팀원과 논의한 뒤 <strong className="text-[color:var(--entry-accent-soft)]">한 번만</strong>{" "}
                    제출할 수 있습니다.
                  </p>
                  {caseRoster.length === 0 ? (
                    <p className="rounded-md border border-[color-mix(in_srgb,var(--highlight)_45%,#5c2e16)] bg-[color-mix(in_srgb,var(--highlight)_10%,#1a1410)] px-3 py-2 text-sm text-[color:var(--entry-parchment)]">
                      이 사건에 용의자 목록이 없습니다. 교사에게 문의하세요.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]"
                        htmlFor="report-suspect"
                      >
                        지목한 범인 (용의자 중 1명)
                      </label>
                      <select
                        id="report-suspect"
                        className="flex h-11 w-full rounded-md border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_65%,var(--ink))] px-3 text-sm text-[color:var(--entry-parchment)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--entry-parchment)_5%,transparent)]"
                        value={reportSuspectId}
                        onChange={(ev) => setReportSuspectId(ev.target.value)}
                        required
                      >
                        <option value="">용의자를 선택하세요</option>
                        {caseRoster.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                      범행 도구 · 수법
                    </label>
                    <Textarea
                      value={reportMethod}
                      onChange={(ev) => setReportMethod(ev.target.value)}
                      rows={3}
                      className="border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                      범행 동기
                    </label>
                    <Textarea
                      value={reportMotive}
                      onChange={(ev) => setReportMotive(ev.target.value)}
                      rows={3}
                      className="border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                      결정적 단서
                    </label>
                    <Textarea
                      value={reportDecisive}
                      onChange={(ev) => setReportDecisive(ev.target.value)}
                      rows={3}
                      className="border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
                      required
                    />
                  </div>
                  {message ? <p className="text-sm text-[color:var(--entry-auth-notice)]">{message}</p> : null}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={reportMutation.isPending || caseRoster.length === 0}
                  >
                    {reportMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    보고서 제출
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </PlayAtmosphere>
    );
  }

  if (hasSupabaseEnv && isBriefing) {
    return (
      <PlayAtmosphere>
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 pb-12">
          <header className="motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both] rounded-xl border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] px-4 py-4 text-[color:var(--entry-parchment)] shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_40%,transparent)] sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--entry-accent-soft)]">
                  1단계 · 브리핑
                </p>
                <h1 className="mt-1 text-xl font-bold text-[color:var(--entry-parchment)]">사건 파일 &amp; 부원증</h1>
                <p className="mt-1 max-w-xl text-sm text-[color:var(--entry-parchment-muted)]">
                  아래 정보를 확인한 뒤 교사 안내에 따라 다음 단계로 진행합니다.
                </p>
              </div>
              <TeamBadge teamName={teamName} className="shrink-0 self-start sm:self-center" />
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_1fr] lg:items-start">
            <section className="space-y-2 motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:80ms]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--entry-accent-soft)]">
                내 부원증
              </h2>
              {playerQuery.isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_28%,#11100e)] text-[color:var(--entry-parchment-muted)]">
                  <Loader2 className="h-8 w-8 animate-spin" aria-label="불러오는 중" />
                </div>
              ) : playerQuery.data?.club_role && patrolLocationId ? (
                <DetectiveIdCard
                  nickname={nickname.trim() || "탐정원"}
                  teamName={teamName}
                  zoneName={zoneName ?? ""}
                  roleKey={playerQuery.data.club_role}
                />
              ) : (
                <p className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_40%,#12100e)] px-4 py-6 text-center text-sm text-[color:var(--entry-parchment-muted)]">
                  역할·구역 배정을 불러오는 중입니다…
                </p>
              )}
            </section>

            <section className="space-y-2 motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:160ms]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--entry-accent-soft)]">
                공유 사건 정보
              </h2>
              <SessionInfoLayout sessionQuery={sessionQuery} />
            </section>
          </div>
        </main>
      </PlayAtmosphere>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen bg-[var(--entry-shell-deep)] text-[color:var(--entry-parchment)]">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <Card className="max-w-3xl border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] text-[color:var(--entry-parchment)] shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_45%,transparent)]">
            <CardHeader>
              <CardTitle className="text-[color:var(--entry-parchment)]">환경 설정 필요</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[color:var(--entry-parchment-muted)]">
              교실 멀티플레이 모드를 쓰려면 Supabase 환경 변수를 .env에 설정해 주세요.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const showResumeModal = Boolean(!hasJoinedSession && !resumeDecided && resumeQuery.data);

  return (
    <PlayAtmosphere>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-12">
        {showResumeModal && resumeQuery.data ? (
          <ResumeModal
            record={resumeQuery.data}
            onContinue={() => handleContinueAsPlayer(resumeQuery.data!)}
            onNew={handleJoinAsNewPlayer}
          />
        ) : null}

        {!hasJoinedSession && !showResumeModal && initialNickname.trim() && joinAndRegisterMutation.isPending ? (
          <section className="flex min-h-[40vh] items-center justify-center overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[color-mix(in_srgb,var(--entry-shell)_50%,var(--ink))] p-6 shadow-[0_0_0_1px_color-mix(in_srgb,var(--entry-accent)_12%,transparent),var(--elevation-sm)] motion-safe:animate-[playRevealUp_0.5s_ease-out_both]">
            <div className="flex flex-col items-center gap-4 text-[color:var(--entry-parchment)]">
              <Loader2
                className="h-9 w-9 animate-spin text-[var(--primary)]"
                style={{
                  filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--primary) 45%, transparent))",
                }}
                aria-hidden
              />
              <p className="font-mono text-sm tracking-wide text-[color:var(--entry-parchment-muted)]">
                보안 승인 확인 중…
              </p>
            </div>
          </section>
        ) : null}

        {!hasJoinedSession &&
        !showResumeModal &&
        !(initialNickname.trim() && joinAndRegisterMutation.isPending) &&
        (!initialNickname.trim() || joinAndRegisterMutation.isError) ? (
          <section className="flex items-center justify-center p-1">
            <div className="w-full max-w-md rounded-xl border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] p-6 text-[color:var(--entry-parchment)] shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_45%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--primary)_14%,transparent)] motion-safe:animate-[playModalRise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
              <h3 className="text-lg font-semibold text-[color:var(--entry-parchment)]">닉네임 설정</h3>
              <p className="mt-1 text-sm text-[color:var(--entry-parchment-muted)]">
                입장 후 부원 배정·브리핑이 진행됩니다.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  joinAndRegisterMutation.mutate({ nickname: nickname.trim() });
                }}
              >
                <Input
                  placeholder="닉네임"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_65%,var(--ink))] text-[color:var(--entry-parchment)] placeholder:text-[color:var(--entry-parchment-muted)]"
                  required
                />
                <Button type="submit" className="w-full" disabled={joinAndRegisterMutation.isPending}>
                  입장
                </Button>
              </form>
              {!joinCode.trim() ? (
                <p className="mt-3 text-xs text-[color:var(--entry-accent-soft)]">
                  <a className="underline hover:text-[color:var(--entry-parchment)]" href={ROUTES.play}>
                    입장 화면
                  </a>
                  에서 사건 코드를 입력해 주세요.
                </p>
              ) : null}
              {message ? <p className="mt-3 text-xs text-[color:var(--entry-parchment-muted)]">{message}</p> : null}
            </div>
          </section>
        ) : null}

        {hasJoinedSession && isWaitingLobby ? (
          <WaitingLobbyBlock
            joinCode={joinCode}
            nickname={nickname}
            caseTitle={sessionQuery.data?.cases?.title ?? null}
            state={waitingLobbyState}
          />
        ) : null}
      </main>
    </PlayAtmosphere>
  );
}

const WAITING_LOBBY: Record<
  "session_loading" | "host_not_started" | "assigning",
  { title: string; body: string }
> = {
  session_loading: {
    title: "세션을 불러오는 중",
    body: "잠시만 기다려 주세요.",
  },
  host_not_started: {
    title: "교사가 수사를 시작할 때까지 대기",
    body: "팀·역할·조사 구역은 시작 후 자동으로 배정됩니다.",
  },
  assigning: {
    title: "팀·역할 배정 중",
    body: "곧 탐정 동아리 직책과 순찰 구역이 정해집니다.",
  },
};

function WaitingLobbyBlock({
  joinCode,
  nickname,
  caseTitle,
  state,
  className,
}: {
  joinCode: string;
  nickname: string;
  caseTitle: string | null;
  state: keyof typeof WAITING_LOBBY;
  className?: string;
}) {
  const copy = WAITING_LOBBY[state];
  return (
    <div
      className={cn(
        "relative mt-2 flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] px-6 py-8 text-center text-[color:var(--entry-parchment)]",
        "shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_40%,transparent)]",
        "motion-safe:animate-[playRevealUp_0.65s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:shadow-[0_0_32px_-8px_color-mix(in_srgb,var(--primary)_30%,transparent)]",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[color-mix(in_srgb,var(--primary)_40%,transparent)] before:to-transparent",
        className,
      )}
    >
      <div
        className="pointer-events-none flex justify-center gap-4 opacity-80 motion-safe:animate-pulse"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_50%,transparent)]" />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_50%,transparent)] motion-safe:animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_40%,transparent)] motion-safe:animate-pulse"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      <Loader2
        className="h-10 w-10 shrink-0 animate-spin text-[var(--primary)]"
        style={{
          filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 40%, transparent))",
        }}
        aria-hidden
      />
      <div className="w-full max-w-sm space-y-2">
        <p className="text-base font-semibold tracking-tight text-[color:var(--entry-parchment)]">{copy.title}</p>
        {caseTitle ? <p className="text-sm text-[color:var(--entry-parchment-muted)]">{caseTitle}</p> : null}
        <p className="text-xs text-[color:var(--entry-parchment-muted)]">
          <span className="font-mono text-[color:var(--entry-accent-soft)]">{joinCode}</span> · {nickname}
        </p>
        <p className="text-sm leading-relaxed text-[color:var(--entry-parchment-muted)]">{copy.body}</p>
      </div>
    </div>
  );
}

function ResumeModal({
  record,
  onContinue,
  onNew,
}: {
  record: ResumeRecord;
  onContinue: () => void;
  onNew: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] p-6 text-[color:var(--entry-parchment)] shadow-xl ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)] motion-safe:animate-[playModalRise_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        <h3 className="text-lg font-semibold text-[color:var(--entry-parchment)]">이전 입장 기록</h3>
        <p className="mt-2 text-sm text-[color:var(--entry-parchment-muted)]">
          이 사건 코드로{" "}
          <span className="font-medium text-[color:var(--entry-accent-soft)]">{record.nickname}</span> 닉네임으로
          입장한 기록이 있어요. 이어갈까요?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onContinue} className="w-full">
            계속하기
          </Button>
          <Button onClick={onNew} variant="outline" className="w-full">
            새 닉네임으로 입장
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ teamName, className }: { teamName: string | null; className?: string }) {
  if (!teamName) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border-2 border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_55%,#141210)] px-4 py-3 text-[color:var(--entry-parchment)]",
        "shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--primary)_35%,transparent)] motion-safe:animate-[playRevealUp_0.5s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--entry-parchment-muted)]">
        소속 팀
      </span>
      <span className="font-mono text-2xl font-bold tracking-tight text-[color:var(--entry-accent-soft)]">
        {teamName}
      </span>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--entry-shell-deep)]" aria-hidden>
          <span className="sr-only">불러오는 중</span>
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
