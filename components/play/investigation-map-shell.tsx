"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";
import { jigsawSeatingCopy } from "@/lib/jigsaw-seating-guidance";
import { LoadingState } from "@/components/ui/loading-state";
import { investigationPhaseLabel } from "@/lib/play-session-phase";

const ENTRY_MAP_BG: CSSProperties = {
  backgroundColor: "var(--entry-shell-deep)",
  backgroundImage: `
    linear-gradient(180deg, color-mix(in srgb, var(--entry-shell) 96%, transparent) 0%, var(--entry-shell-deep) 100%),
    repeating-linear-gradient(0deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px),
    repeating-linear-gradient(90deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px)
  `,
};

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  {
    ssr: false,
    loading: () => (
      <div className="px-2 py-4">
        <LoadingState variant="compact" tone="play" label="조사 맵을 불러오는 중…" />
      </div>
    ),
  },
);

type Props = {
  mapLoading: boolean;
  mapError: Error | null;
  locations: CaseLocationForMap[];
  clues: CaseClueForMap[];
  discoveredClueIds?: string[];
  onDiscoveredClueIdsChange?: (ids: string[]) => void;
  /** 같은 담당 구역 전문가 집단 안내 (학생 화면) */
  patrolZoneName?: string | null;
};

export function InvestigationMapShell({
  mapLoading,
  mapError,
  locations,
  clues,
  discoveredClueIds,
  onDiscoveredClueIdsChange,
  patrolZoneName,
}: Props) {
  const label = investigationPhaseLabel();
  const expertSeatLine =
    patrolZoneName && patrolZoneName.trim().length > 0
      ? jigsawSeatingCopy.studentInvestigationWithZone(patrolZoneName.trim())
      : jigsawSeatingCopy.studentInvestigationNoZone;

  return (
    <div
      className="font-sans fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden text-[color:var(--entry-parchment)]"
      style={ENTRY_MAP_BG}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_srgb,var(--primary)_14%,transparent)] to-transparent"
        aria-hidden
      />
      <div
        className="shrink-0 border-b border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_88%,var(--ink))] px-4 py-2.5 text-left"
        role="status"
      >
        <p className="text-[11px] font-semibold leading-snug text-[color:var(--entry-accent-soft)]">
          {jigsawSeatingCopy.expertGroupTerm} · 단서 수집
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--entry-parchment-muted)]">
          {expertSeatLine}
        </p>
      </div>
      {mapLoading ? (
        <LoadingState
          variant="page"
          tone="play"
          label="장소·단서 정보를 불러오는 중…"
          className="min-h-0 flex-1 py-16"
        />
      ) : mapError ? (
        <div
          className="relative flex flex-1 items-center justify-center p-6 text-center text-sm text-[color:var(--entry-auth-notice)]"
        >
          맵 데이터를 불러오지 못했습니다.
          {mapError instanceof Error ? ` ${mapError.message}` : null}
        </div>
      ) : (
        <InvestigationMap
          variant="fullscreen"
          phaseLabel={label}
          className="min-h-0 flex-1"
          locations={locations}
          clues={clues}
          initialDiscoveredClueIds={discoveredClueIds}
          onDiscoveredClueIdsChange={onDiscoveredClueIdsChange}
        />
      )}
    </div>
  );
}
