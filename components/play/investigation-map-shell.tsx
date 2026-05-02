"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

import {
  PLAY_PAGE_BLACK_BG,
  playLoaderRegion,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { LoadingState } from "@/components/ui/loading-state";
import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";

const MAP_SHELL_BG: CSSProperties = PLAY_PAGE_BLACK_BG;

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  {
    ssr: false,
    loading: () => (
      <div className={`${playLoaderRegion} min-h-[12rem] shrink-0`}>
        <LoadingState variant="section" tone="play" label="맵 데이터를 불러오는 중…" />
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
        <div className={playPhaseHeaderChromeShell} role="status">
          <div className={playPhaseHeaderChromeInner}>
            <PlayPhaseHeader
              phase={2}
              title="단서 수집"
              description="같은 조사 장소를 배정받은 학생들끼리 새롭게 모여 앉아 단서를 수집하고 해석하세요."
            />
          </div>
        </div>
        {mapLoading ? (
          <div className={playLoaderRegion}>
            <LoadingState variant="section" tone="play" label="장소·단서 정보를 불러오는 중…" />
          </div>
        ) : mapError ? (
          <div className={playLoaderRegion}>
            <p className="max-w-md text-center text-sm leading-relaxed text-[var(--danger)]">
              맵 데이터를 불러오지 못했습니다.
              {mapError instanceof Error ? ` ${mapError.message}` : null}
            </p>
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
