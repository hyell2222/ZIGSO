"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { CSSProperties } from "react";

import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";
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
      <p className="px-2 text-sm text-[color:var(--entry-parchment-muted)]">맵 로딩 중…</p>
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
  const label = investigationPhaseLabel();

  return (
    <div
      className="font-sans fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden text-[color:var(--entry-parchment)]"
      style={ENTRY_MAP_BG}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_srgb,var(--primary)_14%,transparent)] to-transparent"
        aria-hidden
      />
      {mapLoading ? (
        <div
          className="relative flex flex-1 flex-col items-center justify-center gap-3"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-[color:var(--entry-accent-soft)]"
            style={{ filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--entry-accent) 40%, transparent))" }}
            aria-hidden
          />
          <p className="text-sm tracking-wide text-[color:var(--entry-parchment-muted)]">
            장소·단서 정보를 불러오는 중…
          </p>
        </div>
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
