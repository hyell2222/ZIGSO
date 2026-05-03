"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  FinalReportFields,
  FinalReportSubmittedBanner,
  type FinalReportFieldValues,
} from "@/components/play/final-report-fields";
import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import {
  PLAY_PAGE_BLACK_BG,
  PlayAtmosphere,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playLoaderRegion,
  playSurfaceCool,
  playSurfacePanel,
} from "@/components/play/play-atmosphere";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { StudentBlackoutLanding } from "@/components/play/student-blackout-landing";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  addFoundClueToTeam,
  assignOrphanPlayersForOngoingSession,
  getPlayerById,
  getPlayerReport,
  getPlayerWithInvestigationZone,
  getPlaySessionDetails,
  getCaseMapEntities,
  getSessionByJoinCode,
  getTeamById,
  joinPlayerSession,
  listTeamReports,
  setPlayerOnline,
  submitPlayerReport,
} from "@/lib/api/play";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play-resume";
import type { CasePhase } from "@/lib/api/cases";
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
  const [reportValues, setReportValues] = useState<FinalReportFieldValues>({
    suspectId: "",
    method: "",
    motive: "",
    decisiveClue: "",
  });

  const playerQuery = useQuery({
    queryKey: ["play-player", playerId],
    queryFn: async () => getPlayerWithInvestigationZone(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const investigationLocationId = playerQuery.data?.investigation_location_id ?? null;
  const teamId = playerQuery.data?.team_id ?? null;
  const zoneName = playerQuery.data?.investigation_zone?.name ?? null;

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId],
    queryFn: async () => getTeamById(teamId as string),
    enabled: Boolean(teamId),
    refetchInterval: teamId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamName = teamQuery.data?.name ?? null;

  const playerReportQuery = useQuery({
    queryKey: ["play-player-report", playerId],
    queryFn: async () => getPlayerReport(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 5_000 : false,
    refetchIntervalInBackground: true,
  });
  const playerReport = playerReportQuery.data ?? null;
  const reportSubmitted = Boolean(playerReport);

  const teamReportsQuery = useQuery({
    queryKey: ["play-team-reports", teamId],
    queryFn: async () => listTeamReports(teamId as string),
    enabled: Boolean(teamId && reportSubmitted),
    refetchInterval: teamId && reportSubmitted ? 5_000 : false,
    refetchIntervalInBackground: true,
  });

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
  const teamMajority = useMemo(
    () => computeTeamMajority(teamReportsQuery.data ?? []),
    [teamReportsQuery.data],
  );
  const culpritCorrect = isCulpritCorrect(answerSuspectId, teamMajority.suspectId);
  const trueCulpritName = findSuspectName(caseRoster, answerSuspectId);
  const majoritySuspectName = findSuspectName(caseRoster, teamMajority.suspectId);
  const ownSuspectName = findSuspectName(caseRoster, playerReport?.suspect_id ?? null);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_reports", filter: `session_id=eq.${sessionId}` },
        () => {
          if (playerId)
            void queryClient.invalidateQueries({ queryKey: ["play-player-report", playerId] });
          if (teamId)
            void queryClient.invalidateQueries({ queryKey: ["play-team-reports", teamId] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role: "player",
            player_id: playerId,
            nickname: nickname.trim() || "참가자",
            investigation_location_id: investigationLocationId ?? undefined,
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
  }, [sessionId, playerId, teamId, investigationLocationId, zoneName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase as CasePhase | null | undefined;

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
      if (!normalizedJoinCode) throw new Error("참가 코드를 입력해 주세요.");
      if (!nick) throw new Error("닉네임을 입력해 주세요.");
      const session = await getSessionByJoinCode(normalizedJoinCode);
      setSessionId(session.id);
      const result = await joinPlayerSession({
        session_id: session.id,
        nickname: nick,
      });
      setPlayerId(result.player.id);
      const phase = session.phase as CasePhase | null | undefined;
      if (phase && phase !== "waiting" && phase !== "session_end") {
        await assignOrphanPlayersForOngoingSession(session.id);
      }
      saveResumeRecord({
        joinCode: normalizedJoinCode,
        sessionId: session.id,
        playerId: result.player.id,
        nickname: nick,
      });
      return { sessionId: session.id, playerId: result.player.id };
    },
    onSuccess: async (ctx) => {
      setMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["play-player", ctx.playerId] });
      await queryClient.invalidateQueries({ queryKey: ["play-session", ctx.sessionId] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const handleContinueAsPlayer = async (rec: ResumeRecord) => {
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
    try {
      const d = await getPlaySessionDetails(rec.sessionId);
      const ph = d.phase as CasePhase | null | undefined;
      if (ph && ph !== "waiting" && ph !== "session_end") {
        await assignOrphanPlayersForOngoingSession(rec.sessionId);
      }
    } catch {
      /* 배정 실패 시에도 입장은 유지; 플레이어 쿼리로 재시도 */
    }
    void queryClient.invalidateQueries({ queryKey: ["play-player", rec.playerId] });
    void queryClient.invalidateQueries({ queryKey: ["play-session", rec.sessionId] });
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
  const hasAssignment = Boolean(investigationLocationId && teamId);

  const isWaitingLobby =
    hasJoinedSession &&
    (sessionQuery.isLoading ||
      !sessionQuery.data ||
      sessionPhase === "waiting" ||
      (sessionPhase !== "briefing" &&
        sessionPhase !== "investigation" &&
        sessionPhase !== "final_report" &&
        sessionPhase !== "session_end" &&
        !hasAssignment));

  const waitingLobbyState = useMemo(() => {
    if (sessionQuery.isLoading || !sessionQuery.data) return "session_loading" as const;
    return "waiting" as const;
  }, [sessionQuery.isLoading, sessionQuery.data]);

  const isBriefing = hasJoinedSession && sessionPhase === "briefing";
  const isInvestigation = hasJoinedSession && hasAssignment && sessionPhase === "investigation";
  const isFinalReport = hasJoinedSession && sessionPhase === "final_report";

  const mapQuery = useQuery({
    queryKey: ["play-case-map", sessionQuery.data?.case_id, investigationLocationId, sessionPhase],
    queryFn: async () =>
      getCaseMapEntities(sessionQuery.data!.case_id!, {
        restrictToInvestigationLocationId: investigationLocationId,
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
      if (!playerId) throw new Error("부원 정보가 없습니다.");
      if (!sessionId) throw new Error("세션 정보가 없습니다.");
      await submitPlayerReport(
        { playerId, sessionId, teamId },
        {
          suspectId: reportValues.suspectId,
          method: reportValues.method,
          motive: reportValues.motive,
          decisiveClue: reportValues.decisiveClue,
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["play-player-report", playerId] });
      if (teamId)
        void queryClient.invalidateQueries({ queryKey: ["play-team-reports", teamId] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const handleReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const { suspectId, method, motive, decisiveClue } = reportValues;
    if (!suspectId.trim() || !method.trim() || !motive.trim() || !decisiveClue.trim()) {
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
        headerRightSlot={
          <PlayHeaderTeamPlace
            teamName={teamName}
            placeName={zoneName}
            pending={playerQuery.isLoading}
          />
        }
      />
    );
  }

  if (hasSupabaseEnv && isFinalReport) {
    return (
      <PlayAtmosphere>
        <div className="flex min-h-dvh flex-col">
          <header className={playPhaseHeaderChromeShell}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader
                phase={3}
                title="범인 지목"
                description="각자 한 번씩 제출합니다. 범인은 등록된 용의자 중에서만 선택할 수 있습니다."
                rightSlot={
                  <PlayHeaderTeamPlace
                    teamName={teamName}
                    placeName={zoneName}
                    pending={playerQuery.isLoading || !hasAssignment}
                  />
                }
              />
            </div>
          </header>
          <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:px-6 sm:py-8 md:max-w-3xl md:px-8">
          <div
            className={cn(
              "overflow-hidden px-5 pb-6 pt-6 motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:60ms]",
              playSurfaceCool,
            )}
          >
              {!teamId ? (
                <LoadingState
                  variant="section"
                  tone="default"
                  label="팀 정보를 불러오는 중…"
                  className="min-h-[12rem] py-10"
                />
              ) : reportSubmitted ? (
                <div className="space-y-5 text-sm text-[var(--foreground)]">
                  <FinalReportSubmittedBanner
                    submittedAt={playerReport?.submitted_at ?? null}
                    description={`지목한 범인: ${ownSuspectName ?? "—"}`}
                  />
                  {answerSuspectId ? (
                    <div
                      className={
                        "rounded-lg border-2 p-4 " +
                        (culpritCorrect
                          ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)]"
                          : "border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)]")
                      }
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        범인 검거 결과 (팀 다수결)
                      </p>
                      <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                        {teamMajority.tied
                          ? "검거 실패 (의견 불일치)"
                          : culpritCorrect
                            ? "검거 성공"
                            : "검거 실패"}
                      </p>
                      <dl className="mt-3 grid gap-2 text-sm">
                        <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-2">
                          <dt className="text-[var(--muted-foreground)]">팀 다수가 지목한 사람</dt>
                          <dd className="font-semibold text-[var(--foreground)]">
                            {teamMajority.tied
                              ? "의견 불일치"
                              : (majoritySuspectName ?? teamMajority.suspectId ?? "—")}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-[var(--muted-foreground)]">사건 정답(범인)</dt>
                          <dd className="font-semibold text-[var(--foreground)]">{trueCulpritName ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      이 사건에는 정답 범인이 등록되지 않아 검거 여부를 표시하지 않습니다.
                    </p>
                  )}
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleReportSubmit}>
                  <p className="rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[inset_var(--input-inset)]">
                    팀원과 논의한 뒤 <strong className="text-[var(--primary)]">한 번만</strong>{" "}
                    제출할 수 있습니다.
                  </p>
                  <FinalReportFields
                    idPrefix="report"
                    values={reportValues}
                    suspectRoster={caseRoster}
                    onChange={setReportValues}
                    emptyRosterEditFallback={
                      <p className="rounded-md border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
                        이 사건에 용의자 목록이 없습니다. 담당 선생님께 문의하세요.
                      </p>
                    }
                  />
                  {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={reportMutation.isPending || caseRoster.length === 0 || !teamId}
                  >
                    {reportMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
                        제출 중…
                      </>
                    ) : (
                      "범인 지목 제출"
                    )}
                  </Button>
                </form>
              )}
          </div>
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  if (hasSupabaseEnv && isBriefing) {
    return (
      <PlayAtmosphere>
        <div className="flex min-h-dvh flex-col">
          <header className={playPhaseHeaderChromeShell}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader
                phase={1}
                title="사건 파악"
                description="우측에서 팀과 담당 조사 장소를 확인한 뒤, 같은 팀끼리 모여 앉아 사건 파일을 확인하세요."
                rightSlot={
                  <PlayHeaderTeamPlace
                    teamName={teamName}
                    placeName={zoneName}
                    pending={playerQuery.isLoading || !hasAssignment}
                  />
                }
              />
            </div>
          </header>

          <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col space-y-5 px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
            <section className="flex min-h-[min(20rem,52dvh)] flex-1 flex-col motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:80ms] md:min-h-[min(22rem,56dvh)]">
              {playerQuery.isLoading && !hasAssignment ? (
                <LoadingState
                  variant="section"
                  tone="play"
                  className="min-h-0 flex-1 py-8"
                />
              ) : (
                <SessionInfoLayout sessionQuery={sessionQuery} />
              )}
            </section>
          </main>
        </div>
      </PlayAtmosphere>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen text-[var(--foreground)] play-shell" style={PLAY_PAGE_BLACK_BG}>
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <Card className={cn("max-w-3xl", playSurfaceCool)}>
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">환경 설정 필요</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted-foreground)]">
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
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:px-8">
        {showResumeModal && resumeQuery.data ? (
          <ResumeModal
            record={resumeQuery.data}
            onContinue={() => handleContinueAsPlayer(resumeQuery.data!)}
            onNew={handleJoinAsNewPlayer}
          />
        ) : null}

        {!hasJoinedSession && !showResumeModal && initialNickname.trim() && joinAndRegisterMutation.isPending ? (
          <section
            className={cn(
              playLoaderRegion,
              "motion-safe:animate-[playRevealUp_0.5s_ease-out_both]",
            )}
          >
            <LoadingState variant="page" tone="play" label="보안 승인 확인 중…" className="min-h-0 py-0" />
          </section>
        ) : null}

        {!hasJoinedSession &&
        !showResumeModal &&
        !(initialNickname.trim() && joinAndRegisterMutation.isPending) &&
        (!initialNickname.trim() || joinAndRegisterMutation.isError) ? (
          <section className="flex flex-1 flex-col items-center justify-center p-1">
            <div
              className={cn(
                "w-full max-w-md p-6 motion-safe:animate-[playModalRise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
                playSurfacePanel,
              )}
            >
              <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                입장 후 부원 배정·사건 파악이 진행됩니다.
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
                  required
                />
                <Button type="submit" className="w-full" disabled={joinAndRegisterMutation.isPending}>
                  입장
                </Button>
              </form>
              {!joinCode.trim() ? (
                <p className="mt-3 text-xs text-[var(--accent)]">
                  <a className="underline hover:text-[var(--primary)]" href={ROUTES.play}>
                    입장 화면
                  </a>
                  에서 참가 코드를 입력해 주세요.
                </p>
              ) : null}
              {message ? <p className="mt-3 text-xs text-[var(--muted-foreground)]">{message}</p> : null}
            </div>
          </section>
        ) : null}

        {hasJoinedSession && isWaitingLobby ? (
          <section className={playLoaderRegion}>
            <WaitingLobbyBlock
              joinCode={joinCode}
              nickname={nickname}
              caseTitle={sessionQuery.data?.cases?.title ?? null}
              state={waitingLobbyState}
            />
          </section>
        ) : null}
        </main>
      </div>
    </PlayAtmosphere>
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

const WAITING_LOBBY: Record<
  "session_loading" | "waiting",
  { title: string; body1: string; body2: string | null }
> = {
  session_loading: {
    title: "사건 정보를 불러오는 중",
    body1: "잠시만 기다려 주세요.",
    body2: null,
  },
  waiting: {
    title: "선생님이 시작할 때까지 대기",
    body1: "팀과 조사 장소가 자동 배정됩니다.",
    body2: "배정이 완료되면 같은 팀끼리 모여 앉아주세요.",
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
        "relative flex max-w-md flex-col items-center gap-4 px-6 py-4 text-center",
        className,
      )}
    >
      <Loader2
        className="h-10 w-10 shrink-0 animate-spin text-[var(--primary)]"
        style={{
          filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 40%, transparent))",
        }}
        aria-hidden
      />
      <div className="w-full max-w-sm space-y-2">
        <p className="text-base font-semibold tracking-tight text-[var(--entry-parchment)]">{copy.title}</p>
        {caseTitle ? (
          <p className="text-sm text-[color-mix(in_srgb,var(--entry-parchment)_72%,var(--entry-parchment-muted))]">
            {caseTitle}
          </p>
        ) : null}
        <p className="text-xs text-[color-mix(in_srgb,var(--entry-parchment)_68%,var(--entry-parchment-muted))]">
          <span className="font-mono text-[color-mix(in_srgb,var(--on-primary)_75%,var(--primary))]">{joinCode}</span>{" "}
          · {nickname}
        </p>
        <p className="text-xs leading-relaxed text-[color-mix(in_srgb,var(--entry-parchment)_40%,var(--entry-parchment-muted))]">
          <span className="block">{copy.body1}</span>
          {copy.body2 ? <span className="block">{copy.body2}</span> : null}
        </p>
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
    <Modal
      open
      onClose={() => {}}
      title="이전 입장 기록"
      titleId="play-resume-modal-title"
      hideCloseButton
      closeOnBackdrop={false}
      closeOnEscape={false}
      bodyClassName="space-y-5"
    >
      <p className="text-sm text-[var(--muted-foreground)]">
        이 참가 코드로{" "}
        <span className="font-medium text-[var(--primary)]">{record.nickname}</span> 닉네임으로 입장한 기록이 있어요.
        이어갈까요?
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onContinue} className="w-full">
          계속하기
        </Button>
        <Button onClick={onNew} variant="outline" className="w-full">
          새 닉네임으로 입장
        </Button>
      </div>
    </Modal>
  );
}

function PlayHeaderTeamPlace({
  teamName,
  placeName,
  pending,
  className,
}: {
  teamName: string | null;
  placeName: string | null;
  pending?: boolean;
  className?: string;
}) {
  const team = teamName?.trim() || "—";
  const place = placeName?.trim() || "—";

  return (
    <div
      className={cn(
        playSurfaceCool,
        "inline-flex w-fit min-w-0 max-w-full shrink-0 flex-row items-stretch px-3 py-2.5",
        "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      {pending ? (
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-90" aria-hidden />
          불러오는 중…
        </div>
      ) : (
        <>
          <div className="flex min-w-0 max-w-[6.5rem] shrink-0 flex-col justify-center sm:max-w-[7.5rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              팀
            </p>
            <p className="mt-1 truncate font-mono text-base font-semibold tabular-nums text-[var(--primary)]">
              {team}
            </p>
          </div>
          <div
            className="mx-2.5 w-px shrink-0 self-stretch bg-[var(--play-border-cool)] sm:mx-3"
            aria-hidden
          />
          <div className="flex min-w-0 max-w-[min(100%,14rem)] flex-1 flex-col justify-center sm:max-w-[16rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              담당 장소
            </p>
            <p className="mt-1 line-clamp-2 break-words text-base font-semibold leading-snug text-[var(--primary)]">
              {place}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div
          className="play-shell flex min-h-dvh flex-col items-center justify-center px-4"
          style={PLAY_PAGE_BLACK_BG}
        >
          <LoadingState variant="page" tone="play" className="min-h-0 py-8" />
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
