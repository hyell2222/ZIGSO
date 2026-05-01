"use client";

import { ClipboardList } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { TeamRow } from "@/lib/api/play";
import { findSuspectName, type SuspectEntry } from "@/lib/suspects";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRow | null;
  teamDisplayName: string;
  suspectRoster: SuspectEntry[];
};

/** 학생 `/play` 최종 보고 제출 폼과 같은 뼈대·다크 톤, 읽기 전용. */
export function TeamFinalReportModal({ isOpen, onClose, team, teamDisplayName, suspectRoster }: Props) {
  const submitted = Boolean(team?.report_submitted_at);
  const suspectName =
    (findSuspectName(suspectRoster, team?.report_suspect_id ?? null) ??
      team?.report_suspect_id?.trim()) ||
    "—";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`${teamDisplayName} — 최종 보고`}
      titleId="team-report-modal-title"
      variant="play"
      sheetOnNarrow
      maxWidthClassName="max-w-2xl"
      zIndexClassName="z-[200]"
      bodyClassName="p-4 sm:p-5"
      panelClassName="shadow-[0_24px_60px_color-mix(in_srgb,var(--ink)_50%,transparent)]"
    >
      {!team ? (
        <p className="text-sm text-[color:var(--entry-parchment-muted)]">팀 정보를 찾을 수 없습니다.</p>
      ) : !submitted ? (
        <p className="text-sm text-[color:var(--entry-parchment-muted)]">
          이 팀은 아직 최종 보고를 제출하지 않았습니다.
        </p>
      ) : (
        <Card className="overflow-hidden border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_72%,var(--ink))] text-[color:var(--entry-parchment)] shadow-none">
          <CardHeader className="space-y-1 border-b border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_50%,#151210)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[color:var(--entry-accent-soft)] ring-1 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-base text-[color:var(--entry-parchment)] sm:text-lg">
                  3단계 · 최종 보고
                </CardTitle>
                <p className="text-xs font-normal text-[color:var(--entry-parchment-muted)]">
                  팀 단위로 1회 제출합니다. 범인은 등록된 용의자 중에서만 선택할 수 있습니다.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-5 pt-5 sm:px-5">
            <div className="rounded-md border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,#141a17)] px-3 py-2.5 text-sm text-[color:var(--entry-parchment)] shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                제출 완료
              </p>
              <p className="mt-0.5 font-medium">팀 최종 보고가 접수되었습니다.</p>
              {team.report_submitted_at ? (
                <p className="mt-1 text-xs text-[color:var(--entry-parchment-muted)]">
                  {new Date(team.report_submitted_at).toLocaleString("ko-KR")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                지목한 범인 (용의자 중 1명)
              </span>
              <select
                disabled
                className="flex h-11 w-full cursor-not-allowed rounded-md border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_65%,var(--ink))] px-3 text-sm text-[color:var(--entry-parchment)] opacity-95"
                value={team.report_suspect_id ?? ""}
              >
                {suspectRoster.length === 0 ? (
                  <option value="">{suspectName}</option>
                ) : (
                  suspectRoster.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.id}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                범행 도구 · 수법
              </span>
              <Textarea
                readOnly
                rows={3}
                value={team.report_method?.trim() ?? ""}
                className="cursor-default border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                범행 동기
              </span>
              <Textarea
                readOnly
                rows={3}
                value={team.report_motive?.trim() ?? ""}
                className="cursor-default border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--entry-accent-soft)]">
                결정적 단서
              </span>
              <Textarea
                readOnly
                rows={3}
                value={team.report_decisive_clue?.trim() ?? ""}
                className="cursor-default border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_32%,#12100e)] text-[color:var(--entry-parchment)]"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </Modal>
  );
}
