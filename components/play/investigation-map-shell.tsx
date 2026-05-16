"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";

import {
  PLAY_PAGE_BLACK_BG,
  playLoaderRegion,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { LoadingState } from "@/components/ui/loading-state";
import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";
import { cn } from "@/lib/utils";

const MAP_SHELL_BG: CSSProperties = PLAY_PAGE_BLACK_BG;

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  {
    ssr: false,
    loading: () => (
      <div className={`${playLoaderRegion} min-h-[12rem] shrink-0`}>
        <LoadingState variant="section" tone="play" label="불러오는 중…" />
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
  /** 헤더 우측(팀·담당 장소 등) */
  headerRightSlot?: ReactNode;
  /**
   * 화면 점유 방식.
   * - `viewport`(기본): 학생 본 화면 — `fixed inset-0` 로 뷰포트를 점유.
   * - `contained`: 부모 컨테이너 안에서만 채움 — 시뮬레이션 등 임베드 용도.
   */
  variant?: "viewport" | "contained";
  /** `contained`(샌드박스 등)에서 단계 헤더 타이포를 줄입니다 */
  compactHeader?: boolean;
};

export function InvestigationMapShell({
  mapLoading,
  mapError,
  locations,
  clues,
  discoveredClueIds,
  onDiscoveredClueIdsChange,
  headerRightSlot,
  variant = "viewport",
  compactHeader = false,
}: Props) {
  const isContained = variant === "contained";
  return (
    <div
      className={cn(
        "font-sans play-shell relative flex flex-col overflow-hidden text-[var(--foreground)]",
        isContained
          ? "h-full min-h-0 w-full"
          : "fixed inset-0 z-[100] h-dvh max-h-dvh pt-[env(safe-area-inset-top,0px)]",
      )}
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
              rightSlot={headerRightSlot}
              compact={compactHeader}
            />
          </div>
        </div>
        {mapLoading ? (
          <div className={playLoaderRegion}>
            <LoadingState variant="section" tone="play" label="불러오는 중…" />
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
