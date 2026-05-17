"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { ActivityIntroductionLayout } from "@/components/play/overview-layout";
import { GroupPhasePanel } from "@/components/play/home-group-panel";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayAtmosphere,
  playLoaderRegion,
  playSurfaceCool,
} from "@/components/play/play-atmosphere";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { parseActivityPack } from "@/lib/api/activities";
import type { ActivityPhase } from "@/lib/api/activities";
import {
  assignOrphanPlayersForOngoingSession,
  getPlayerById,
  getPlaySessionDetails,
  getSessionByJoinCode,
  getGroupById,
  joinPlayerSession,
  listSessionGroups,
  listSessionPlayers,
  setPlayerOnline,
} from "@/lib/api/play";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play-resume";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
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

  const assignedRoleId = playerQuery.data?.assigned_role_id ?? null;
  const groupId = playerQuery.data?.group_id ?? null;

  const groupQuery = useQuery({
    queryKey: ["play-group", groupId],
    queryFn: async () => getGroupById(groupId as string),
    enabled: Boolean(groupId),
    refetchInterval: groupId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const groupName = groupQuery.data?.name ?? null;

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

  const activityPack = useMemo(
    () => parseActivityPack(sessionQuery.data?.activities?.activity_pack),
    [sessionQuery.data?.activities?.activity_pack],
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
        { event: "*", schema: "public", table: "groups", filter: `session_id=eq.${sessionId}` },
        () => {
          if (groupId) void queryClient.invalidateQueries({ queryKey: ["play-group", groupId] });
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
  }, [sessionId, playerId, groupId, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase as ActivityPhase | null | undefined;

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
      const phase = session.phase as ActivityPhase | null | undefined;
      if (phase && phase !== "waiting" && phase !== "results") {
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
      const ph = d.phase as ActivityPhase | null | undefined;
      if (ph && ph !== "waiting" && ph !== "results") {
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
  const hasAssignment = Boolean(assignedRoleId && groupId);

  const groupAcquiredIds = useMemo(
    () => new Set((groupQuery.data?.acquired_items ?? []).map((a) => a.itemId)),
    [groupQuery.data?.acquired_items],
  );

  const isWaitingLobby =
    hasJoinedSession &&
    (sessionQuery.isLoading ||
      !sessionQuery.data ||
      sessionPhase === "waiting" ||
      (sessionPhase !== "overview" &&
        sessionPhase !== "expert_group" &&
        sessionPhase !== "home_group" &&
        sessionPhase !== "results" &&
        !hasAssignment));

  const waitingLobbyState = useMemo(() => {
    if (sessionQuery.isLoading || !sessionQuery.data) return "session_loading" as const;
    return "waiting" as const;
  }, [sessionQuery.isLoading, sessionQuery.data]);

  const isActivityIntroduction = hasJoinedSession && sessionPhase === "overview";
  const isExpertPhase = hasJoinedSession && hasAssignment && sessionPhase === "expert_group";
  const isGroupPhase = hasJoinedSession && sessionPhase === "home_group";
  const isResultsPhase = hasJoinedSession && sessionPhase === "results";

  const resultsQuery = useQuery({
    queryKey: ["play-results", sessionId],
    queryFn: async () => {
      const [groups, players] = await Promise.all([
        listSessionGroups(sessionId as string),
        listSessionPlayers(sessionId as string),
      ]);
      return { groups, players };
    },
    enabled: Boolean(sessionId && isResultsPhase && activityPack),
    refetchInterval: isResultsPhase ? 5_000 : false,
    refetchIntervalInBackground: true,
  });

  const sessionResults = useMemo(() => {
    if (!activityPack || !resultsQuery.data) return null;
    return buildSessionResults(
      activityPack,
      resultsQuery.data.groups.map((g) => ({
        id: g.id,
        name: g.name,
        acquired_items: g.acquired_items,
        completed_tasks: g.completed_tasks,
        completed_at: g.completed_at,
      })),
      resultsQuery.data.players
        .filter((p) => p.group_id)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.group_id as string,
          assignedRoleId: p.assigned_role_id,
        })),
    );
  }, [activityPack, resultsQuery.data]);

  if (hasSupabaseEnv && isResultsPhase && activityPack) {
    const resultsRoleLabel =
      activityPack.items.find((i) => i.id === assignedRoleId)?.name ?? assignedRoleId ?? null;
    return (
      <ResultsPhasePanel
        loading={resultsQuery.isLoading}
        title={sessionQuery.data?.activities?.title ?? null}
        results={sessionResults}
        highlightGroupId={groupId}
        groupName={groupName}
        roleLabel={resultsRoleLabel}
        currentPlayerId={playerId}
      />
    );
  }

  if (
    hasSupabaseEnv &&
    isExpertPhase &&
    activityPack &&
    playerId &&
    groupId &&
    assignedRoleId
  ) {
    return (
      <ExpertPhasePanel
        pack={activityPack}
        playerId={playerId}
        groupId={groupId}
        groupName={groupName}
        itemId={assignedRoleId}
        acquiredItemIds={groupAcquiredIds}
        onAcquired={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-group", groupId] });
        }}
        pending={playerQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isGroupPhase && activityPack && groupQuery.data) {
    return (
      <GroupPhasePanel
        pack={activityPack}
        group={groupQuery.data}
        groupName={groupName}
        onUpdate={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-group", groupId] });
        }}
        pending={groupQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isActivityIntroduction) {
    const roleLabel =
      activityPack?.items.find((i) => i.id === assignedRoleId)?.name ??
      assignedRoleId ??
      null;
    return (
      <PlayPhaseShell
        header={{
          phase: 1,
          title: PLAY_STUDENT_COPY.phaseOverview.title,
          description: PLAY_STUDENT_COPY.phaseOverview.description,
          rightSlot: (
            <PlayHeaderGroupPlace
              groupName={groupName}
              placeName={roleLabel}
              placeLabel={PLAY_STUDENT_COPY.phaseOverview.placeLabel}
              pending={playerQuery.isLoading || !hasAssignment}
            />
          ),
        }}
        mainClassName="max-w-6xl"
      >
        {playerQuery.isLoading && !hasAssignment ? (
          <LoadingState variant="section" tone="play" className="min-h-[min(16rem,40dvh)] py-8" />
        ) : (
          <ActivityIntroductionLayout
            loading={sessionQuery.isLoading}
            title={sessionQuery.data?.activities?.title ?? null}
            description={sessionQuery.data?.activities?.description ?? null}
            activityPack={activityPack}
          />
        )}
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {PLAY_STUDENT_COPY.waiting.waitForTeacher}
        </p>
      </PlayPhaseShell>
    );
  }

  if (hasSupabaseEnv && hasJoinedSession && isWaitingLobby) {
    return (
      <PlayPhaseShell>
        <div className={playLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={joinCode}
            nickname={nickname}
            sessionTitle={sessionQuery.data?.activities?.title ?? null}
            state={waitingLobbyState}
          />
          <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            {PLAY_STUDENT_COPY.waiting.waitForTeacher}
          </p>
        </div>
      </PlayPhaseShell>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <PlayAtmosphere>
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
      </PlayAtmosphere>
    );
  }

  const showResumeModal = Boolean(!hasJoinedSession && !resumeDecided && resumeQuery.data);
  const showNicknameModal =
    !hasJoinedSession &&
    !showResumeModal &&
    !(initialNickname.trim() && joinAndRegisterMutation.isPending) &&
    (!initialNickname.trim() || joinAndRegisterMutation.isError);

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

          <PlayJoinModal
            open={showNicknameModal}
            joinCode={joinCode}
            nickname={nickname}
            message={message}
            pending={joinAndRegisterMutation.isPending}
            onNicknameChange={setNickname}
            onSubmit={() => joinAndRegisterMutation.mutate({ nickname: nickname.trim() })}
          />

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
