"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  activityBodyPaddingBottomContained,
  activityBodyPaddingY,
  activityLayoutFrame,
  activityPageColumn,
} from "@/lib/theme/activity-layout-chrome";
import { ExpertPhasePanel } from "@/components/play/panels/expert-group-panel";
import { GroupPhasePanel, type GroupMember } from "@/components/play/panels/home-group-panel";
import { IndividualQuizPanel } from "@/components/play/quiz/individual-quiz-panel";
import { OverviewPhasePanel } from "@/components/play/panels/overview-phase-panel";
import { ResultsPhasePanel } from "@/components/play/panels/results-phase-panel";
import { PlayPhaseShell } from "@/components/play/shell/play-phase-shell";
import { PlayAtmosphere, playSurfaceCool } from "@/components/play/shell/play-atmosphere";
import { LoadingState } from "@/components/ui/loading-state";
import { PlayJoinModal } from "@/components/play/modals/play-join-modal";
import { PlayResumeModal } from "@/components/play/modals/play-resume-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { parseActivityPack } from "@/lib/api/activities";
import type { ActivityPhase } from "@/lib/api/activities";
import {
  assignOrphanPlayersForOngoingSession,
  getPlayerById,
  getPlaySessionDetails,
  getSessionByJoinCode,
  getGroupById,
  joinPlayerSession,
  deletePlayer,
  listSessionGroups,
  listSessionPlayers,
  submitPracticeResult,
  setPlayerOnline,
  listGroupMembers,
  submitIndividualQuiz,
  completePeerPracticeQuestion,
  ensureHomeGroupComplete,
} from "@/lib/api/play";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play/play-resume";
import { resolveHomeGroupMembers } from "@/lib/play/home-group-members";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { formatAssignedRoleLabels } from "@/lib/play/role-codenames";
import { LOADING_COPY } from "@/lib/activity-pack/activity-phases";
import { cn } from "@/lib/utils";

