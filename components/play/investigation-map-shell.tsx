"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { ScenarioClueForMap, ScenarioLocationForMap } from "@/lib/api/play";
import type { InvestigationPhase } from "@/lib/play-session-phase";
import { investigationPhaseLabel } from "@/lib/play-session-phase";

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  { ssr: false, loading: () => <p className="text-sm text-[var(--muted-foreground)]">맵 로딩 중…</p> },
);

type InvestigationMapShellProps = {
  phase: InvestigationPhase;
  mapLoading: boolean;
  mapError: Error | null;
  locations: ScenarioLocationForMap[];
  clues: ScenarioClueForMap[];
  discoveredClueIds?: string[];
  onDiscoveredClueIdsChange?: (ids: string[]) => void;
  /** "사건 해결" 단계에서만 노출되는 보물 발견 버튼 */
  canClaimSolved?: boolean;
  isSolved?: boolean;
  onClaimSolved?: () => void;
};

export function InvestigationMapShell({
  phase,
  mapLoading,
  mapError,
  locations,
  clues,
  discoveredClueIds,
  onDiscoveredClueIdsChange,
  canClaimSolved,
  isSolved,
  onClaimSolved,
}: InvestigationMapShellProps) {
  const label = investigationPhaseLabel(phase);

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--background)]">
      {mapLoading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 text-[var(--muted-foreground)]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
          <p className="text-sm">장소·단서 정보를 불러오는 중…</p>
        </div>
      ) : mapError ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--primary)]">
          맵 데이터를 불러오지 못했습니다.
          {mapError instanceof Error ? ` ${mapError.message}` : null}
        </div>
      ) : (
        <>
          <InvestigationMap
            variant="fullscreen"
            phaseLabel={label}
            className="min-h-0 flex-1"
            locations={locations}
            clues={clues}
            initialDiscoveredClueIds={discoveredClueIds}
            onDiscoveredClueIdsChange={onDiscoveredClueIdsChange}
          />
          {canClaimSolved ? (
            <div className="pointer-events-none absolute right-4 top-4 z-[110]">
              <button
                type="button"
                disabled={isSolved}
                onClick={onClaimSolved}
                className={`pointer-events-auto rounded-md border px-4 py-2 text-sm font-semibold shadow-lg transition ${
                  isSolved
                    ? "cursor-default border-[var(--border)] bg-[rgba(15,17,19,0.95)] text-[var(--muted-foreground)]"
                    : "border-[var(--accent)] bg-[var(--accent)] text-black hover:opacity-90"
                }`}
              >
                {isSolved ? "사건 해결됨" : "사건 해결"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
