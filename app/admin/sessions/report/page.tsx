"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import {
  getHostSessionDetails,
  listSessionPlayers,
  listSessionTeams,
  type SessionPlayerRow,
  type TeamRow,
} from "@/lib/api/play";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { TeamFinalReportModal } from "@/components/admin/team-final-report-modal";
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
  teamId: string | null;
  nickname: string;
  teamName: string;
  roleLabel: string;
  patrolZone: string;
  reportSubmitted: boolean;
  /** null: 미제출 또는 정답 미등록으로 판정 불가 */
  isCorrect: boolean | null;
  submittedAt: string | null;
  /** 제출 시각 정렬용 (ms) */
  submittedAtMs: number | null;
};

type SortKey =
  | "nickname"
  | "teamName"
  | "roleLabel"
  | "patrolZone"
  | "reportSubmitted"
  | "isCorrect"
  | "finalReport"
  | "submittedAt";

function isCorrectSortRank(line: PlayerReportLine, hasAnswer: boolean): number {
  if (!line.reportSubmitted) return 0;
  if (!hasAnswer) return 1;
  if (line.isCorrect === true) return 3;
  if (line.isCorrect === false) return 2;
  return 1;
}

function compareReportLines(
  a: PlayerReportLine,
  b: PlayerReportLine,
  key: SortKey,
  hasAnswer: boolean,
  dir: "asc" | "desc",
): number {
  const mul = dir === "asc" ? 1 : -1;
  let cmp = 0;
  switch (key) {
    case "nickname":
      cmp = a.nickname.localeCompare(b.nickname, "ko");
      break;
    case "teamName":
      cmp = a.teamName.localeCompare(b.teamName, "ko");
      break;
    case "roleLabel":
      cmp = a.roleLabel.localeCompare(b.roleLabel, "ko");
      break;
    case "patrolZone":
      cmp = a.patrolZone.localeCompare(b.patrolZone, "ko");
      break;
    case "reportSubmitted":
      cmp = Number(a.reportSubmitted) - Number(b.reportSubmitted);
      break;
    case "isCorrect":
      cmp = isCorrectSortRank(a, hasAnswer) - isCorrectSortRank(b, hasAnswer);
      break;
    case "finalReport": {
      const av = a.reportSubmitted && a.teamId ? 1 : 0;
      const bv = b.reportSubmitted && b.teamId ? 1 : 0;
      cmp = av - bv;
      break;
    }
    case "submittedAt": {
      const aMs = a.submittedAtMs;
      const bMs = b.submittedAtMs;
      if (aMs == null && bMs == null) cmp = 0;
      else if (aMs == null) cmp = 1;
      else if (bMs == null) cmp = -1;
      else cmp = aMs - bMs;
      break;
    }
    default:
      cmp = 0;
  }
  if (cmp !== 0) return cmp * mul;
  return a.playerId.localeCompare(b.playerId, "en");
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildSessionReportCsv(
  lines: PlayerReportLine[],
  teamById: Map<string, TeamRow>,
  answerRoster: ReturnType<typeof parseSuspectRosterFromCase>,
  hasAnswer: boolean,
): string {
  const header = [
    "닉네임",
    "팀",
    "역할",
    "순찰 구역",
    "팀 제출",
    "정답",
    "제출 시각",
    "지목한 범인",
    "도구·방법",
    "동기",
    "결정적 단서",
  ];
  const rows: string[][] = [header];
  for (const line of lines) {
    const team = line.teamId ? teamById.get(line.teamId) : undefined;
    const suspectName =
      team?.report_suspect_id
        ? (findSuspectName(answerRoster, team.report_suspect_id) ?? team.report_suspect_id)
        : "";
    const correctLabel = !line.reportSubmitted
      ? "—"
      : !hasAnswer
        ? "미등록"
        : line.isCorrect === true
          ? "맞음"
          : line.isCorrect === false
            ? "틀림"
            : "—";
    rows.push([
      line.nickname,
      line.teamName,
      line.roleLabel,
      line.patrolZone,
      line.reportSubmitted ? "제출" : "—",
      correctLabel,
      line.submittedAt ?? "—",
      team?.report_suspect_id ? suspectName : "",
      (team?.report_method ?? "").trim(),
      (team?.report_motive ?? "").trim(),
      (team?.report_decisive_clue ?? "").trim(),
    ]);
  }
  return rows.map((r) => r.map(escapeCsvField).join(",")).join("\r\n");
}

function buildReportLines(
  players: SessionPlayerRow[],
  teams: TeamRow[],
  answerSuspectId: string | null,
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
    let isCorrect: boolean | null = null;
    if (submitted && hasRegisteredAnswer && team) {
      isCorrect = isCulpritCorrect(answerSuspectId, team.report_suspect_id);
    } else if (submitted && !hasRegisteredAnswer) {
      isCorrect = null;
    }

    const submittedAtRaw = team?.report_submitted_at;
    return {
      playerId: p.id,
      teamId: p.team_id ?? null,
      nickname: p.nickname?.trim() || "—",
      teamName: team?.name?.trim() || "—",
      roleLabel: clubRoleLabelKr(p.club_role),
      patrolZone: p.patrol_zone?.name?.trim() || "—",
      reportSubmitted: submitted,
      isCorrect,
      submittedAt: submittedAtRaw ? new Date(submittedAtRaw).toLocaleString("ko-KR") : null,
      submittedAtMs: submittedAtRaw ? Date.parse(submittedAtRaw) : null,
    };
  });
}

