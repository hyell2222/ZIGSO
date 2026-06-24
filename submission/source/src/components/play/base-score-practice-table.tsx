"use client";

import { guideInfoModalBodyClass } from "@/components/play/guide-info-modal";
import { PRACTICE_SCORE_TABLE } from "@/lib/activity-pack/stad-guide";
import { cn } from "@/lib/utils";

export function BaseScorePracticeTable({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("w-full border-collapse text-left", guideInfoModalBodyClass)}>
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th scope="col" className="py-1.5 pr-2 font-medium text-[var(--foreground)]">
              오답 횟수
            </th>
            <th
              scope="col"
              className="py-1.5 pl-2 text-right font-medium text-[var(--foreground)] tabular-nums"
            >
              문항 점수
            </th>
          </tr>
        </thead>
        <tbody>
          {PRACTICE_SCORE_TABLE.map((row) => (
            <tr key={row.wrongAttempts} className="border-b border-[var(--border)]/70 last:border-0">
              <td className="py-1.5 pr-2 text-[var(--muted-foreground)]">
                {row.wrongAttempts === 0 ? "0회" : `${row.wrongAttempts}회`}
              </td>
              <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-[var(--foreground)]">
                {row.points}점
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
