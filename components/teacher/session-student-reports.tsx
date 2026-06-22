"use client";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { LoadingState } from "@/components/ui/loading-state";
import { formatGroupDisplayName } from "@/lib/activity-pack/engine";
import { RESULTS_COPY } from "@/lib/activity-phases";
import type { SessionReportStudentRow } from "@/lib/teacher/use-session-report-data";
import { cn } from "@/lib/utils";

const tableShellClass =
  "overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-[var(--elevation-sm)]";

const thClass = cn(
  "whitespace-nowrap border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_4%,var(--surface-overlay))] px-3 py-2.5 text-left text-[0.875rem] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]",
);

const tdClass =
  "whitespace-nowrap px-3 py-2 text-sm tabular-nums text-[var(--foreground)]";

const tdMutedClass = cn(tdClass, "text-[var(--muted-foreground)]");

function cell(value: string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function rankCell(rank: number | null) {
  if (rank == null) return "—";
  if (rank === 1) return "🥇 1";
  if (rank === 2) return "🥈 2";
  if (rank === 3) return "🥉 3";
  return `${rank}`;
}

function submittedCell(
  submitted: boolean,
  value: string | number | null | undefined,
  fallback = "—",
) {
  if (!submitted) return fallback;
  return cell(value, fallback);
}

function practiceScoreCell(student: SessionReportStudentRow) {
  if (student.baseScore == null) return "—";

  const wrongAttempts = student.practiceWrongAttemptsByQuestion;

  if (Array.isArray(wrongAttempts) && wrongAttempts.length > 0) {
    const totalWrong = wrongAttempts.reduce((sum, val) => sum + val, 0);
    return `${student.baseScore}점 (오답 ${totalWrong}회)`;
  }

  return `${student.baseScore}점`;
}

export function SessionStudentReportList({
  students,
  loading,
}: {
  students: SessionReportStudentRow[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <LoadingState
        variant="section"
        label={RESULTS_COPY.loading}
        className="min-h-[8rem]"
      />
    );
  }

  if (!students.length) {
    return (
      <p className={cn("text-center", activityLayoutType.bodyMuted)}>
        아직 참가한 학생이 없습니다.
      </p>
    );
  }

  return (
    <div className={tableShellClass}>
      <table className="w-full min-w-[56rem] border-collapse text-md">
        <thead>
          <tr>
            <th className={cn(thClass, "sticky left-0 z-10 min-w-[7rem]")}>
              이름
            </th>
            <th className={thClass}>모둠</th>
            <th className={thClass}>역할</th>
            <th className={cn(thClass, "text-center")}>모둠순위</th>
            <th className={cn(thClass, "text-center")}>개인순위</th>
            <th className={cn(thClass, "text-right")}>연습 점수</th>
            <th className={cn(thClass, "text-right")}>실전 점수</th>
            <th className={cn(thClass, "text-right")}>향상 점수</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student.playerId}>
              <td
                className={cn(
                  tdClass,
                  "sticky left-0 z-[1] bg-[var(--surface-overlay)] font-medium",
                )}
              >
                <span className="block truncate">{student.nickname}</span>
              </td>

              <td className={tdMutedClass}>
                {cell(
                  student.groupName
                    ? formatGroupDisplayName(student.groupName)
                    : null,
                )}
              </td>

              <td className={cn(tdMutedClass, "max-w-[8rem] truncate")}>
                {cell(student.roleLabel)}
              </td>

              <td className={cn(tdClass, "text-center font-medium")}>
                {rankCell(student.teamRank)}
              </td>

              <td className={cn(tdClass, "text-center font-medium")}>
                {rankCell(student.personalRank)}
              </td>

              <td className={cn(tdClass, "text-right")}>
                {practiceScoreCell(student)}
              </td>

              <td className={cn(tdClass, "text-right")}>
                {submittedCell(
                  student.submitted,
                  student.testScore != null ? `${student.testScore}점 (정답 ${student.testCorrect}/${student.testTotal})` : null,
                )}
              </td>

              <td
                className={cn(
                  tdClass,
                  "text-right font-semibold text-[var(--primary)]",
                )}
              >
                {submittedCell(student.submitted, student.improvementPoints)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}