function SortableTh({
  label,
  column,
  current,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  current: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current?.key === column;
  const dir = current?.dir ?? "asc";
  return (
    <th className={cn("px-3 py-2.5 align-bottom", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="group inline-flex w-full min-w-0 max-w-full items-center justify-start gap-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
      >
        <span className="min-w-0 break-words leading-tight">{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-35 group-hover:opacity-70" aria-hidden />
        )}
      </button>
    </th>
  );
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

  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const lines = useMemo(
    () => buildReportLines(playersQuery.data ?? [], teamsQuery.data ?? [], cases?.answer_suspect_id ?? null),
    [playersQuery.data, teamsQuery.data, cases?.answer_suspect_id],
  );

  const teamById = useMemo(
    () => new Map((teamsQuery.data ?? []).map((t) => [t.id, t])),
    [teamsQuery.data],
  );
  const viewingTeam = viewingTeamId ? teamById.get(viewingTeamId) ?? null : null;
  const viewingTeamDisplayName = viewingTeam?.name?.trim() || viewingTeamId || "팀";

  const displayedLines = useMemo(() => {
    if (!sort) return lines;
    return [...lines].sort((a, b) => compareReportLines(a, b, sort.key, hasAnswer, sort.dir));
  }, [lines, sort, hasAnswer]);

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
          불러오는 중…
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

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev === null || prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  const handleDownloadCsv = () => {
    const csv = buildSessionReportCsv(displayedLines, teamById, answerRoster, hasAnswer);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (row.join_code ?? "session").replace(/[^\w.-]+/g, "_").slice(0, 64);
    a.download = `세션보고_${safe}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 pt-8">
        <div className="space-y-4">
          <PageHeader
            title={row.cases?.title ?? "제목 없음"}
            titleClassName="font-mono text-[var(--accent)]"
            actions={
              <Button type="button" variant="secondary" className="gap-2" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4" aria-hidden />
                CSV 다운로드
              </Button>
            }
          />
        </div>

        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">참가자·팀을 불러오는 중…</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">이 세션에 등록된 플레이어가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] shadow-[var(--elevation-sm)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--tint-accent-weak)]">
                  <SortableTh label="닉네임" column="nickname" current={sort} onSort={handleSort} />
                  <SortableTh label="팀" column="teamName" current={sort} onSort={handleSort} />
                  <SortableTh label="역할" column="roleLabel" current={sort} onSort={handleSort} />
                  <SortableTh label="순찰 구역" column="patrolZone" current={sort} onSort={handleSort} />
                  <SortableTh label="팀 제출" column="reportSubmitted" current={sort} onSort={handleSort} />
                  <SortableTh label="정답" column="isCorrect" current={sort} onSort={handleSort} />
                  <SortableTh label="최종 보고" column="finalReport" current={sort} onSort={handleSort} />
                  <SortableTh label="제출 시각" column="submittedAt" current={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {displayedLines.map((line) => (
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
                    <td className="px-3 py-2.5">
                      {line.reportSubmitted && line.teamId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => setViewingTeamId(line.teamId)}
                        >
                          보기
                        </Button>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
                      {line.submittedAt ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        <TeamFinalReportModal
          isOpen={viewingTeamId !== null}
          onClose={() => setViewingTeamId(null)}
          team={viewingTeam}
          teamDisplayName={viewingTeamDisplayName}
          suspectRoster={answerRoster}
        />
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
