"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import {
  getHostSessionDetails,
  listSessionPlayers,
  listSessionTeams,
  type SessionPlayerRow,
  type TeamRow,
} from "@/lib/api/play";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { clubRoleLabelKr, clubRoleSortKey } from "@/lib/club-role";
import { isCulpritCorrect } from "@/lib/report-compare";
import { ROUTES } from "@/lib/routes";
import { findSuspectName, parseSuspectRosterFromCase } from "@/lib/suspects";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function teamSortName(p: SessionPlayerRow, teamById: Map<string, TeamRow>) {
  if (!p.team_id) return "\uffff";
  return (teamById.get(p.team_id)?.name ?? "").trim() || "\uffff";
}

type PlayerReportLine = {
  playerId: string;
  nickname: string;
  teamName: string;
  roleLabel: string;
  patrolZone: string;
  reportSubmitted: boolean;
  /** null: 미제출 또는 정답 미등록으로 판정 불가 */
  isCorrect: boolean | null;
  suspectDisplay: string;
  method: string;
  motive: string;
  decisiveClue: string;
  submittedAt: string | null;
};

function buildReportLines(
  players: SessionPlayerRow[],
  teams: TeamRow[],
  answerSuspectId: string | null,
  answerRoster: ReturnType<typeof parseSuspectRosterFromCase>,
): PlayerReportLine[] {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const hasRegisteredAnswer = Boolean(answerSuspectId?.trim());

  const list = [...players];
  list.sort((a, b) => {
    const ta = teamSortName(a, teamById);
    const tb = teamSortName(b, teamById);
    if (ta !== tb) return ta.localeCompare(tb, "ko");
    const ra = clubRoleSortKey(a.club_role);
    const rb = clubRoleSortKey(b.club_role);
    if (ra !== rb) return ra - rb;
    return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
  });

  return list.map((p) => {
    const team = p.team_id ? teamById.get(p.team_id) : undefined;
    const submitted = Boolean(team?.report_submitted_at);
    const suspectDisplay =
      team && team.report_suspect_id
        ? findSuspectName(answerRoster, team.report_suspect_id) ?? team.report_suspect_id
        : "—";
    let isCorrect: boolean | null = null;
    if (submitted && hasRegisteredAnswer && team) {
      isCorrect = isCulpritCorrect(answerSuspectId, team.report_suspect_id);
    } else if (submitted && !hasRegisteredAnswer) {
      isCorrect = null;
    }

    return {
      playerId: p.id,
      nickname: p.nickname?.trim() || "—",
      teamName: team?.name?.trim() || "—",
      roleLabel: clubRoleLabelKr(p.club_role),
      patrolZone: p.patrol_zone?.name?.trim() || "—",
      reportSubmitted: submitted,
      isCorrect,
      suspectDisplay: submitted ? suspectDisplay : "—",
      method: team?.report_method?.trim() || "—",
      motive: team?.report_motive?.trim() || "—",
      decisiveClue: team?.report_decisive_clue?.trim() || "—",
      submittedAt: team?.report_submitted_at
        ? new Date(team.report_submitted_at).toLocaleString("ko-KR")
        : null,
    };
  });
}

function CaseSessionReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";

  const authQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["host-session", sessionId],
    queryFn: () => getHostSessionDetails(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
  });

  const playersQuery = useQuery({
    queryKey: ["host-session-players", sessionId],
    queryFn: () => listSessionPlayers(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
  });

  const teamsQuery = useQuery({
    queryKey: ["host-session-teams", sessionId],
    queryFn: () => listSessionTeams(sessionId),
    enabled: Boolean(sessionId && authQuery.data),
  });

  const row = sessionQuery.data;

  useEffect(() => {
    if (authQuery.isLoading) return;
    if (authQuery.isFetching && !authQuery.data) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.login);
      return;
    }
    if (!authQuery.data) router.replace(ROUTES.admin.login);
  }, [router, authQuery.data, authQuery.isLoading, authQuery.isFetching]);

  const cases = row?.cases;
  const answerRoster = useMemo(
    () => parseSuspectRosterFromCase(cases?.suspect_roster),
    [cases?.suspect_roster],
  );
  const trueName = findSuspectName(answerRoster, cases?.answer_suspect_id);
  const hasAnswer = Boolean(cases?.answer_suspect_id?.trim() && trueName);

  const lines = useMemo(
    () =>
      buildReportLines(
        playersQuery.data ?? [],
        teamsQuery.data ?? [],
        cases?.answer_suspect_id ?? null,
        answerRoster,
      ),
    [playersQuery.data, teamsQuery.data, cases?.answer_suspect_id, answerRoster],
  );

  const teamSubmitted = (teamsQuery.data ?? []).filter((t) => t.report_submitted_at).length;
  const teamTotal = (teamsQuery.data ?? []).length;

  if (!sessionId) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--muted-foreground)]">세션 ID가 없습니다.</p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(ROUTES.admin.cases)}>
            목록으로
          </Button>
        </main>
      </div>
    );
  }

  if (authQuery.isLoading || (authQuery.isFetching && !authQuery.data)) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-8 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          인증 확인 중…
        </main>
      </div>
    );
  }

  if (sessionQuery.isLoading || !row) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-8 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          세션을 불러오는 중…
        </main>
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--error)]">세션을 불러오지 못했습니다.</p>
        </main>
      </div>
    );
  }

  if (row && authQuery.data?.user && row.host_id !== authQuery.data.user.id) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--accent)]">이 세션의 호스트가 아닙니다.</p>
        </main>
      </div>
    );
  }

  const loading = playersQuery.isLoading || teamsQuery.isLoading;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ROUTES.admin.sessionHost(sessionId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            세션으로
          </Link>
        </div>

        <header className="space-y-1 border-b border-[var(--border)] pb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">세션 보고서</p>
          <h1 className="font-mono text-2xl font-semibold text-[var(--accent)] sm:text-3xl">
            {row.cases?.title ?? "제목 없음"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            사건 코드 <span className="font-mono font-semibold text-[var(--foreground)]">{row.join_code}</span>
            {" · "}
            팀 보고 제출 {teamSubmitted} / {teamTotal}
          </p>
        </header>

        {hasAnswer ? (
          <div className="rounded-lg border border-[var(--mystery)]/35 bg-[var(--tint-accent)] p-4 text-sm text-[var(--foreground)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--mystery)]">등록된 정답(범인)</p>
            <p className="mt-1 font-medium">{trueName}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-4 py-3 text-sm text-[var(--foreground)]">
            사건에 범인(정답) 용의자가 지정되지 않아, 제출 팀에 대해 정답 여부는 표시되지 않습니다. 사건 편집에서 설정할 수
            있습니다.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">참가자·팀을 불러오는 중…</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">이 세션에 등록된 플레이어가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] shadow-[var(--elevation-sm)]">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--tint-accent-weak)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-3 py-2.5">닉네임</th>
                  <th className="px-3 py-2.5">팀</th>
                  <th className="px-3 py-2.5">역할</th>
                  <th className="px-3 py-2.5">순찰 구역</th>
                  <th className="px-3 py-2.5">팀 제출</th>
                  <th className="px-3 py-2.5">정답</th>
                  <th className="px-3 py-2.5">지목한 범인</th>
                  <th className="px-3 py-2.5">도구·방법</th>
                  <th className="px-3 py-2.5">동기</th>
                  <th className="px-3 py-2.5">결정적 단서</th>
                  <th className="px-3 py-2.5">제출 시각</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.playerId}
                    className="border-b border-[var(--border)]/80 last:border-0 odd:bg-[var(--surface)]/50"
                  >
                    <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{line.nickname}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--accent)]">{line.teamName}</td>
                    <td className="px-3 py-2.5 text-[var(--foreground)]">{line.roleLabel}</td>
                    <td className="px-3 py-2.5 text-[var(--foreground)]">{line.patrolZone}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          line.reportSubmitted
                            ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                            : "text-[var(--muted-foreground)]",
                        )}
                      >
                        {line.reportSubmitted ? "제출" : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {!line.reportSubmitted ? (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      ) : !hasAnswer ? (
                        <span className="text-[var(--muted-foreground)]">미등록</span>
                      ) : line.isCorrect ? (
                        <span className="font-semibold text-[var(--primary)]">맞음</span>
                      ) : (
                        <span className="font-semibold text-[var(--error)]">틀림</span>
                      )}
                    </td>
                    <td className="max-w-[180px] px-3 py-2.5 break-words text-[var(--foreground)]">
                      {line.suspectDisplay}
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 break-words text-[var(--foreground)]">
                      {line.method}
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 break-words text-[var(--foreground)]">
                      {line.motive}
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 break-words text-[var(--foreground)]">
                      {line.decisiveClue}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
                      {line.submittedAt ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CaseSessionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto w-full max-w-7xl px-4 py-8">
            <p className="text-sm text-[var(--muted-foreground)]">불러오는 중…</p>
          </main>
        </div>
      }
    >
      <CaseSessionReportContent />
    </Suspense>
  );
}
