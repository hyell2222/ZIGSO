"use client";

import { ClipboardList } from "lucide-react";

import {
  FinalReportFields,
  FinalReportSubmittedBanner,
} from "@/components/play/final-report-fields";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamRow } from "@/lib/api/play";
import { findSuspectName, type SuspectEntry } from "@/lib/suspects";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRow | null;
  teamDisplayName: string;
  suspectRoster: SuspectEntry[];
};

/** 팀 최종 보고 내용 — 읽기 전용. */
export function FinalReportModal({ isOpen, onClose, team, teamDisplayName, suspectRoster }: Props) {
  const submitted = Boolean(team?.report_submitted_at);
  const recordedSuspectName =
    findSuspectName(suspectRoster, team?.report_suspect_id ?? null) ??
    team?.report_suspect_id?.trim() ??
    "";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`${teamDisplayName} — 최종 보고`}
      titleId="team-report-modal-title"
      sheetOnNarrow
      maxWidthClassName="max-w-2xl"
      zIndexClassName="z-[200]"
      bodyClassName="p-4 sm:p-5"
      panelClassName="shadow-[0_24px_60px_color-mix(in_srgb,var(--ink)_50%,transparent)]"
    >
      {!team ? (
        <p className="text-sm text-[var(--muted-foreground)]">팀 정보를 찾을 수 없습니다.</p>
      ) : !submitted ? (
        <p className="text-sm text-[var(--muted-foreground)]">
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
            <FinalReportSubmittedBanner
              theme="parchment"
              submittedAt={team.report_submitted_at}
              description="팀 최종 보고가 접수되었습니다."
            />
            <FinalReportFields
              theme="parchment"
              readOnly
              idPrefix="team-report"
              suspectRoster={suspectRoster}
              emptyRosterSuspectName={recordedSuspectName}
              values={{
                suspectId: team.report_suspect_id ?? "",
                method: team.report_method?.trim() ?? "",
                motive: team.report_motive?.trim() ?? "",
                decisiveClue: team.report_decisive_clue?.trim() ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}
    </Modal>
  );
}
