"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";
import { investigationPhaseLabel } from "@/lib/play-session-phase";

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  { ssr: false, loading: () => <p className="text-sm text-[var(--muted-foreground)]">맵 로딩 중…</p> },
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
  const label = investigationPhaseLabel();

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--background)]">
      {mapLoading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 text-[var(--muted-foreground)]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" aria-hidden />
          <p className="text-sm">장소·단서 정보를 불러오는 중…</p>
        </div>
      ) : mapError ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--error)]">
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