export function PlaySessionShell({
  joinCode,
  initialPlayerId = "",
}: {
  joinCode: string;
  initialPlayerId?: string;
}) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [nickname, setNickname] = useState("");
  const autoJoinAttempted = useRef(false);
  /** 이전 입장 기록을 거절하고 새 닉네임으로 입장할 때 URL 자동 입장 차단 */
  const declinedResumeRef = useRef(false);
  const pendingDeletePlayerIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => initialPlayerId || null);
  const [message, setMessage] = useState<string | null>(null);
  const [resumeDecided, setResumeDecided] = useState(false);

  const playerQuery = useQuery({
    queryKey: ["play-player", playerId],
    queryFn: async () => getPlayerById(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  // URL 쿼리 스트링의 playerId 값을 상태(playerId)와 동기화
  useEffect(() => {
    if (playerId) {
      if (searchParams.get("playerId") !== playerId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("playerId", playerId);
            next.delete("nickname");
            return next;
          },
          { replace: true }
        );
      }
    } else {
      if (searchParams.has("playerId")) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("playerId");
            next.delete("nickname");
            return next;
          },
          { replace: true }
        );
      }
    }
  }, [playerId, searchParams, setSearchParams]);

  // 플레이어 데이터 로드 완료 시 session_id 와 닉네임 동기화
  useEffect(() => {
    if (playerQuery.data?.session_id) {
      setSessionId(playerQuery.data.session_id);
    }
    if (playerQuery.data?.nickname) {
      setNickname(playerQuery.data.nickname);
    }
  }, [playerQuery.data?.session_id, playerQuery.data?.nickname]);

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

  const assignedRoleLabel = useMemo(() => {
    if (!assignedRoleId) return null;
    if (!sessionId || !activityPack) return "배정됨";
    return formatAssignedRoleLabels(activityPack, [assignedRoleId], sessionId) ?? "배정됨";
  }, [sessionId, activityPack, assignedRoleId]);

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

      if (pendingDeletePlayerIdRef.current && phase === "waiting") {
        try {
          await deletePlayer(pendingDeletePlayerIdRef.current);
        } catch (err) {
          console.error("Failed to delete old player:", err);
        }
        pendingDeletePlayerIdRef.current = null;
      }

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
    if (resumeQuery.data?.playerId) {
      pendingDeletePlayerIdRef.current = resumeQuery.data.playerId;
    }
    if (joinCode) clearResumeRecord(joinCode);
    declinedResumeRef.current = true;
    setResumeDecided(true);
    setPlayerId(null);
    setSessionId(null);
    setNickname("");
    setMessage(null);
    autoJoinAttempted.current = true;
    queryClient.setQueryData(["play-resume", joinCode], null);
  };

  const hasJoinedSession = Boolean(playerId && sessionId);
  const hasAssignment = Boolean(assignedRoleId && groupId);

  const isWaitingLobby =
    hasJoinedSession &&
    (sessionQuery.isLoading ||
      !sessionQuery.data ||
      sessionPhase === "waiting" ||
      (sessionPhase !== "overview" &&
        sessionPhase !== "expert_group" &&
        sessionPhase !== "home_group" &&
        sessionPhase !== "individual_quiz" &&
        sessionPhase !== "results" &&
        !hasAssignment));

  const waitingLobbyState = useMemo(() => {
    if (sessionQuery.isLoading || !sessionQuery.data) return "session_loading" as const;
    return "waiting" as const;
  }, [sessionQuery.isLoading, sessionQuery.data]);

  const isActivityIntroduction = hasJoinedSession && sessionPhase === "overview";
  const isExpertPhase = hasJoinedSession && hasAssignment && sessionPhase === "expert_group";
  const isGroupPhase = hasJoinedSession && sessionPhase === "home_group";
  const isIndividualQuizPhase = hasJoinedSession && sessionPhase === "individual_quiz";
  const isResultsPhase = hasJoinedSession && sessionPhase === "results";

  const groupMembersQuery = useQuery({
    queryKey: ["play-group-members", groupId],
    queryFn: async () => listGroupMembers(groupId as string),
    enabled: Boolean(groupId && isGroupPhase),
    refetchInterval: groupId && isGroupPhase ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const groupMembers: GroupMember[] = useMemo(
    () => resolveHomeGroupMembers(groupMembersQuery.data ?? [], playerId),
    [groupMembersQuery.data, playerId],
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
      })),
      resultsQuery.data.players
        .filter((p) => p.group_id)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.group_id as string,
          assignedRoleId: p.assigned_role_id,
          baseScore: p.base_score,
          individual_quiz_answers: p.individual_quiz_answers ?? [],
          individual_quiz_submitted_at: p.individual_quiz_submitted_at,
          home_group_completed_at: p.home_group_completed_at,
        })),
      sessionId ?? undefined,
    );
  }, [activityPack, resultsQuery.data, sessionId]);

  if (hasSupabaseEnv && isResultsPhase && activityPack) {
    const resultsRoleLabel = assignedRoleLabel;
    return (
      <ResultsPhasePanel
        loading={resultsQuery.isLoading}
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
        roleId={assignedRoleId}
        groupName={groupName}
        roleScopeKey={sessionId ?? ""}
        onSubmitPractice={async (results) => {
          await submitPracticeResult({
            playerId,
            pack: activityPack,
            roleId: assignedRoleId,
            results,
          });
          void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
        }}
        practiceSubmitted={Boolean(playerQuery.data?.practice_submitted_at)}
        practiceResults={playerQuery.data?.practice_results ?? []}
        practiceBaseScore={playerQuery.data?.base_score ?? null}
        pending={playerQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isGroupPhase && activityPack && groupQuery.data && playerId) {
    return (
      <GroupPhasePanel
        pack={activityPack}
        groupName={groupName}
        playerId={playerId}
        ownRoleId={assignedRoleId}
        members={groupMembers}
        roleScopeKey={sessionId ?? ""}
        peerPracticeCompleted={playerQuery.data?.peer_practice_completed ?? []}
        practiceResults={playerQuery.data?.practice_results ?? []}
        baseScore={playerQuery.data?.base_score ?? null}
        homeGroupCompletedAt={playerQuery.data?.home_group_completed_at ?? null}
        onPeerQuestionComplete={(questionId, wrongAttempts, wrongChoices, viewedHint1, viewedHint2) =>
          completePeerPracticeQuestion({
            playerId: playerId!,
            pack: activityPack,
            memberRoleIds: groupMembers.map((m) => m.assigned_role_id),
            ownRoleId: assignedRoleId,
            questionId,
            wrongAttempts,
            wrongChoices,
            viewedHint1,
            viewedHint2,
          }).then(() => {
            void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
          })
        }
        onEnsureHomeGroupComplete={() =>
          ensureHomeGroupComplete({
            playerId: playerId!,
            pack: activityPack,
            memberRoleIds: groupMembers.map((m) => m.assigned_role_id),
            ownRoleId: assignedRoleId,
          }).then(() => {
            void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
          })
        }
        pending={groupQuery.isLoading || groupMembersQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isIndividualQuizPhase && activityPack && playerId) {
    return (
      <IndividualQuizPanel
        pack={activityPack}
        groupName={groupName}
        roleLabel={assignedRoleLabel}
        roleScopeKey={sessionId ?? ""}
        baseScore={playerQuery.data?.base_score ?? null}
        submittedAnswers={playerQuery.data?.individual_quiz_answers ?? undefined}
        submittedAt={playerQuery.data?.individual_quiz_submitted_at ?? null}
        onSubmit={(answers) =>
          submitIndividualQuiz({ playerId, pack: activityPack, answers })
        }
        onUpdate={() => {
          void queryClient.invalidateQueries({ queryKey: ["play-player", playerId] });
        }}
        pending={playerQuery.isLoading}
      />
    );
  }

  if (hasSupabaseEnv && isActivityIntroduction) {
    return (
      <OverviewPhasePanel
        groupName={groupName}
        roleLabel={assignedRoleLabel}
        pending={
          playerQuery.isLoading ||
          sessionQuery.isLoading ||
          (!hasAssignment && Boolean(playerId))
        }
      />
    );
  }

  if (hasSupabaseEnv && hasJoinedSession && isWaitingLobby) {
    const label =
      waitingLobbyState === "session_loading"
        ? LOADING_COPY.default
        : LOADING_COPY.sessionStarting;

    return (
      <PlayPhaseShell mainClassName="flex min-h-0 flex-1 flex-col">
        <LoadingState variant="section" label={label} className="min-h-0 flex-1" />
      </PlayPhaseShell>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <PlayAtmosphere>
        <main className={cn(activityPageColumn, "py-8")}>
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

  const showJoinLoading =
    !showResumeModal &&
    ((Boolean(playerId) && playerQuery.isLoading) ||
      joinAndRegisterMutation.isPending ||
      ((resumeQuery.isLoading || resumeQuery.isFetching) && !resumeDecided));

  if (showJoinLoading) {
    return (
      <PlayPhaseShell mainClassName="flex min-h-0 flex-1 flex-col">
        <LoadingState
          variant="section"
          label={LOADING_COPY.verifying}
          className="min-h-0 flex-1"
        />
      </PlayPhaseShell>
    );
  }

  const showNicknameModal = !hasJoinedSession && !showResumeModal && !showJoinLoading;

  return (
    <PlayAtmosphere>
      <div className={activityLayoutFrame}>
        <main
          className={cn(
            activityPageColumn,
            activityBodyPaddingY,
            "flex min-h-0 flex-1 flex-col",
            activityBodyPaddingBottomContained,
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

          <PlayJoinModal
            open={showNicknameModal}
            joinCode={joinCode}
            nickname={nickname}
            message={message}
            pending={joinAndRegisterMutation.isPending}
            title="활동 참가"
            description="선생님이 알려준 참가 코드와 닉네임을 입력하세요."
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
