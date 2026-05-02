"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

import { PLAY_PAGE_BLACK_BG } from "@/components/play/play-atmosphere";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { LoadingState } from "@/components/ui/loading-state";
import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";

const MAP_SHELL_BG: CSSProperties = PLAY_PAGE_BLACK_BG;

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  {
    ssr: false,
    loading: () => (
        <div className="flex justify-center px-2 py-4">
        <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-6 shadow-[var(--elevation-sm)]">
          <LoadingState variant="compact" tone="default" label="조사 장소 맵을 불러오는 중…" />
        </div>
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
};

export function InvestigationMapShell({
  mapLoading,
  mapError,
  locations,
  clues,
  discoveredClueIds,
  onDiscoveredClueIdsChange,
}: Props) {
  return (
    <div
      className="font-sans play-shell relative fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden text-[var(--foreground)]"
      style={MAP_SHELL_BG}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_srgb,var(--primary)_8%,transparent)] to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left shadow-[var(--elevation-sm)] sm:px-6"
          role="status"
        >
          <PlayPhaseHeader
            phase={2}
            title="단서 수집"
            description="같은 조사 장소를 배정받은 학생들끼리 새롭게 모여 앉아 단서를 수집하고 해석하세요."
          />
        </div>
        {mapLoading ? (
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-6 py-10 shadow-[var(--elevation-sm)]">
              <LoadingState variant="page" tone="default" label="장소·단서 정보를 불러오는 중…" className="min-h-[12rem]" />
            </div>
          </div>
        ) : mapError ? (
          <div className="relative flex flex-1 items-center justify-center p-6">
            <div className="max-w-md rounded-xl border border-[var(--panel-warn-border)] bg-[var(--panel-warn-bg)] px-6 py-8 text-center text-sm text-[var(--danger)] shadow-[var(--elevation-sm)]">
              맵 데이터를 불러오지 못했습니다.
              {mapError instanceof Error ? ` ${mapError.message}` : null}
            </div>
          </div>
        ) : (
          <InvestigationMap
            variant="fullscreen"
            className="min-h-0 flex-1"
            locations={locations}
            clues={clues}
            initialDiscoveredClueIds={discoveredClueIds}
            onDiscoveredClueIdsChange={onDiscoveredClueIdsChange}
          />
        )}
      </div>
    </div>
  );
}
