"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
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
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
          <TeamBadge teamName={teamName} />
          <Card>
            <CardHeader>
              <CardTitle>3단계: 최종 보고서</CardTitle>
            </CardHeader>
            <CardContent>
              {reportSubmitted ? (
                <div className="space-y-4 text-sm text-[var(--foreground)]">
                  <p className="font-medium text-[var(--mystery)]">제출이 완료되었습니다.</p>
                  {teamQuery.data?.report_submitted_at ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(teamQuery.data.report_submitted_at).toLocaleString()}
                    </p>
                  ) : null}
                  {answerSuspectId ? (
                    <div
                      className={
                        "rounded-md border p-3 " +
                        (culpritCorrect
                          ? "border-[var(--accent)] bg-[var(--tint-accent)]"
                          : "border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)]")
                      }
                    >
                      <p className="text-xs font-semibold text-[var(--accent)]">범인 검거 결과</p>
                      <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                        {culpritCorrect ? "검거 성공" : "검거 실패"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        제출: {chosenSuspectName ?? "—"} · 정답: {trueCulpritName ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      이 사건에는 정답 범인이 등록되지 않아 검거 여부를 표시하지 않습니다.
                    </p>
                  )}
                  <p className="text-[var(--muted-foreground)]">
                    교사가 세션을 마칠 때까지 잠시 기다려 주세요.
                  </p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleReportSubmit}>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    팀이 논의한 끝에 제출하세요. 범인은 용의자 중에서만 선택할 수 있습니다. (한 팀당 1회)
                  </p>
                  {caseRoster.length === 0 ? (
                    <p className="text-sm text-[color-mix(in_srgb,var(--highlight)_88%,var(--foreground))]">
                      이 사건에 용의자 목록이 없습니다. 교사에게 문의하세요.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--accent)]" htmlFor="report-suspect">
                        지목한 범인 (용의자)
                      </label>
                      <select
                        id="report-suspect"
                        className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--input,transparent)] px-3 text-sm text-[var(--foreground)]"
                        value={reportSuspectId}
                        onChange={(ev) => setReportSuspectId(ev.target.value)}
                        required
                      >
                        <option value="">선택</option>
                        {caseRoster.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--accent)]">범행 도구 / 방법</label>
                    <Textarea
                      value={reportMethod}
                      onChange={(ev) => setReportMethod(ev.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--accent)]">범행 동기</label>
                    <Textarea
                      value={reportMotive}
                      onChange={(ev) => setReportMotive(ev.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--accent)]">결정적 단서</label>
                    <Textarea
                      value={reportDecisive}
                      onChange={(ev) => setReportDecisive(ev.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  {message ? <p className="text-sm text-[var(--error)]">{message}</p> : null}
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
      </div>
    );
  }

  if (hasSupabaseEnv && isBriefing) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
          <p className="text-center text-sm font-medium text-[var(--mystery)]">1단계: 브리핑</p>
          <TeamBadge teamName={teamName} />
          {playerQuery.isLoading ? (
            <div className="flex justify-center py-8 text-[var(--muted-foreground)]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : playerQuery.data?.club_role && patrolLocationId ? (
            <div className="flex flex-col items-center">
              <DetectiveIdCard
                nickname={nickname.trim() || "탐정원"}
                teamName={teamName}
                zoneName={zoneName ?? ""}
                roleKey={playerQuery.data.club_role}
              />
            </div>
          ) : null}
          <SessionInfoLayout
            zoneName={zoneName}
            playerQuery={playerQuery}
            sessionQuery={sessionQuery}
            message={message}
          />
        </main>
      </div>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>환경 설정 필요</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--foreground)]">
              교실 멀티플레이 모드를 쓰려면 Supabase 환경 변수를 .env에 설정해 주세요.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const showResumeModal = Boolean(!hasJoinedSession && !resumeDecided && resumeQuery.data);

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        {showResumeModal && resumeQuery.data ? (
          <ResumeModal
            record={resumeQuery.data}
            onContinue={() => handleContinueAsPlayer(resumeQuery.data!)}
            onNew={handleJoinAsNewPlayer}
          />
        ) : null}

        {!hasJoinedSession && !showResumeModal && initialNickname.trim() && joinAndRegisterMutation.isPending ? (
          <section className="flex min-h-[40vh] items-center justify-center rounded-lg bg-[var(--ink-88)] p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-[var(--foreground)]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" aria-hidden />
              <p className="font-mono text-sm text-[var(--muted-foreground)]">보안 승인 확인 중…</p>
            </div>
          </section>
        ) : null}

        {!hasJoinedSession &&
        !showResumeModal &&
        !(initialNickname.trim() && joinAndRegisterMutation.isPending) &&
        (!initialNickname.trim() || joinAndRegisterMutation.isError) ? (
          <section className="flex items-center justify-center rounded-lg bg-[var(--ink-88)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">입장 후 부원 배정·브리핑이 진행됩니다.</p>
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
                  <a className="underline hover:text-[var(--foreground)]" href={ROUTES.play}>
                    입장 화면
                  </a>
                  에서 사건 코드를 입력해 주세요.
                </p>
              ) : null}
              {message ? <p className="mt-3 text-xs text-[var(--foreground)]">{message}</p> : null}
            </div>
          </section>
        ) : null}

        {hasJoinedSession && isWaitingLobby ? (
          <Card className="mt-4">
            <CardContent className="flex items-center gap-3 py-5 text-[var(--foreground)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" aria-hidden />
              <p className="text-sm">
                {sessionPhase === "waiting"
                  ? "교사가 세션을 시작할 때까지 잠시만 기다려 주세요."
                  : "팀·역할·순찰 구역이 배정되는 중입니다…"}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </main>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">이전 입장 기록</h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          이 사건 코드로{" "}
          <span className="font-medium text-[var(--accent)]">{record.nickname}</span> 닉네임으로 입장한 기록이
          있어요. 이어갈까요?
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

function TeamBadge({ teamName }: { teamName: string | null }) {
  if (!teamName) return null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--accent)]/40 bg-[var(--ink-50)] px-4 py-3">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">팀</span>
      <span className="font-mono text-xl font-semibold text-[var(--accent)]">{teamName}</span>
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
