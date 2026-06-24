"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import {
  getHostSessionDetails,
  listSessionPlayers,
  listSessionGroups,
  setPlayersOnline,
  type SessionPlayerRow,
} from "@/lib/api/play";
import {
  advanceSessionPhase,
  beginHostingSession,
  endSession,
  getNextPhase,
  parseActivityPack,
  type ActivityPhase,
} from "@/lib/api/activities";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { formatAssignedRoleLabels } from "@/lib/play/role-codenames";
import { hasReviewQuestions } from "@/lib/activity-pack/engine";
import { parseAssignedRoleIds } from "@/lib/api/play";
import { groupPlayersByGroup, type GroupGroup } from "@/lib/teacher/group-players-by-group";
import { isPlayerPhaseComplete } from "@/lib/teacher/phase-completion";
import { SessionHostLayout } from "@/components/teacher/session-host-layout";
import { activityViewportRoot } from "@/components/activity/activity-layout-chrome";
import { GuideModalScope } from "@/components/play/guide-modal-scope";
import { SessionHostWaitingRoster } from "@/components/teacher/session-host-waiting-roster";
import { PhaseTimerContent } from "@/components/teacher/phase-timer-content";
import { SessionQuestionsReviewModal } from "@/components/teacher/session-questions-review-modal";
import {
  GroupAssignmentDashboard,
  type GroupAssignmentGroup,
} from "@/components/teacher/group-assignment-dashboard";
import {
  SessionResultsDashboard,
  type SessionResultsMember,
} from "@/components/teacher/session-results-dashboard";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Z } from "@/lib/ui/z-index";
import { ROUTES } from "@/lib/routes";
import {
  flattenPresenceState,
  getSessionRoomChannelName,
  type SessionPresenceRow,
} from "@/lib/realtime/session-presence";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { isSessionEnded, isTimedPhase, type TimedPhase } from "@/lib/activity-phases";
import { hostSessionNextPhaseLabel } from "@/lib/api/sessions";

function SessionHostContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const queryClient = useQueryClient();
  const [presenceRows, setPresenceRows] = useState<SessionPresenceRow[]>([]);
  /** 단계가 바뀌면 열었던 단계와 달라져 모달이 닫히도록 phaseAtOpen 을 둠 (effect 내 setState 회피) */
  const [timerModal, setTimerModal] = useState<{ open: boolean; phaseAtOpen: ActivityPhase | null }>({
    open: false,
    phaseAtOpen: null,
  });
  const [questionsReviewOpen, setQuestionsReviewOpen] = useState(false);

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

  const groupsQuery = useQuery({
    queryKey: ["host-session-groups", sessionId],
    queryFn: () => listSessionGroups(sessionId),
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
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
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
        { event: "*", schema: "public", table: "groups", filter: `session_id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["host-session-groups", sessionId] });
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
      .subscribe((status: string) => {
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
      if (!next) throw new Error("이미 마지막 단계입니다.");
      await advanceSessionPhase(sessionId, next);
      return next;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["host-session", sessionId] });
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
  const sessionStatusForLeave = sessionRowForLeave?.status ?? null;
  const shouldEndOnHostLeave =
    isHostOfLoadedSession && !isSessionEnded(sessionStatusForLeave);

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

    if (toOnline.length > 0) void setPlayersOnline(toOnline, true).catch(() => { });
    if (toOffline.length > 0) void setPlayersOnline(toOffline, false).catch(() => { });
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
    () => (playersQuery.data ?? []).filter((p: SessionPlayerRow) => p.is_online === true),
    [playersQuery.data],
  );

  /** 대기 칩: DB `created_at` 기준 최근 참가가 앞 (같은 시각이면 닉네임) */
  const waitingLobbyPlayers = useMemo(
    () =>
      [...onlinePlayers].sort((a, b) => {
        const ta = Date.parse(a.created_at);
        const tb = Date.parse(b.created_at);
        const na = Number.isNaN(ta) ? 0 : ta;
        const nb = Number.isNaN(tb) ? 0 : tb;
        if (na !== nb) return nb - na;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
      }),
    [onlinePlayers],
  );

  const playercount = onlinePlayers.length;

  const groupRows = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  const activityPack = useMemo(
    () => parseActivityPack(sessionQuery.data?.activities?.activity_pack),
    [sessionQuery.data?.activities?.activity_pack],
  );

  const phase = (sessionQuery.data?.phase as ActivityPhase) ?? "waiting";

  const assignmentGroups = useMemo<GroupAssignmentGroup[]>(() => {
    const allPlayers = playersQuery.data ?? [];
    return groupPlayersByGroup(allPlayers, groupRows).map((g: GroupGroup) => {
      const memberRoleIds = g.members.map((m: SessionPlayerRow) => m.assigned_role_id);
      return {
        group: { id: g.group.id, name: g.group.name },
        members: g.members.map((m: SessionPlayerRow) => ({
          id: m.id,
          nickname: m.nickname,
          zoneName: activityPack
            ? formatAssignedRoleLabels(
              activityPack,
              parseAssignedRoleIds(m),
              sessionId ?? "",
            )
            : null,
          assignedRoleId: m.assigned_role_id,
          isOnline: m.is_online !== false,
          phaseComplete: isPlayerPhaseComplete(phase, m, {
            pack: activityPack,
            memberRoleIds,
          }),
        })),
      };
    });
  }, [playersQuery.data, groupRows, activityPack, sessionId, phase]);

  const resultsMembers = useMemo<SessionResultsMember[]>(
    () =>
      (playersQuery.data ?? [])
        .filter((p: SessionPlayerRow) => p.group_id)
        .map((p: SessionPlayerRow) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.group_id as string,
          assignedRoleId: p.assigned_role_id,
          baseScore: p.base_score,
          individual_quiz_answers: p.individual_quiz_answers ?? [],
          individual_quiz_submitted_at: p.individual_quiz_submitted_at,
        })),
    [playersQuery.data],
  );

  const sessionStatus = sessionQuery.data?.status ?? "active";
  const nextPhase = getNextPhase(phase);
  const nextPhaseLabel = hostSessionNextPhaseLabel(phase);
  const sessionStarted = phase !== "waiting";
  const sessionEnded = isSessionEnded(sessionStatus);
  const shouldShowTimer = isTimedPhase(phase);

  const timerToolOpen =
    timerModal.open &&
    timerModal.phaseAtOpen !== null &&
    timerModal.phaseAtOpen === phase &&
    shouldShowTimer;

  const openTimerModal = () => {
    if (!shouldShowTimer) return;
    setTimerModal({ open: true, phaseAtOpen: phase });
  };

  const closeTimerModal = () => setTimerModal({ open: false, phaseAtOpen: null });

  if (!sessionId) {
    return (
      <div className="@container min-h-screen">
        <main className="flex flex-col items-center justify-center mx-auto w-full max-w-5xl px-4 py-8">
          <p className="text-sm text-[var(--muted-foreground)]">활동 세션을 찾을 수 없습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => navigate(ROUTES.reports)}>
            활동 세션 기록
          </Button>
        </main>
      </div>
    );
  }

  if (teacherSession.isLoading || (teacherSession.isFetching && !teacherSession.data)) {
    return <LoadingState variant="page" />;
  }

  if (sessionQuery.isLoading) {
    return <LoadingState variant="page" />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="@container min-h-screen">
        <main className="flex flex-col items-center justify-center mx-auto w-full max-w-5xl px-4 py-8">
          <p className="text-sm text-[var(--danger)]">활동 세션을 불러오지 못했습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => navigate(ROUTES.reports)}>
            활동 세션 기록
          </Button>
        </main>
      </div>
    );
  }

  const row = sessionQuery.data;
  if (row.host_id !== teacherSession.data?.user.id) {
    return (
      <div className="@container min-h-screen">
        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          <p className="text-sm text-[var(--accent)]">이 활동 세션을 진행할 권한이 없습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <GuideModalScope className={activityViewportRoot}>
      <SessionHostLayout
        activityTitle={row.activities?.title ?? null}
        playerCount={playercount}
        joinCode={row.join_code}
        sessionEnded={sessionEnded}
        phase={phase}
        buttonSize="default"
        sessionStarted={sessionStarted}
        hasNextPhase={Boolean(nextPhase)}
        nextPhaseLabel={nextPhaseLabel}
        hasReviewQuestions={activityPack ? hasReviewQuestions(activityPack) : false}
        isTimerOpen={timerToolOpen}
        startPending={beginMutation.isPending}
        nextPending={nextPhaseMutation.isPending}
        onTimerClick={openTimerModal}
        onStart={() => beginMutation.mutate()}
        onNext={() => nextPhaseMutation.mutate()}
        onReviewClick={() => setQuestionsReviewOpen(true)}
      >
        {phase === "waiting" ? (
          <SessionHostWaitingRoster
            players={waitingLobbyPlayers.map((p) => ({
              id: p.id,
              nickname: p.nickname,
            }))}
          />
        ) : null}

        {phase === "overview" ||
          phase === "expert_group" ||
          phase === "home_group" ||
          phase === "individual_quiz" ? (
          <GroupAssignmentDashboard
            groups={assignmentGroups}
            loading={playersQuery.isLoading || groupsQuery.isLoading}
            groupBy={phase === "expert_group" ? "item" : "group"}
            pack={activityPack}
          />
        ) : null}

        {phase === "results" ? (
          <SessionResultsDashboard
            groups={groupRows}
            members={resultsMembers}
            pack={activityPack}
            roleScopeKey={sessionId ?? undefined}
            loading={playersQuery.isLoading || groupsQuery.isLoading}
          />
        ) : null}
      </SessionHostLayout>

      <Modal
        open={timerToolOpen}
        onClose={closeTimerModal}
        title="타이머"
        titleId="host-timer-heading"
        zIndexClassName={Z.hostTool}
        contentClassName="py-5"
      >
        <PhaseTimerContent key={phase} phase={phase as TimedPhase} />
      </Modal>

      {activityPack ? (
        <SessionQuestionsReviewModal
          open={questionsReviewOpen}
          onClose={() => setQuestionsReviewOpen(false)}
          pack={activityPack}
          roleScopeKey={sessionId ?? undefined}
          contained={false}
        />
      ) : null}
    </GuideModalScope>
  );
}

export default function SessionHostPage() {
  return (
    <Suspense
      fallback={<LoadingState variant="page" />}
    >
      <SessionHostContent />
    </Suspense>
  );
}
