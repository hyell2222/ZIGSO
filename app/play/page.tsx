"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
import {
  RESOLUTION_FIND_MAX_ATTEMPTS,
  RESOLUTION_UNLOCK_MAX_ATTEMPTS,
  RESOLUTION_UNLOCK_PICK_COUNT,
  ResolutionMissionFlow,
  type ResolutionStage,
} from "@/components/play/resolution-mission-flow";
import { SessionInfoLayout } from "@/components/play/session-info-layout";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addFoundClueToTeam,
  getCharacterById,
  getPlayerById,
  getPlaySessionDetails,
  getScenarioCluesByIds,
  getScenarioMapEntities,
  getScenarioResolutionLocation,
  getSessionByJoinCode,
  getTeamById,
  joinPlayerSession,
  markTeamSolved,
  setPlayerOnline,
} from "@/lib/api/play";
import type { ScenarioClueForMap } from "@/lib/api/play";
import {
  clearResumeRecord,
  getResumeRecord,
  saveResumeRecord,
  type ResumeRecord,
} from "@/lib/play-resume";
import { getSessionRoomChannelName } from "@/lib/realtime/session-presence";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

function PlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const joinCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hideRoleReveal, setHideRoleReveal] = useState(false);
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [resumeDecided, setResumeDecided] = useState(false);
  // 사건 해결 단계: 학생이 정답 장소 이름을 맞히면 해당 location id 가 들어간다.
  // 한 번 맞히면(one-shot) 풀스크린 맵으로 이동, 다시 추측하지 않는다.
  const [resolutionGuessedLocationId, setResolutionGuessedLocationId] = useState<
    string | null
  >(null);
  const [resolutionGuessInput, setResolutionGuessInput] = useState("");
  const [resolutionGuessError, setResolutionGuessError] = useState<string | null>(null);
  // 사건 해결 미션 단계 상태 (정답 장소 입장 후 진행되는 2/3단계).
  // 기본값은 "find" — 맵에 입장하는 즉시 찾기 단계로 돌입 ("찾기 시작" 버튼 생략).
  const [resolutionStage, setResolutionStage] = useState<ResolutionStage>("find");
  const [findAttemptsUsed, setFindAttemptsUsed] = useState(0);
  const [findError, setFindError] = useState<string | null>(null);
  const [foundClueId, setFoundClueId] = useState<string | null>(null);
  const [unlockAttemptsUsed, setUnlockAttemptsUsed] = useState(0);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const playerQuery = useQuery({
    queryKey: ["play-player", playerId],
    queryFn: async () => getPlayerById(playerId as string),
    enabled: Boolean(playerId),
    refetchInterval: playerId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const characterId = playerQuery.data?.character_id ?? null;
  const teamId = playerQuery.data?.team_id ?? null;

  const characterQuery = useQuery({
    queryKey: ["play-character", characterId, sessionId],
    queryFn: async () => getCharacterById(characterId as string),
    enabled: Boolean(characterId && sessionId),
  });

  const characterName = characterQuery.data?.name ?? null;

  const teamQuery = useQuery({
    queryKey: ["play-team", teamId],
    queryFn: async () => getTeamById(teamId as string),
    enabled: Boolean(teamId),
    refetchInterval: teamId ? 3_000 : false,
    refetchIntervalInBackground: true,
  });

  const teamName = teamQuery.data?.name ?? null;
  const teamSolved = Boolean(teamQuery.data?.is_solved);

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

  // 동일 join_code 로 다시 들어왔을 때 이전 플레이어로 이어 들어갈지 확인
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
        config: {
          presence: {
            key: `player:${playerId}`,
          },
        },
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
          if (teamId) {
            void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            role: "player",
            player_id: playerId,
            nickname: nickname.trim() || "Player",
            character_id: characterId ?? undefined,
            character_name: characterName ?? undefined,
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          void queryClient.invalidateQueries({ queryKey: ["play-session", sessionId] });
        }
      });

    return () => {
      // 명시적 untrack 으로 호스트가 'leave' 이벤트를 즉시 받을 수 있게 한다.
      void channel.untrack().catch(() => {});
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, teamId, characterId, characterName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  useEffect(() => {
    if (sessionPhase !== "session_end") return;
    if (joinCode) clearResumeRecord(joinCode);
    router.replace(ROUTES.home);
  }, [sessionPhase, router, joinCode]);

  // 입장 직후 / 탭 복귀 시 is_online=true 보정.
  // 오프라인 처리는 호스트 측 presence 동기화에 위임한다 (단일 진리원).
  useEffect(() => {
    if (!playerId) return;
    void setPlayerOnline(playerId, true).catch(() => {});

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void setPlayerOnline(playerId, true).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playerId]);

  const joinAndRegisterMutation = useMutation({
    mutationFn: async () => {
      const normalizedJoinCode = joinCode.trim().toUpperCase();
      if (!normalizedJoinCode) throw new Error("Invalid access. Please enter from home with a join code.");
      if (!nickname.trim()) throw new Error("Enter your nickname.");

      const session = await getSessionByJoinCode(normalizedJoinCode);
      setSessionId(session.id);

      const result = await joinPlayerSession({
        session_id: session.id,
        nickname: nickname.trim(),
      });
      setPlayerId(result.player.id);
      setHideRoleReveal(false);

      saveResumeRecord({
        joinCode: normalizedJoinCode,
        sessionId: session.id,
        playerId: result.player.id,
        nickname: nickname.trim(),
      });
    },
  });

  const handleContinueAsPlayer = (rec: ResumeRecord) => {
    setSessionId(rec.sessionId);
    setPlayerId(rec.playerId);
    setNickname(rec.nickname);
    setHideRoleReveal(false);
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
  };

  const hasJoinedSession = Boolean(playerId && sessionId);
  const hasAssignment = Boolean(characterId && teamId);

  const isWaitingLobby =
    hasJoinedSession && (sessionQuery.isLoading || sessionPhase === "waiting" || !hasAssignment);
  const shouldShowCharacterReveal =
    hasJoinedSession && hasAssignment && sessionPhase === "briefing" && !hideRoleReveal;
  const shouldShowBriefingInfo =
    hasJoinedSession && hasAssignment && sessionPhase === "briefing" && hideRoleReveal;
  const showOwnLocationMap =
    hasJoinedSession && hasAssignment && sessionPhase === "investigation";
  // 사건 해결 단계: 학생이 정답 장소 이름을 맞힌 뒤에만 해당 장소의 맵을 띄운다.
  // 맞히기 전에는 추측 폼만 보여준다 (showResolutionGuessForm 분기).
  const showResolutionLocationMap =
    hasJoinedSession &&
    hasAssignment &&
    sessionPhase === "resolution" &&
    Boolean(resolutionGuessedLocationId);
  const showResolutionGuessForm =
    hasJoinedSession &&
    hasAssignment &&
    sessionPhase === "resolution" &&
    !resolutionGuessedLocationId;

  // 사건 해결 단계 진입 시 정답 장소 정보(이름 비교용) 미리 로드.
  const resolutionLocationQuery = useQuery({
    queryKey: ["play-resolution-location", sessionQuery.data?.scenario_id],
    queryFn: async () =>
      getScenarioResolutionLocation(sessionQuery.data!.scenario_id!),
    enabled: Boolean(
      (sessionPhase === "briefing" || sessionPhase === "resolution") &&
        sessionQuery.data?.scenario_id,
    ),
    staleTime: 60_000,
  });

  const mapQuery = useQuery({
    queryKey: [
      "play-scenario-map",
      sessionQuery.data?.scenario_id,
      sessionPhase,
      sessionPhase === "investigation"
        ? `char:${characterId ?? ""}`
        : sessionPhase === "resolution"
          ? `loc:${resolutionGuessedLocationId ?? ""}`
          : "briefing",
    ],
    queryFn: async () =>
      getScenarioMapEntities(sessionQuery.data!.scenario_id!, {
        restrictToCharacterId:
          sessionPhase === "investigation" ? characterId : null,
        restrictToLocationId:
          sessionPhase === "resolution" ? resolutionGuessedLocationId : null,
      }),
    enabled: Boolean(
      (showOwnLocationMap || showResolutionLocationMap || shouldShowBriefingInfo) &&
        sessionQuery.data?.scenario_id &&
        // 사건 해결 단계에서는 정답을 맞힌 뒤에만 fetch
        (sessionPhase !== "resolution" || resolutionGuessedLocationId),
    ),
  });

  const discoveredCluesForBriefing = useMemo(() => {
    const byId = new Map((mapQuery.data?.clues ?? []).map((clue) => [clue.id, clue]));
    return discoveredClueIds
      .map((id) => byId.get(id))
      .filter((clue): clue is ScenarioClueForMap => clue != null)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [discoveredClueIds, mapQuery.data?.clues]);

  useEffect(() => {
    setDiscoveredClueIds([]);
  }, [sessionId]);

  // phase 가 resolution 이외로 바뀌면 추측 상태를 비워둔다.
  // (다음 사건/세션에서 동일 입력으로 자동 통과되는 일이 없도록)
  useEffect(() => {
    if (sessionPhase !== "resolution") {
      setResolutionGuessedLocationId(null);
      setResolutionGuessInput("");
      setResolutionGuessError(null);
      setResolutionStage("find");
      setFindAttemptsUsed(0);
      setFindError(null);
      setFoundClueId(null);
      setUnlockAttemptsUsed(0);
      setUnlockError(null);
    }
  }, [sessionPhase]);

  // 정답 장소를 다시 잠그는(거의 없는) 상황에 대비해 stage 초기화
  useEffect(() => {
    if (!resolutionGuessedLocationId) {
      setResolutionStage("find");
      setFindAttemptsUsed(0);
      setFindError(null);
      setFoundClueId(null);
      setUnlockAttemptsUsed(0);
      setUnlockError(null);
    }
  }, [resolutionGuessedLocationId]);

  const handleResolutionGuessSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResolutionGuessError(null);
    const target = resolutionLocationQuery.data;
    if (!target) {
      setResolutionGuessError(
        "이 시나리오에는 최종 미션이 설정되어 있지 않아 잠시 후 다시 시도해주세요.",
      );
      return;
    }
    const normalizedAnswer = (target.name ?? "").trim().toLowerCase();
    const normalizedGuess = resolutionGuessInput.trim().toLowerCase();
    if (!normalizedGuess) {
      setResolutionGuessError("미션 진입 코드를 입력해주세요.");
      return;
    }
    if (normalizedGuess !== normalizedAnswer) {
      setResolutionGuessError("코드가 일치하지 않습니다. 단서를 다시 살펴보세요.");
      return;
    }
    setResolutionGuessedLocationId(target.id);
  };

  // 발견 단서를 팀 found_clue_ids 로 동기화 (이미 동기화한 ID는 건너뜀)
  const syncedClueIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!teamId) return;
    const newlyFound = discoveredClueIds.filter((id) => !syncedClueIdsRef.current.has(id));
    if (newlyFound.length === 0) return;
    newlyFound.forEach((id) => syncedClueIdsRef.current.add(id));
    void Promise.all(newlyFound.map((id) => addFoundClueToTeam(teamId, id))).catch(() => {});
  }, [discoveredClueIds, teamId]);

  const handleClaimSolved = () => {
    if (!teamId) return;
    void markTeamSolved(teamId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["play-team", teamId] });
    });
  };

  /* ---------------------------------------------------------------------- */
  /*  Resolution mission (find target prop + unlock with 3 items)            */
  /* ---------------------------------------------------------------------- */

  // 잠금 해제 모달용: 팀이 수집한 단서 ID 들로 이름을 채워온다.
  // 정답 prop 의 단서 이름도 같은 쿼리에서 채워질 수 있도록 target id 를 함께 포함.
  const teamFoundClueIds = teamQuery.data?.found_clue_ids ?? [];
  const targetClueId = resolutionLocationQuery.data?.target_clue_id ?? null;
  const collectedItemQueryIds = useMemo(() => {
    const set = new Set<string>(teamFoundClueIds);
    if (targetClueId) set.add(targetClueId);
    return Array.from(set);
  }, [teamFoundClueIds, targetClueId]);

  const collectedItemsQuery = useQuery({
    queryKey: ["play-collected-items", sessionId, collectedItemQueryIds.sort().join(",")],
    queryFn: async () => getScenarioCluesByIds(collectedItemQueryIds),
    enabled:
      sessionPhase === "resolution" &&
      Boolean(resolutionGuessedLocationId) &&
      collectedItemQueryIds.length > 0,
    staleTime: 30_000,
  });

  const collectedItemsForUnlock = useMemo(() => {
    const found = new Set<string>(teamFoundClueIds);
    return (collectedItemsQuery.data ?? [])
      .filter((c) => found.has(c.id))
      .map((c) => ({ id: c.id, name: c.name?.trim() || "이름 없는 단서" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectedItemsQuery.data, teamFoundClueIds]);

  /**
   * 사건 해결 단계 인벤토리: 팀이 수집한 모든 단서를 표시한다.
   * (investigation 단계에서는 이 값을 InvestigationMapShell 에 전달하지 않으므로
   *  맵 컴포넌트가 기존대로 "내가 직접 F 로 발견한 단서만" 보여준다.)
   * `ScenarioClueMeta` → `ScenarioClueForMap` 변환: 인벤토리 표시에 props 는 불필요하므로 null.
   */
  const teamInventoryClues = useMemo<ScenarioClueForMap[]>(() => {
    const found = new Set<string>(teamFoundClueIds);
    return (collectedItemsQuery.data ?? [])
      .filter((c) => found.has(c.id))
      .map<ScenarioClueForMap>((c) => ({
        id: c.id,
        name: c.name,
        content: c.content,
        location_id: c.location_id,
        props: null,
      }));
  }, [collectedItemsQuery.data, teamFoundClueIds]);

  const foundClueName = useMemo(() => {
    if (!foundClueId) return null;
    return (
      collectedItemsQuery.data?.find((c) => c.id === foundClueId)?.name ?? null
    );
  }, [foundClueId, collectedItemsQuery.data]);

  const handleResetFind = () => {
    setFindAttemptsUsed(0);
    setFindError(null);
  };
  const handleInvestigateProp = (clueIds: string[]) => {
    if (resolutionStage !== "find") return;
    if (findAttemptsUsed >= RESOLUTION_FIND_MAX_ATTEMPTS) return;
    if (!targetClueId) return;
    const guessed = clueIds[0] ?? null;
    if (!guessed) return;
    if (guessed === targetClueId) {
      setFoundClueId(guessed);
      setFindError(null);
      setResolutionStage("found");
      return;
    }
    const next = findAttemptsUsed + 1;
    setFindAttemptsUsed(next);
    if (next >= RESOLUTION_FIND_MAX_ATTEMPTS) {
      setFindError("기회를 모두 사용했습니다. 다시 도전하기로 기회를 리셋하세요.");
    } else {
      setFindError(
        `여기에 없습니다. 남은 기회: ${RESOLUTION_FIND_MAX_ATTEMPTS - next}`,
      );
    }
  };
  const handleContinueToUnlock = () => {
    setResolutionStage("unlock");
    setUnlockError(null);
  };
  const handleResetUnlock = () => {
    setUnlockAttemptsUsed(0);
    setUnlockError(null);
  };
  const handleSubmitUnlock = (selectedIds: string[]) => {
    if (resolutionStage !== "unlock") return;
    if (unlockAttemptsUsed >= RESOLUTION_UNLOCK_MAX_ATTEMPTS) return;
    if (selectedIds.length !== RESOLUTION_UNLOCK_PICK_COUNT) return;
    const answer = new Set(resolutionLocationQuery.data?.unlock_clue_ids ?? []);
    const guess = new Set(selectedIds);
    const isCorrect =
      answer.size === guess.size &&
      Array.from(answer).every((id) => guess.has(id));
    if (isCorrect) {
      setUnlockError(null);
      setResolutionStage("complete");
      handleClaimSolved();
      return;
    }
    const next = unlockAttemptsUsed + 1;
    setUnlockAttemptsUsed(next);
    if (next >= RESOLUTION_UNLOCK_MAX_ATTEMPTS) {
      setUnlockError("기회를 모두 사용했습니다. 다시 도전하기로 기회를 리셋하세요.");
    } else {
      setUnlockError(
        `선택한 조합이 맞지 않습니다. 남은 기회: ${RESOLUTION_UNLOCK_MAX_ATTEMPTS - next}`,
      );
    }
  };

  // 팀이 다른 경로(=다른 팀원 완료)로 미션을 완료하면 stage 도 동기화
  useEffect(() => {
    if (teamSolved && resolutionStage !== "complete") {
      setResolutionStage("complete");
    }
  }, [teamSolved, resolutionStage]);

  if (hasSupabaseEnv && (showOwnLocationMap || showResolutionLocationMap) && sessionPhase) {
    const isResolutionMap = sessionPhase === "resolution" && showResolutionLocationMap;
    const resolutionInfo = resolutionLocationQuery.data;
    // 사건 해결 단계에서는 미션 플로우(overlay)가 진행을 책임진다.
    // 정보 로딩 중에는 legacy "사건 해결" 버튼을 잠시라도 노출하지 않는다 — 우회 클릭 방지.
    const showLegacyClaimButton = false;

    // 2단계(find)일 때만 맵 인터랙션(E키)을 미션 흐름으로 가로챈다.
    // 그 외 단계(found/unlock/complete)에서는 맵의 기본 동작을 유지하되,
    // 정답 prop 식별을 막기 위해 조사 입력은 무시된다.
    const investigateModeForMap =
      isResolutionMap && resolutionStage === "find"
        ? {
            topBarLabel: `최종 미션: F로 단서 수집, E로 미션 타겟 조사 · 남은 기회 ${Math.max(
              0,
              RESOLUTION_FIND_MAX_ATTEMPTS - findAttemptsUsed,
            )}/${RESOLUTION_FIND_MAX_ATTEMPTS}`,
            onInvestigate: handleInvestigateProp,
          }
        : undefined;

    return (
      <InvestigationMapShell
        phase={sessionPhase as "investigation" | "resolution"}
        mapLoading={mapQuery.isLoading}
        mapError={mapQuery.error as Error | null}
        locations={mapQuery.data?.locations ?? []}
        clues={mapQuery.data?.clues ?? []}
        discoveredClueIds={discoveredClueIds}
        onDiscoveredClueIdsChange={setDiscoveredClueIds}
        canClaimSolved={showLegacyClaimButton}
        isSolved={teamSolved}
        onClaimSolved={handleClaimSolved}
        investigateMode={investigateModeForMap}
        inventoryClues={isResolutionMap ? teamInventoryClues : undefined}
        overlay={
          isResolutionMap && resolutionInfo ? (
            <ResolutionMissionFlow
              mission={resolutionInfo.mission}
              isTeamSolved={teamSolved}
              stage={resolutionStage}
              findAttemptsUsed={findAttemptsUsed}
              findError={findError}
              foundClueName={foundClueName}
              collectedItems={collectedItemsForUnlock}
              unlockAttemptsUsed={unlockAttemptsUsed}
              unlockError={unlockError}
              onResetFind={handleResetFind}
              onContinueToUnlock={handleContinueToUnlock}
              onSubmitUnlock={handleSubmitUnlock}
              onResetUnlock={handleResetUnlock}
            />
          ) : undefined
        }
      />
    );
  }

  if (hasSupabaseEnv && showResolutionGuessForm) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <TeamBadge teamName={teamName} />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>최종 미션 — 진입 코드를 입력하세요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--foreground)]">
                지금까지 모은 단서를 바탕으로{" "}
                <span className="text-[var(--accent)]">미션 진입 코드(Access Code)</span>를
                입력하세요. 정확히 일치하면 최종 미션 맵이 열립니다.
              </p>
              {resolutionLocationQuery.isLoading ? (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" aria-hidden />
                  <span className="text-sm">미션 정보를 불러오는 중…</span>
                </div>
              ) : resolutionLocationQuery.isError ? (
                <p className="text-sm text-[var(--primary)]">
                  미션 정보를 불러오지 못했습니다.{" "}
                  {resolutionLocationQuery.error instanceof Error
                    ? resolutionLocationQuery.error.message
                    : null}
                </p>
              ) : !resolutionLocationQuery.data ? (
                <p className="text-sm text-[var(--accent)]">
                  이 시나리오에는 최종 미션이 설정되어 있지 않습니다. 교사에게 문의해주세요.
                </p>
              ) : (
                <form className="space-y-3" onSubmit={handleResolutionGuessSubmit}>
                  <Input
                    placeholder="예) BLUE-774, 지하 통로"
                    value={resolutionGuessInput}
                    onChange={(event) => {
                      setResolutionGuessInput(event.target.value);
                      if (resolutionGuessError) setResolutionGuessError(null);
                    }}
                    autoFocus
                  />
                  <Button type="submit" className="w-full">
                    맵 열기
                  </Button>
                  {resolutionGuessError ? (
                    <p className="text-xs text-[var(--primary)]">{resolutionGuessError}</p>
                  ) : null}
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (hasSupabaseEnv && shouldShowBriefingInfo) {
    const briefingMission = resolutionLocationQuery.data?.mission?.trim() ?? "";
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <div className="space-y-4">
            <TeamBadge teamName={teamName} />
            <SessionInfoLayout
              characterName={characterName}
              characterQuery={characterQuery}
              sessionQuery={sessionQuery}
              message={message}
            />
            <Card>
              <CardHeader>
                <CardTitle>최종 미션</CardTitle>
              </CardHeader>
              <CardContent>
                {resolutionLocationQuery.isLoading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">미션 정보를 불러오는 중…</p>
                ) : resolutionLocationQuery.isError ? (
                  <p className="text-sm text-[var(--primary)]">
                    미션 정보를 불러오지 못했습니다.
                    {resolutionLocationQuery.error instanceof Error
                      ? ` ${resolutionLocationQuery.error.message}`
                      : null}
                  </p>
                ) : briefingMission ? (
                  <p className="text-sm text-[var(--foreground)]">{briefingMission}</p>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    아직 최종 미션이 설정되지 않았습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--foreground)]">
              Add Supabase environment variables to run multiplayer classroom mode.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const showResumeModal = Boolean(
    !hasJoinedSession && !resumeDecided && resumeQuery.data,
  );

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

        {!hasJoinedSession && !showResumeModal ? (
          <section className="flex items-center justify-center rounded-lg bg-[rgba(15,17,19,0.88)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정 (필수)</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                닉네임을 입력해 대기실에 입장하세요.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  joinAndRegisterMutation.mutate();
                }}
              >
                <Input
                  placeholder="닉네임"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={joinAndRegisterMutation.isPending}>
                  Join as Player
                </Button>
              </form>
              {!joinCode.trim() ? (
                <p className="mt-3 text-xs text-[var(--accent)]">입장 코드가 없습니다. 홈에서 코드를 입력해 다시 입장해 주세요.</p>
              ) : null}
              {message ? <p className="mt-3 text-xs text-[var(--foreground)]">{message}</p> : null}
            </div>
          </section>
        ) : null}

        {shouldShowCharacterReveal ? (
          <section className="rounded-lg border border-[var(--accent)]/40 bg-[var(--surface)] p-6">
            {characterQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-[var(--muted-foreground)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
                <p className="text-sm">캐릭터 정보를 불러오는 중…</p>
              </div>
            ) : characterQuery.isError ? (
              <div className="py-6 text-sm text-[var(--primary)]">
                캐릭터 정보를 불러오지 못했습니다.
                {characterQuery.error instanceof Error ? ` ${characterQuery.error.message}` : null}
              </div>
            ) : characterQuery.data ? (
              <>
                <h3 className="text-xl font-semibold text-[var(--accent)]">팀·캐릭터 배정 완료</h3>
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  교사가 게임을 시작했습니다. 당신에게 배정된 팀과 캐릭터입니다.
                </p>
                <div className="mt-5 grid gap-3 rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">TEAM</p>
                    <p className="text-2xl font-semibold text-[var(--accent)]">{teamName ?? "?"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">CHARACTER</p>
                    <p className="text-2xl font-semibold text-[var(--accent)]">
                      {characterName ?? characterQuery.data.name}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[var(--muted-foreground)]">ROLE</p>
                    <p className="text-sm text-[var(--foreground)]">
                      {characterQuery.data.role ?? "역할 정보 없음"}
                    </p>
                  </div>
                </div>
                <Button className="mt-5 w-full" onClick={() => setHideRoleReveal(true)}>
                  확인하고 게임 화면으로
                </Button>
              </>
            ) : null}
          </section>
        ) : null}

        {hasJoinedSession && isWaitingLobby ? (
          <Card className="mt-4">
            <CardContent className="flex items-center gap-3 py-5 text-[var(--foreground)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" aria-hidden />
              <p className="text-sm">
                {sessionPhase === "waiting"
                  ? "교사가 게임을 시작할 때까지 잠시만 기다려 주세요."
                  : "팀·캐릭터가 배정되는 중입니다…"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          이전 입장 기록이 있어요
        </h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          이 입장 코드로 이미 <span className="font-medium text-[var(--accent)]">{record.nickname}</span> 으로 입장한 기록이 있습니다.
          같은 플레이어로 이어 들어갈까요?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onContinue} className="w-full">
            {record.nickname} 으로 계속하기
          </Button>
          <Button onClick={onNew} variant="outline" className="w-full">
            새로운 플레이어로 입장
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ teamName }: { teamName: string | null }) {
  if (!teamName) return null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--accent)]/40 bg-[rgba(15,17,19,0.5)] px-4 py-3">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">My Team</span>
      <span className="font-mono text-xl font-semibold text-[var(--accent)]">Team {teamName}</span>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-8">
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          </main>
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
