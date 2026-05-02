"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Radio } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { deleteGameSession, listHostSessions, type HostSessionListRow } from "@/lib/api/game-sessions";
import {
  getHostSessionDetails,
  listSessionPlayerReports,
  listSessionPlayers,
  listSessionTeams,
  type PlayerReportRow,
  type SessionPlayerRow,
  type TeamRow,
} from "@/lib/api/play";
import { useRequireTeacherSession } from "@/lib/auth/use-require-teacher-session";
import { KebabMenu } from "@/components/ui/kebab-menu";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { clubRoleLabelKr, clubRoleSortKey } from "@/lib/club-role";
import { isCulpritCorrect } from "@/lib/report-compare";
import { ROUTES } from "@/lib/routes";
import { FinalReportModal } from "@/components/teacher/final-report-modal";
import { findSuspectName, parseSuspectRosterFromCase } from "@/lib/suspects";
import { cn } from "@/lib/utils";

const PHASE_KR: Record<string, string> = {
  waiting: "대기",
  briefing: "사건 파악",
  investigation: "조사",
  final_report: "범인 지목",
  session_end: "종료",
};

function formatSessionsListWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function ReportsSessionsListPanel({ teacherUserId }: { teacherUserId: string }) {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["host-sessions", teacherUserId],
    queryFn: () => listHostSessions(teacherUserId),
    enabled: Boolean(teacherUserId),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingDeleteId(id);
      try {
        await deleteGameSession(id);
      } finally {
        setPendingDeleteId(null);
      }
    },
    onError: (e: Error) => window.alert(e.message),
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ["host-sessions"] });
      await queryClient.removeQueries({ queryKey: ["host-session", id] });
      await queryClient.removeQueries({ queryKey: ["host-session-players", id] });
      await queryClient.removeQueries({ queryKey: ["host-session-teams", id] });
    },
  });

  const handleDeleteSession = (row: HostSessionListRow) => {
    const label = row.cases?.title?.trim() || "제목 없는 사건";
    if (
      !window.confirm(
        `「${label}」세션을 삭제할까요?\n팀·참가 기록·보고 내용이 모두 삭제되며 되돌릴 수 없습니다.\n사건 원본은 그대로 남습니다.`,
      )
    ) {
      return;
    }
    deleteSessionMutation.mutate(row.id);
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <>
          <PageHeader
            title="활동 리포트"
            description="진행한 세션별로 참가자 현황과 부원별 범인 지목을 확인하고, 파일로 내려받을 수 있습니다."
          />
          {listQuery.isLoading ? (
            <LoadingState variant="section" label="목록을 불러오는 중…" />
          ) : listQuery.isError ? (
            <p className="text-sm text-[var(--danger)]">목록을 불러오지 못했습니다.</p>
          ) : (listQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--tint-accent-weak)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              아직 연 세션이 없습니다.{" "}
              <Link className="font-medium text-[var(--accent)] underline" href={ROUTES.cases}>
                내 사건
              </Link>
              에서「플레이 시작」를 눌러 주세요.
            </p>
          ) : (
            <ul className="space-y-3">
              {listQuery.data?.map((row) => {
                const title = row.cases?.title?.trim() || "제목 없는 사건";
                const phase = row.phase ? (PHASE_KR[row.phase] ?? row.phase) : "—";
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-[var(--foreground)]">{title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          <span className="font-mono text-[var(--accent)]">{row.join_code}</span>
                          {" · "}
                          {formatSessionsListWhen(row.created_at)}
                          {" · "}
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5",
                              row.phase === "session_end" || row.is_active === false
                                ? "text-[var(--muted-foreground)]"
                                : "text-[var(--foreground)]",
                            )}
                          >
                            <Radio className="inline h-3 w-3" aria-hidden />
                            {phase}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                        <Link
                          href={ROUTES.reportsForSession(row.id)}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:brightness-95"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          요약 보기
                        </Link>
                        <KebabMenu
                          disabled={pendingDeleteId === row.id}
                          onDelete={() => handleDeleteSession(row)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      </main>
    </div>
  );
}

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
  investigationZone: string;
  reportSubmitted: boolean;
  /** null: 미제출 또는 정답 미등록으로 판정 불가 */
  isCorrect: boolean | null;
  submittedAt: string | null;
  /** 제출 시각 정렬용 (ms) */
  submittedAtMs: number | null;
  /** 본인 보고서. 미제출이면 null. */
  report: PlayerReportRow | null;
};

type SortKey =
  | "nickname"
  | "teamName"
  | "roleLabel"
  | "investigationZone"
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
    case "investigationZone":
      cmp = a.investigationZone.localeCompare(b.investigationZone, "ko");
      break;
    case "reportSubmitted":
      cmp = Number(a.reportSubmitted) - Number(b.reportSubmitted);
      break;
    case "isCorrect":
      cmp = isCorrectSortRank(a, hasAnswer) - isCorrectSortRank(b, hasAnswer);
      break;
    case "finalReport": {
      const av = a.report ? 1 : 0;
      const bv = b.report ? 1 : 0;
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
  answerRoster: ReturnType<typeof parseSuspectRosterFromCase>,
  hasAnswer: boolean,
): string {
  const header = [
    "닉네임",
    "팀",
    "역할",
    "조사 장소",
    "제출",
    "정답",
    "제출 시각",
    "지목한 범인",
    "도구·방법",
    "동기",
    "결정적 단서",
  ];
  const rows: string[][] = [header];
  for (const line of lines) {
    const r = line.report;
    const suspectName = r?.suspect_id
      ? (findSuspectName(answerRoster, r.suspect_id) ?? r.suspect_id)
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
      line.investigationZone,
      line.reportSubmitted ? "제출" : "—",
      correctLabel,
      line.submittedAt ?? "—",
      suspectName,
      (r?.method ?? "").trim(),
      (r?.motive ?? "").trim(),
      (r?.decisive_clue ?? "").trim(),
    ]);
  }
  return rows.map((r) => r.map(escapeCsvField).join(",")).join("\r\n");
}

