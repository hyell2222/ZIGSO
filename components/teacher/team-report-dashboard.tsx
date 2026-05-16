"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import { isCulpritCorrect } from "@/lib/report-compare";
import { findSuspectName, type SuspectEntry } from "@/lib/suspects";

export type TeamReportMember = {
  id: string;
  nickname: string | null;
  /** 미제출이면 null */
  report: { suspectId: string } | null;
};

export type TeamReportGroup = {
  team: { id: string; name: string | null };
  members: TeamReportMember[];
};

/**
 * 호스트 화면 — 범인 지목 현황 카드 묶음.
 * (실 세션·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function TeamReportDashboard({
  groups,
  loading,
  roster,
  answerSuspectId,
  totalPlayers,
  submittedCount,
}: {
  groups: TeamReportGroup[];
  loading: boolean;
  roster: SuspectEntry[];
  answerSuspectId: string | null;
  totalPlayers: number;
  submittedCount: number;
}) {
  const trueName = findSuspectName(roster, answerSuspectId);
  const hasAnswer = Boolean(answerSuspectId?.trim() && trueName);

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          범인 지목
        </h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            제출 {submittedCount}/{totalPlayers}
          </span>
        </div>
      </header>
      {loading ? (
        <LoadingState
          variant="section"
          label="불러오는 중…"
        />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          제출한 학생이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
          {groups.map((g) => (
            <TeamReportCard
              key={g.team.id}
              group={g}
              roster={roster}
              answerSuspectId={answerSuspectId}
              hasAnswer={hasAnswer}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TeamReportCard({
  group,
  roster,
  answerSuspectId,
  hasAnswer,
}: {
  group: TeamReportGroup;
  roster: SuspectEntry[];
  answerSuspectId: string | null;
  hasAnswer: boolean;
}) {
  const teamReports = group.members
    .map((m) => m.report)
    .filter((r): r is { suspectId: string } => Boolean(r));
  const teamSubmitted = teamReports.length;
  const majority = useMemo(
    () => computeTeamMajority(teamReports),
    [teamReports],
  );
  const majorityName = findSuspectName(roster, majority.suspectId);
  const majorityCorrect =
    !majority.tied && isCulpritCorrect(answerSuspectId, majority.suspectId);
  const allSubmitted =
    teamSubmitted === group.members.length && group.members.length > 0;

  return (
    <div
      className={`rounded-md border p-2.5 ${
        allSubmitted
          ? "border-[var(--accent)] bg-[var(--tint-accent-medium)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-lg font-semibold text-[var(--accent)]">
          {group.team.name ?? "—"}
        </p>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            allSubmitted
              ? "bg-[var(--accent)] text-[var(--background)]"
              : "border border-[var(--border)] text-[var(--muted-foreground)]"
          }`}
        >
          제출 {teamSubmitted}/{group.members.length}
        </span>
      </div>
      {teamReports.length > 0 && hasAnswer ? (
        <p
          className={
            "mt-2 text-[11px] font-semibold " +
            (majority.tied
              ? "text-[var(--muted-foreground)]"
              : majorityCorrect
                ? "text-[var(--primary)]"
                : "text-[var(--danger)]")
          }
        >
          팀 다수결:{" "}
          {majority.tied
            ? "의견 불일치"
            : `${majorityName ?? majority.suspectId ?? "—"} (${
                majorityCorrect ? "검거 성공" : "검거 실패"
              })`}
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {group.members.map((m) => {
          const r = m.report;
          const submitted = Boolean(r);
          const memberSuspectName = findSuspectName(roster, r?.suspectId);
          const memberCorrect =
            submitted && hasAnswer && r
              ? isCulpritCorrect(answerSuspectId, r.suspectId)
              : null;
          return (
            <li
              key={m.id}
              className={`rounded border px-2 py-1 text-[11px] ${
                submitted
                  ? "border-[var(--accent)]/40 bg-[var(--tint-accent-weak)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 text-[var(--foreground)]">
                  {m.nickname ?? "참가자"}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                    submitted
                      ? "text-[var(--accent)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {submitted ? "제출" : "대기"}
                </span>
              </div>
              {submitted ? (
                <p
                  className={
                    "mt-1 text-[11px] " +
                    (hasAnswer
                      ? memberCorrect
                        ? "text-[var(--primary)]"
                        : "text-[var(--danger)]"
                      : "text-[var(--foreground)]")
                  }
                >
                  지목: {memberSuspectName ?? r?.suspectId ?? "—"}
                  {hasAnswer ? ` · ${memberCorrect ? "맞음" : "틀림"}` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * 팀 다수결: 가장 많이 지목된 용의자. 동률(의견 불일치)이면 tied=true.
 */
function computeTeamMajority(
  reports: ReadonlyArray<{ suspectId: string }>,
) {
  if (reports.length === 0) {
    return { suspectId: null as string | null, tied: false, count: 0 };
  }
  const counts = new Map<string, number>();
  for (const r of reports) {
    const id = r.suspectId?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let bestId: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  return { suspectId: bestId, tied, count: bestCount };
}
