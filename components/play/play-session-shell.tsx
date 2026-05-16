"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { IngredientExpertPanel } from "@/components/play/ingredient-expert-panel";
import { ScenarioBriefingLayout } from "@/components/play/scenario-briefing-layout";
import { TeamKitchenPanel } from "@/components/play/team-kitchen-panel";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import {
  PLAY_PAGE_BLACK_BG,
  PlayAtmosphere,
  playLoaderRegion,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playSurfaceCool,
  playSurfacePanel,
} from "@/components/play/play-atmosphere";
import { PlayHeaderTeamPlace } from "@/components/play/play-header-team-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { parseScenarioPack } from "@/lib/api/lessons";
import type { SessionPhase } from "@/lib/api/lessons";
import {
  assignOrphanPlayersForOngoingSession,
  getPlayerById,
  getPlaySessionDetails,
  getSessionByJoinCode,
  getTeamById,
  joinPlayerSession,
  setPlayerOnline,
} from "@/lib/api/play";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play-resume";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function PlaySessionShell({
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
  const [message, setMessage] = useState<string | null>(null);
  const [resumeDecided, setResumeDecided] = useState(false);

  const playerQuery = useQuery({
    queryKey: ["play-player", playerId],
    queryFn: async () => getPlayerById(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const assignedIngredientId = playerQuery.data?.assigned_ingredient_id ?? null;
  const teamId = playerQuery.data?.team_id ?? null;

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId],
    queryFn: async () => getTeamById(teamId as string),
    enabled: Boolean(teamId),
    refetchInterval: teamId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamName = teamQuery.data?.name ?? null;

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

  const scenarioPack = useMemo(
    () => parseScenarioPack(sessionQuery.data?.lessons?.scenario_pack),
    [sessionQuery.data?.lessons?.scenario_pack],
  );

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
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
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
            nickname: nickname.trim() || "참가자",
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
  }, [sessionId, playerId, teamId, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase as SessionPhase | null | undefined;

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
      const phase = session.phase as SessionPhase | null | undefined;
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
      const ph = d.phase as SessionPhase | null | undefined;
      if (ph && ph !== "waiting" && ph !== "session_end") {
        await assignOrphanPlayersForOngoingSession(rec.sessionId);
      }
    } catch {
      /* 배정 실패 시에도 입장 유지 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname, playerId, sessionId, resumeQuery.isLoading, resumeQuery.data, resumeDecided]);

  const hasJoinedSession = Boolean(playerId && sessionId);
  const hasAssignment = Boolean(assignedIngredientId && teamId);

  const teamAcquiredIds = useMemo(
    () => new Set((teamQuery.data?.acquired_ingredients ?? []).map((a) => a.ingredientId)),
    [teamQuery.data?.acquired_ingredients],
  );

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

  if (
    hasSupabaseEnv &&
    isInvestigation &&
    scenarioPack &&
    playerId &&
    teamId &&
    assignedIngredientId
  ) {
    return (
      <IngredientExpertPanel
        pack={scenarioPack}
        playerId={playerId}
        teamId={teamId}
        teamName={teamName}
        ingredientId={assignedIngredientId}
        acquiredIngredientIds={teamAcquiredIds}
        onAcquired={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
        }}
        pending={playerQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isFinalReport && scenarioPack && teamQuery.data) {
    return (
      <TeamKitchenPanel
        pack={scenarioPack}
        team={teamQuery.data}
        teamName={teamName}
        onUpdate={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
        }}
        pending={teamQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isBriefing) {
    const ingredientLabel =
      scenarioPack?.ingredients.find((i) => i.id === assignedIngredientId)?.name ??
      assignedIngredientId ??
      null;
    return (
      <PlayAtmosphere>
        <div className="flex min-h-dvh flex-col">
          <header className={playPhaseHeaderChromeShell}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader
                phase={1}
                title="오늘의 급식 브리핑"
                description="팀과 전문 재료를 확인한 뒤, 오늘 완성할 급식 메뉴를 살펴보세요."
                rightSlot={
                  <PlayHeaderTeamPlace
                    teamName={teamName}
                    placeName={ingredientLabel}
                    placeLabel="전문 재료"
                    pending={playerQuery.isLoading || !hasAssignment}
                  />
                }
              />
            </div>
          </header>

          <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col space-y-5 px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:px-6 sm:py-8 md:px-8">
            <section className="flex min-h-[min(20rem,52dvh)] flex-1 flex-col motion-safe:animate-[playRevealUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:80ms] md:min-h-[min(22rem,56dvh)]">
              {playerQuery.isLoading && !hasAssignment ? (
                <LoadingState variant="section" tone="play" className="min-h-0 flex-1 py-8" />
              ) : (
                <ScenarioBriefingLayout
                  loading={sessionQuery.isLoading}
                  title={sessionQuery.data?.lessons?.title ?? null}
                  description={sessionQuery.data?.lessons?.description ?? null}
                  scenarioPack={scenarioPack}
                />
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
              <LoadingState variant="page" tone="play" label="확인 중…" className="min-h-0 py-0" />
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
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    joinAndRegisterMutation.mutate({ nickname: nickname.trim() });
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--accent)]" htmlFor="play-session-nickname">
                      닉네임
                    </label>
                    <Input
                      id="play-session-nickname"
                      placeholder="닉네임"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      required
                    />
                  </div>
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
                sessionTitle={sessionQuery.data?.lessons?.title ?? null}
                state={waitingLobbyState}
              />
            </section>
          ) : null}
        </main>
      </div>
    </PlayAtmosphere>
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