function buildReportLines(
  players: SessionPlayerRow[],
  teams: TeamRow[],
  reports: PlayerReportRow[],
  answerSuspectId: string | null,
): PlayerReportLine[] {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const reportByPlayerId = new Map(reports.map((r) => [r.player_id, r]));
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
    const report = reportByPlayerId.get(p.id) ?? null;
    const submitted = Boolean(report);
    let isCorrect: boolean | null = null;
    if (submitted && hasRegisteredAnswer && report) {
      isCorrect = isCulpritCorrect(answerSuspectId, report.suspect_id);
    }

    const submittedAtRaw = report?.submitted_at ?? null;
    return {
      playerId: p.id,
      teamId: p.team_id ?? null,
      nickname: p.nickname?.trim() || "—",
      teamName: team?.name?.trim() || "—",
      roleLabel: clubRoleLabelKr(p.club_role),
      investigationZone: p.investigation_zone?.name?.trim() || "—",
      reportSubmitted: submitted,
      isCorrect,
      submittedAt: submittedAtRaw ? new Date(submittedAtRaw).toLocaleString("ko-KR") : null,
      submittedAtMs: submittedAtRaw ? Date.parse(submittedAtRaw) : null,
      report,
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

function SessionReportContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";

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
  });

  const teamsQuery = useQuery({
    queryKey: ["host-session-teams", sessionId],
    queryFn: () => listSessionTeams(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
  });

  const reportsQuery = useQuery({
    queryKey: ["host-session-player-reports", sessionId],
    queryFn: () => listSessionPlayerReports(sessionId),
    enabled: Boolean(sessionId && teacherSession.data),
  });

  const row = sessionQuery.data;

  const cases = row?.cases;
  const answerRoster = useMemo(
    () => parseSuspectRosterFromCase(cases?.suspect_roster),
    [cases?.suspect_roster],
  );
  const trueName = findSuspectName(answerRoster, cases?.answer_suspect_id);
  const hasAnswer = Boolean(cases?.answer_suspect_id?.trim() && trueName);

  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const lines = useMemo(
    () =>
      buildReportLines(
        playersQuery.data ?? [],
        teamsQuery.data ?? [],
        reportsQuery.data ?? [],
        cases?.answer_suspect_id ?? null,
      ),
    [playersQuery.data, teamsQuery.data, reportsQuery.data, cases?.answer_suspect_id],
  );

  const linesByPlayerId = useMemo(
    () => new Map(lines.map((line) => [line.playerId, line])),
    [lines],
  );
  const viewingLine = viewingPlayerId ? linesByPlayerId.get(viewingPlayerId) ?? null : null;
  const viewingPlayerNickname = viewingLine?.nickname || "—";
  const viewingTeamDisplayName = viewingLine?.teamName || "팀";

  const displayedLines = useMemo(() => {
    if (!sort) return lines;
    return [...lines].sort((a, b) => compareReportLines(a, b, sort.key, hasAnswer, sort.dir));
  }, [lines, sort, hasAnswer]);

  if (!sessionId) {
    if (teacherSession.isLoading || (teacherSession.isFetching && !teacherSession.data)) {
      return (
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      );
    }
    const uid = teacherSession.data?.user.id;
    if (!uid) return null;
    return <ReportsSessionsListPanel teacherUserId={uid} />;
  }

  if (teacherSession.isLoading || (teacherSession.isFetching && !teacherSession.data)) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
          <LoadingState variant="page" />
        </main>
      </div>
    );
  }

  if (sessionQuery.isLoading || !row) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
          <LoadingState variant="page" label="수사 정보를 불러오는 중…" />
        </main>
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--danger)]">수사 정보를 불러오지 못했습니다.</p>
        </main>
      </div>
    );
  }

  if (row && teacherSession.data?.user && row.host_id !== teacherSession.data.user.id) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <p className="text-sm text-[var(--accent)]">이 수사를 볼 권한이 있는 계정이 아닙니다.</p>
        </main>
      </div>
    );
  }

  const loading = playersQuery.isLoading || teamsQuery.isLoading || reportsQuery.isLoading;

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev === null || prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  const handleDownloadCsv = () => {
    const csv = buildSessionReportCsv(displayedLines, answerRoster, hasAnswer);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (row.join_code ?? "session").replace(/[^\w.-]+/g, "_").slice(0, 64);
    a.download = `수사기록_${safe}_${new Date().toISOString().slice(0, 10)}.csv`;
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
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={handleDownloadCsv}>
                  <Download className="h-4 w-4" aria-hidden />
                  파일 다운로드
                </Button>
              </div>
            }
          />
        </div>

        {loading ? (
          <LoadingState variant="section" label="참가자와 팀 정보를 불러오는 중…" />
        ) : lines.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">이 수사에 참가한 학생이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] shadow-[var(--elevation-sm)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--tint-accent-weak)]">
                  <SortableTh label="닉네임" column="nickname" current={sort} onSort={handleSort} />
                  <SortableTh label="팀" column="teamName" current={sort} onSort={handleSort} />
                  <SortableTh label="역할" column="roleLabel" current={sort} onSort={handleSort} />
                  <SortableTh label="조사 장소" column="investigationZone" current={sort} onSort={handleSort} />
                  <SortableTh label="보고 제출" column="reportSubmitted" current={sort} onSort={handleSort} />
                  <SortableTh label="정답" column="isCorrect" current={sort} onSort={handleSort} />
                  <SortableTh label="제출 내용" column="finalReport" current={sort} onSort={handleSort} />
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
                    <td className="px-3 py-2.5 text-[var(--foreground)]">{line.investigationZone}</td>
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
                        <span className="font-semibold text-[var(--danger)]">틀림</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {line.reportSubmitted && line.report ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => setViewingPlayerId(line.playerId)}
                        >
                          펼치기
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
        <FinalReportModal
          isOpen={viewingPlayerId !== null}
          onClose={() => setViewingPlayerId(null)}
          report={viewingLine?.report ?? null}
          playerNickname={viewingPlayerNickname}
          teamDisplayName={viewingTeamDisplayName}
          suspectRoster={answerRoster}
        />
      </main>
    </div>
  );
}

export default function ReportsEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">
            <LoadingState variant="page" />
          </main>
        </div>
      }
    >
      <SessionReportContent />
    </Suspense>
  );
}
