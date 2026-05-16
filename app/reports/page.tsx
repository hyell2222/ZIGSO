"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Radio } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { deleteSession, listHostSessions, parseScenarioPack, type HostSessionListRow } from "@/lib/api/lessons";
import {
  getHostSessionDetails,
  listSessionPlayers,
  listSessionTeams,
} from "@/lib/api/play";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { TeamProgressDashboard, type TeamProgressGroup } from "@/components/teacher/team-progress-dashboard";
import { KebabMenu } from "@/components/ui/kebab-menu";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { LoadingState } from "@/components/ui/loading-state";
import { groupPlayersByTeam } from "@/lib/teacher/group-players-by-team";
import { ROUTES } from "@/lib/routes";

const PHASE_KR: Record<string, string> = {
  waiting: "대기",
  briefing: "급식 브리핑",
  investigation: "재료 전문가",
  final_report: "급식판 완성",
  session_end: "종료",
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function ReportsSessionsListPanel({ teacherUserId }: { teacherUserId: string }) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["host-sessions", teacherUserId],
    queryFn: () => listHostSessions(teacherUserId),
    enabled: Boolean(teacherUserId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ["host-sessions"] });
      await queryClient.removeQueries({ queryKey: ["host-session", id] });
    },
    onError: (e: Error) => window.alert(e.message),
  });

  const handleDelete = (row: HostSessionListRow) => {
    const label = row.lessons?.title?.trim() || "제목 없는 수업";
    if (
      !window.confirm(
        `「${label}」세션을 삭제할까요?\n팀·참가 기록이 모두 삭제되며 되돌릴 수 없습니다.\n수업 원본은 그대로 남습니다.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(row.id);
  };

  return (
    <ul className="space-y-3">
      {listQuery.data?.map((row) => {
        const title = row.lessons?.title?.trim() || "제목 없는 수업";
        const phase = row.phase ? (PHASE_KR[row.phase] ?? row.phase) : "—";
        return (
          <li
            key={row.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-[var(--foreground)]">{title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono text-[var(--accent)]">{row.join_code}</span>
                  {" · "}
                  {formatWhen(row.created_at)}
                  {" · "}
                  <span className="inline-flex items-center gap-0.5">
                    <Radio className="h-3 w-3" aria-hidden />
                    {phase}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 sm:ml-auto">
                <Link
                  href={ROUTES.reportsForSession(row.id)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--on-primary)]"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  요약 보기
                </Link>
                <KebabMenu onDelete={() => handleDelete(row)} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReportsSessionDetailPanel({ sessionId, teacherUserId }: { sessionId: string; teacherUserId: string }) {
  const sessionQuery = useQuery({
    queryKey: ["host-session", sessionId],
    queryFn: () => getHostSessionDetails(sessionId),
    enabled: Boolean(sessionId),
  });

  const playersQuery = useQuery({
    queryKey: ["host-session-players", sessionId],
    queryFn: () => listSessionPlayers(sessionId),
    enabled: Boolean(sessionId),
  });

  const teamsQuery = useQuery({
    queryKey: ["host-session-teams", sessionId],
    queryFn: () => listSessionTeams(sessionId),
    enabled: Boolean(sessionId),
  });

  const pack = useMemo(
    () => parseScenarioPack(sessionQuery.data?.lessons?.scenario_pack),
    [sessionQuery.data?.lessons?.scenario_pack],
  );

  const progressGroups = useMemo<TeamProgressGroup[]>(() => {
    const teams = teamsQuery.data ?? [];
    const grouped = groupPlayersByTeam(playersQuery.data ?? [], teams);
    return grouped.map((g) => ({
      team: g.team,
      memberCount: g.members.length,
    }));
  }, [playersQuery.data, teamsQuery.data]);

  if (sessionQuery.isLoading) {
    return <LoadingState variant="section" label="불러오는 중…" />;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <p className="text-sm text-[var(--danger)]">세션을 불러오지 못했습니다.</p>;
  }

  if (sessionQuery.data.host_id !== teacherUserId) {
    return <p className="text-sm text-[var(--accent)]">이 세션을 볼 권한이 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={ROUTES.reports}
          className="inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← 세션 목록
        </Link>
        <h2 className="mt-2 font-mono text-2xl font-semibold text-[var(--accent)]">
          {sessionQuery.data.lessons?.title ?? "세션"}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          코드 {sessionQuery.data.join_code} · {formatWhen(sessionQuery.data.created_at ?? null)} ·{" "}
          {PHASE_KR[sessionQuery.data.phase ?? ""] ?? sessionQuery.data.phase}
        </p>
      </div>
      <TeamProgressDashboard
        groups={progressGroups}
        loading={playersQuery.isLoading || teamsQuery.isLoading}
        pack={pack}
      />
    </div>
  );
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const teacherSession = useRequireTeacherSession();
  const teacherUserId = teacherSession.data?.user.id ?? "";

  const listQuery = useQuery({
    queryKey: ["host-sessions", teacherUserId],
    queryFn: () => listHostSessions(teacherUserId),
    enabled: Boolean(teacherUserId) && !sessionId,
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <PageHeader
          title="활동 리포트"
          description={
            sessionId
              ? "팀별 급식판 진행과 점수를 확인합니다."
              : "진행한 세션별로 팀 성과를 확인할 수 있습니다."
          }
        />
        {sessionId ? (
          <ReportsSessionDetailPanel sessionId={sessionId} teacherUserId={teacherUserId} />
        ) : listQuery.isLoading ? (
          <LoadingState variant="section" label="불러오는 중…" />
        ) : (listQuery.data?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 연 세션이 없습니다.{" "}
            <Link className="underline text-[var(--accent)]" href={ROUTES.cases}>
              내 수업
            </Link>
            에서 플레이를 시작해 주세요.
          </p>
        ) : (
          <ReportsSessionsListPanel teacherUserId={teacherUserId} />
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto max-w-7xl px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      }
    >
      <ReportsPageInner />
    </Suspense>
  );
}
