"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { activityPageShell, activityLoaderRegion } from "@/components/activity/activity-layout-chrome";
import { ExpertPhasePanel } from "@/components/play/expert-group-panel";
import { ActivityIntroductionLayout } from "@/components/play/overview-layout";
import { GroupPhasePanel, type GroupMember } from "@/components/play/home-group-panel";
import { ResultsPhasePanel } from "@/components/play/results-phase-panel";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayAtmosphere, playSurfaceCool } from "@/components/play/play-atmosphere";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { WaitingLobbyBlock } from "@/components/play/waiting-lobby-block";
import { LoadingState } from "@/components/ui/loading-state";
import { PlayJoinModal } from "@/components/play/play-join-modal";
import { PlayResumeModal } from "@/components/play/play-resume-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { parseActivityPack } from "@/lib/api/activities";
import type { ActivityPhase } from "@/lib/api/activities";
import {
  assignOrphanPlayersForOngoingSession,
  parseAssignedItemIds,
  getPlayerById,
  getPlaySessionDetails,
  getSessionByJoinCode,
  getGroupById,
  joinPlayerSession,
  listSessionGroups,
  listSessionPlayers,
  setPlayerOnline,
  listGroupMembers,
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
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { formatAssignedSlots } from "@/lib/play/assignment-labels";
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
  /** 이전 입장 기록을 거절하고 새 닉네임으로 입장할 때 URL 자동 입장 차단 */
  const declinedResumeRef = useRef(false);
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

  const assignedItemIds = useMemo(
    () => (playerQuery.data ? parseAssignedItemIds(playerQuery.data) : []),
    [playerQuery.data],
  );
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

  const assignedRoleLabel = useMemo(() => {
    if (!sessionId || !activityPack || assignedItemIds.length === 0) {
      return formatAssignedSlots(assignedItemIds.length);
    }
    return (
      formatAssignedRoleLabels(activityPack, assignedItemIds, sessionId) ??
      formatAssignedSlots(assignedItemIds.length)
    );
  }, [sessionId, activityPack, assignedItemIds]);

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
          if (groupId) {
            void queryClient.invalidateQueries({ queryKey: ["play-group", groupId] });
            void queryClient.invalidateQueries({ queryKey: ["play-group-members", groupId] });
          }
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
    declinedResumeRef.current = true;
    setResumeDecided(true);
    setNickname("");
    setMessage(null);
    autoJoinAttempted.current = true;
    queryClient.setQueryData(["play-resume", joinCode], null);
  };

  useEffect(() => {
    if (!initialNickname.trim()) return;
    if (declinedResumeRef.current) return;
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
  const hasAssignment = Boolean(assignedItemIds.length > 0 && groupId);

  const groupAcquiredIds = useMemo(
    () => new Set((playerQuery.data?.word_cards ?? []).map((c) => c.itemId)),
    [playerQuery.data?.word_cards],
  );

  const wordCards = playerQuery.data?.word_cards ?? [];

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

  const groupMembersQuery = useQuery({
    queryKey: ["play-group-members", groupId],
    queryFn: async () => listGroupMembers(groupId as string),
    enabled: Boolean(groupId && isGroupPhase),
    refetchInterval: groupId && isGroupPhase ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const groupMembers: GroupMember[] = useMemo(
    () =>
      (groupMembersQuery.data ?? []).map((m) => ({
        id: m.id,
        nickname: m.nickname,
        assigned_role_id: m.assigned_role_id,
        assigned_item_ids: m.assigned_item_ids,
        word_cards: m.word_cards,
        created_at: m.created_at,
      })),
    [groupMembersQuery.data],
  );

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
        worksheet_placements: g.worksheet_placements,
        completed_at: g.completed_at,
      })),
      resultsQuery.data.players
        .filter((p) => p.group_id)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.group_id as string,
          assignedRoleId: p.assigned_role_id,
          assignedItemIds: parseAssignedItemIds(p),
          word_cards: p.word_cards ?? [],
        })),
      sessionId ?? undefined,
    );
  }, [activityPack, resultsQuery.data, sessionId]);

  if (hasSupabaseEnv && isResultsPhase && activityPack) {
    const resultsRoleLabel = assignedRoleLabel;
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
    assignedItemIds.length > 0
  ) {
    return (
      <ExpertPhasePanel
        pack={activityPack}
        playerId={playerId}
        groupId={groupId}
        groupName={groupName}
        roleScopeKey={sessionId ?? ""}
        assignedItemIds={assignedItemIds}
        acquiredItemIds={groupAcquiredIds}
        onAcquired={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
        }}
        pending={playerQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isGroupPhase && activityPack && groupQuery.data && playerId) {
    return (
      <GroupPhasePanel
        pack={activityPack}
        group={groupQuery.data}
        groupName={groupName}
        playerId={playerId}
        assignedRoleId={playerQuery.data?.assigned_role_id ?? null}
        wordCards={wordCards}
        members={groupMembers}
        onUpdate={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-group", groupId] });
          void queryClient.invalidateQueries({ queryKey: ["play-group-members", groupId] });
          void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
        }}
        pending={groupQuery.isLoading || groupMembersQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isActivityIntroduction) {
    const roleLabel = assignedRoleLabel;
    return (
      <PlayPhaseShell
        header={{
          phase: 1,
          title: "활동 소개",
          description:
            "모둠·역할·공유 학습지를 확인하세요. 전문가 집단에서는 5단계 단서로 단어 카드를 얻습니다.",
          rightSlot: (
            <PlayHeaderGroupPlace
              groupName={groupName}
              placeName={roleLabel}
              placeLabel="나의 역할"
              pending={playerQuery.isLoading || !hasAssignment}
            />
          ),
        }}
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
      </PlayPhaseShell>
    );
  }

  if (hasSupabaseEnv && hasJoinedSession && isWaitingLobby) {
    return (
      <PlayPhaseShell>
        <div className={activityLoaderRegion}>
          <WaitingLobbyBlock
            joinCode={joinCode}
            nickname={nickname}
            sessionTitle={sessionQuery.data?.activities?.title ?? null}
            state={waitingLobbyState}
          />
          <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            선생님이 다음 단계로 넘길 때까지 기다려 주세요.
          </p>
        </div>
      </PlayPhaseShell>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <PlayAtmosphere>
        <main className={cn(activityPageShell, "py-8")}>
          <Card className={cn("w-full", playSurfaceCool)}>
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

  const awaitingAutoJoin =
    Boolean(initialNickname.trim()) &&
    !declinedResumeRef.current &&
    !hasJoinedSession &&
    !resumeDecided &&
    (resumeQuery.isLoading ||
      resumeQuery.isFetching ||
      joinAndRegisterMutation.isPending);

  const showJoinLoading = awaitingAutoJoin;

  const showNicknameModal = !hasJoinedSession && !showResumeModal && !awaitingAutoJoin;

  return (
    <PlayAtmosphere>
      <div className="flex min-h-dvh flex-col">
        <main
          className={cn(
            activityPageShell,
            "flex min-h-0 flex-1 flex-col py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:py-8",
          )}
        >
          {showResumeModal && resumeQuery.data ? (
            <PlayResumeModal
              open
              joinCode={resumeQuery.data.joinCode}
              nickname={resumeQuery.data.nickname}
              onContinue={() => handleContinueAsPlayer(resumeQuery.data!)}
              onNew={handleJoinAsNewPlayer}
            />
          ) : null}

          {showJoinLoading ? (
            <section
              className={cn(
                activityLoaderRegion,
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
            title={
              declinedResumeRef.current || !initialNickname.trim()
                ? "활동 참가"
                : "다시 참가하기"
            }
            description={
              declinedResumeRef.current || !initialNickname.trim()
                ? "선생님이 알려준 참가 코드와 닉네임을 입력하세요."
                : "닉네임을 확인한 뒤 다시 참가해 주세요."
            }
            joinCodeEditable={false}
            showMissingCodeClue={false}
            onNicknameChange={setNickname}
            onSubmit={() => {
              const nick = nickname.trim();
              if (!nick) {
                setMessage("닉네임을 입력해 주세요.");
                return;
              }
              joinAndRegisterMutation.mutate({ nickname: nick });
            }}
          />

        </main>
      </div>
    </PlayAtmosphere>
  );
}
