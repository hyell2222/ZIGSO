"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InvestigationMapShell } from "@/components/play/investigation-map-shell";
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
  getScenarioMapEntities,
  getSessionByJoinCode,
  getTeamById,
  joinPlayerSession,
  markTeamSolved,
} from "@/lib/api/play";
import type { ScenarioClueForMap } from "@/lib/api/play";
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
      void supabase.removeChannel(channel);
    };
  }, [sessionId, playerId, teamId, characterId, characterName, nickname, queryClient]);

  const sessionPhase = sessionQuery.data?.phase ?? (sessionId ? "waiting" : null);

  useEffect(() => {
    if (sessionPhase !== "session_end") return;
    router.replace(ROUTES.home);
  }, [sessionPhase, router]);

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
    },
    onSuccess: () => setMessage("대기실에 입장했습니다. 교사가 시작할 때까지 기다려 주세요."),
    onError: (error) => setMessage(error.message),
  });

  const hasJoinedSession = Boolean(playerId && sessionId);
  const hasAssignment = Boolean(characterId && teamId);

  const isWaitingLobby =
    hasJoinedSession && (sessionQuery.isLoading || sessionPhase === "waiting" || !hasAssignment);
  const shouldShowCharacterReveal =
    hasJoinedSession && hasAssignment && sessionPhase === "briefing" && !hideRoleReveal;
  const shouldShowBriefingInfo =
    hasJoinedSession && hasAssignment && sessionPhase === "briefing" && hideRoleReveal;
  const showOwnRoomMap =
    hasJoinedSession && hasAssignment && sessionPhase === "investigation";
  const showAllRoomsMap =
    hasJoinedSession && hasAssignment && sessionPhase === "resolution";

  const mapQuery = useQuery({
    queryKey: [
      "play-scenario-map",
      sessionQuery.data?.scenario_id,
      sessionPhase,
      sessionPhase === "investigation" ? characterId : "all",
    ],
    queryFn: async () =>
      getScenarioMapEntities(sessionQuery.data!.scenario_id!, {
        restrictToCharacterId: sessionPhase === "investigation" ? characterId : null,
      }),
    enabled: Boolean(
      (showOwnRoomMap || showAllRoomsMap || shouldShowBriefingInfo) &&
        sessionQuery.data?.scenario_id,
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

  if (hasSupabaseEnv && (showOwnRoomMap || showAllRoomsMap) && sessionPhase) {
    return (
      <InvestigationMapShell
        phase={sessionPhase as "investigation" | "resolution"}
        mapLoading={mapQuery.isLoading}
        mapError={mapQuery.error as Error | null}
        locations={mapQuery.data?.locations ?? []}
        clues={mapQuery.data?.clues ?? []}
        discoveredClueIds={discoveredClueIds}
        onDiscoveredClueIdsChange={setDiscoveredClueIds}
        canClaimSolved={sessionPhase === "resolution"}
        isSolved={teamSolved}
        onClaimSolved={handleClaimSolved}
      />
    );
  }

  if (hasSupabaseEnv && shouldShowBriefingInfo) {
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
                <CardTitle>증거 인벤토리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mapQuery.isLoading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">증거를 불러오는 중…</p>
                ) : mapQuery.isError ? (
                  <p className="text-sm text-[var(--primary)]">
                    증거 목록을 불러오지 못했습니다.
                    {mapQuery.error instanceof Error ? ` ${mapQuery.error.message}` : null}
                  </p>
                ) : discoveredCluesForBriefing.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">아직 수집한 증거가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {discoveredCluesForBriefing.map((clue) => (
                      <li
                        key={clue.id}
                        className="rounded-md border border-[var(--border)] bg-[rgba(15,17,19,0.35)] px-3 py-2 text-sm text-[var(--foreground)]"
                      >
                        <p className="font-medium text-[var(--accent)]">{clue.name ?? "이름 없는 증거"}</p>
                        {clue.content?.trim() ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--foreground)]">
                            {clue.content}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
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

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-7xl px-4 py-8">

        {!hasJoinedSession ? (
          <section className="flex items-center justify-center rounded-lg bg-[rgba(15,17,19,0.88)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">닉네임 설정 (필수)</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                닉네임을 입력해 대기실에 입장하세요. 캐릭터·팀은 교사가 시작하면 배정됩니다.
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
