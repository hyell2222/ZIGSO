"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { ScenarioClueForMap, ScenarioLocationForMap } from "@/lib/api/play";
import type { InvestigationPhase } from "@/lib/play-session-phase";
import { investigationPhaseLabel } from "@/lib/play-session-phase";

const InvestigationMap = dynamic(
  () => import("@/components/play/investigation-map").then((mod) => mod.InvestigationMap),
  { ssr: false, loading: () => <p className="text-sm text-[var(--muted-foreground)]">맵 로딩 중…</p> },
);

type InvestigateModeProp = {
  topBarLabel?: string;
  onInvestigate: (clueIds: string[]) => void;
};

type InvestigationMapShellProps = {
  phase: InvestigationPhase;
  mapLoading: boolean;
  mapError: Error | null;
  locations: ScenarioLocationForMap[];
  clues: ScenarioClueForMap[];
  discoveredClueIds?: string[];
  onDiscoveredClueIdsChange?: (ids: string[]) => void;
  /** 최종 미션 단계에서만 노출되는 fallback 완료 버튼 (overlay 가 우선). */
  canClaimSolved?: boolean;
  isSolved?: boolean;
  onClaimSolved?: () => void;
  /**
   * 맵 위에 띄울 오버레이 (미션 카드, 모달 등).
   * 지정 시 `canClaimSolved` 버튼은 숨겨진다 (overlay 가 진행 흐름을 책임짐).
   */
  overlay?: ReactNode;
  /** 최종 미션: 미션 타겟 조사 모드 — InvestigationMap 의 F 키 동작을 가로챈다 */
  investigateMode?: InvestigateModeProp;
  /**
   * 인벤토리 패널을 외부 데이터로 채울 때 전달.
   * - investigation phase: 미지정 → 내가 발견한 단서만 노출.
   * - resolution phase: 팀이 모은 단서 전체를 전달해 표시.
   */
  inventoryClues?: ScenarioClueForMap[];
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
  overlay,
  investigateMode,
  inventoryClues,
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
            investigateMode={investigateMode}
            inventoryClues={inventoryClues}
          />
          {overlay ? (
            <div className="pointer-events-none absolute inset-0 z-[110]">{overlay}</div>
          ) : canClaimSolved ? (
            <div className="pointer-events-none absolute right-4 top-4 z-[110]">
              <Button
                type="button"
                variant={isSolved ? "secondary" : "default"}
                size="sm"
                disabled={isSolved}
                onClick={onClaimSolved}
                className="pointer-events-auto border px-4 py-2"
              >
                {isSolved ? "미션 완료" : "미션 완료하기"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
