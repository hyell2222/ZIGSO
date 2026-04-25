"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PropAsset } from "@/lib/api/storage-props";

import { mapEditorLocationCanvasStyle, MAP_GRID_STEP_PX } from "@/lib/map-location-style";
import { cn } from "@/lib/utils";

import {
  DRAG_TYPE_PROP,
  MAP_EDITOR_WORLD,
  PROP_DEFAULT_DROP_SIZE,
  type DraftInvestigationZone,
  type DraftClue,
} from "./types";
import { Button } from "@/components/ui/button";

type Props = {
  investigationZones: DraftInvestigationZone[];
  clues: DraftClue[];
  propAssets: PropAsset[];
  isLoadingAssets: boolean;
  onUpdateClue: (tempId: string, patch: Partial<DraftClue>) => void;
  onAddClue: (clue: Omit<DraftClue, "tempId">) => string;
  onRemoveClue: (tempId: string) => void;
};

function initialAssignmentLocationTabId(
  investigationZones: DraftInvestigationZone[],
  clues: DraftClue[],
): string {
  const first = investigationZones[0]?.tempId;
  if (first) return first;
  return clues[0]?.assignmentTempId ?? "";
}

type LocationTabItem = {
  id: string;
  tabLabel: string;
  canvasLabel: string;
  clueCount: number;
};

function sizeFromAssetMetadata(asset: PropAsset): { w: number; h: number } | null {
  if (!asset.tileW || !asset.tileH) return null;
  if (asset.tileW <= 0 || asset.tileH <= 0) return null;
  return {
    w: asset.tileW * MAP_GRID_STEP_PX,
    h: asset.tileH * MAP_GRID_STEP_PX,
  };
}

export function MapEditorStep({
  investigationZones,
  clues,
  propAssets,
  isLoadingAssets,
  onAddClue,
  onUpdateClue,
  onRemoveClue,
}: Props) {
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    initialAssignmentLocationTabId(investigationZones, clues),
  );
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [draggingAsset, setDraggingAsset] = useState<string | null>(null);

  const locationTabs = useMemo<LocationTabItem[]>(() => {
    const countByLocation = new Map<string, number>();
    for (const clue of clues) {
      countByLocation.set(
        clue.assignmentTempId,
        (countByLocation.get(clue.assignmentTempId) ?? 0) + 1,
      );
    }

    const tabs: LocationTabItem[] = investigationZones.map((z) => ({
      id: z.tempId,
      tabLabel: z.zoneName.trim() || "미정 구역",
      canvasLabel: `${z.zoneName.trim() || "미정 구역"} (조사 구역)`,
      clueCount: countByLocation.get(z.tempId) ?? 0,
    }));

    const knownSlotIds = new Set(investigationZones.map((m) => m.tempId));
    const orphanLocationIds: string[] = [];
    for (const clue of clues) {
      const locationId = clue.assignmentTempId;
      if (knownSlotIds.has(locationId)) continue;
      if (!orphanLocationIds.includes(locationId)) orphanLocationIds.push(locationId);
    }

    orphanLocationIds.forEach((locationId, index) => {
      const n = index + 1;
      tabs.push({
        id: locationId,
        tabLabel: `미등록 장소 ${n}`,
        canvasLabel: `미등록 장소 ${n}`,
        clueCount: countByLocation.get(locationId) ?? 0,
      });
    });

    return tabs;
  }, [investigationZones, clues]);

  const selectableTabIds = useMemo(() => new Set(locationTabs.map((tab) => tab.id)), [locationTabs]);

  const effectiveTabId = useMemo(
    () =>
      selectableTabIds.has(activeTabId) ? activeTabId : (locationTabs[0]?.id ?? ""),
    [activeTabId, locationTabs, selectableTabIds],
  );

  const validSelectedClueId = useMemo(
    () =>
      selectedClueId && clues.some((c) => c.tempId === selectedClueId) ? selectedClueId : null,
    [clues, selectedClueId],
  );

  const cluesInLocation = useMemo(
    () => clues.filter((c) => c.assignmentTempId === effectiveTabId),
    [clues, effectiveTabId],
  );

  const selectedClue = useMemo(
    () => clues.find((c) => c.tempId === validSelectedClueId) ?? null,
    [clues, validSelectedClueId],
  );

  const metadataSizeByAsset = useMemo(() => {
    const map = new Map<string, { w: number; h: number }>();
    for (const asset of propAssets) {
      const size = sizeFromAssetMetadata(asset);
      if (size) map.set(asset.asset, size);
    }
    return map;
  }, [propAssets]);

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle>3. 맵 에디터</CardTitle>
      </CardHeader>
      <CardContent>
        {investigationZones.length === 0 ? (
          <p className="mb-4 rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
            조사 구역이 1곳 이상 필요합니다. (2단계에서 추가)
          </p>
        ) : null}

        <LocationTabs
          locations={locationTabs}
          activeId={effectiveTabId}
          onSelect={(id) => {
            setActiveTabId(id);
            setSelectedClueId(null);
          }}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          <PropSidebar
            assets={propAssets}
            isLoading={isLoadingAssets}
            onDragStartAsset={(asset) => {
              setDraggingAsset(asset);
            }}
            onDragEndAsset={() => setDraggingAsset(null)}
          />

          <MapCanvas
            clues={cluesInLocation}
            selectedClueId={validSelectedClueId}
            onSelectClue={setSelectedClueId}
            onDropAsset={(asset, x, y) => {
              if (!effectiveTabId) return;
              const metadataSize = metadataSizeByAsset.get(asset) ?? null;
              const preferred = metadataSize ?? PROP_DEFAULT_DROP_SIZE;
              const fallbackW = preferred.w;
              const fallbackH = preferred.h;
              const fallbackRect = snapClueRectToGrid(
                x,
                y,
                fallbackW,
                fallbackH,
                MAP_EDITOR_WORLD.w,
                MAP_EDITOR_WORLD.h,
                MAP_GRID_STEP_PX,
              );
              const newId = onAddClue({
                assignmentTempId: effectiveTabId,
                asset,
                x: fallbackRect.x,
                y: fallbackRect.y,
                w: fallbackRect.w,
                h: fallbackRect.h,
                name: "",
                content: "",
              });
              setSelectedClueId(newId);
            }}
            onMoveClue={(id, x, y) => onUpdateClue(id, { x, y })}
            propAssets={propAssets}
            draggingAsset={draggingAsset}
            metadataSizeByAsset={metadataSizeByAsset}
          />

          <ClueEditorPanel
            clue={selectedClue}
            onChange={(patch) => {
              if (!selectedClue) return;
              onUpdateClue(selectedClue.tempId, patch);
            }}
            onRemove={() => {
              if (!selectedClue) return;
              onRemoveClue(selectedClue.tempId);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Sub components ---------------- */

function LocationTabs({
  locations,
  activeId,
  onSelect,
}: {
  locations: LocationTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--border)]/40">
      {locations.map((location) => {
        const active = location.id === activeId;
        return (
          <Button
            key={location.id}
            type="button"
            variant="tab"
            onClick={() => onSelect(location.id)}
            className={cn(
              "relative -mb-px px-4 py-2.5 text-sm",
              active
                ? "border-b-2 !border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent hover:border-b-2 hover:border-[var(--border)]"
            )}
          >
            <span className="font-semibold">{location.tabLabel}</span>
            <span className="ml-1 text-xs opacity-60">
              ({location.clueCount})
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function PropSidebar({
  assets,
  isLoading,
  onDragStartAsset,
  onDragEndAsset,
}: {
  assets: PropAsset[];
  isLoading: boolean;
  onDragStartAsset?: (asset: string) => void;
  onDragEndAsset?: () => void;
}) {
  return (
    <aside className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)]">
      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          소품 ({assets.length})
        </h3>
        <p className="text-[11px] leading-snug text-[var(--muted-foreground,#94a3b8)]">
          소품을 맵 위로 드래그해서 놓으세요.
        </p>
      </div>
      {isLoading ? (
        <p className="text-xs text-[var(--muted-foreground,#94a3b8)]">불러오는 중…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground,#94a3b8)]">
          사용 가능한 prop 이 없어요. Supabase Storage 의 prop bucket 을 확인해주세요.
        </p>
      ) : (
        <ul className="grid max-h-[520px] grid-cols-2 gap-1 overflow-y-auto pr-1">
          {assets.map((p) => (
            <li key={p.asset} className="flex items-center justify-center">
              <PropDraggable
                asset={p}
                onDragStartAsset={onDragStartAsset}
                onDragEndAsset={onDragEndAsset}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function PropDraggable({
  asset,
  onDragStartAsset,
  onDragEndAsset,
}: {
  asset: PropAsset;
  onDragStartAsset?: (asset: string) => void;
  onDragEndAsset?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE_PROP, asset.asset);
        event.dataTransfer.setData("text/plain", asset.asset);
        event.dataTransfer.effectAllowed = "copy";
        onDragStartAsset?.(asset.asset);
      }}
      onDragEnd={() => onDragEndAsset?.()}
      className="cursor-grab"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic storage URLs; pixelated props */}
      <img
        src={asset.url}
        alt={asset.asset}
        draggable={false}
        className="block max-h-14 w-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

type DragState = {
  clueId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
  rectW: number;
  rectH: number;
  activated: boolean;
};

type PlacementPreview = { x: number; y: number; w: number; h: number };

const DRAG_THRESHOLD = 4; // px

function snapClueRectToGrid(
  x: number,
  y: number,
  w: number,
  h: number,
  worldW: number,
  worldH: number,
  cell: number,
) {
  const snappedW = Math.max(cell, Math.round(w / cell) * cell);
  const snappedH = Math.max(cell, Math.round(h / cell) * cell);
  const safeW = Math.min(worldW, snappedW);
  const safeH = Math.min(worldH, snappedH);
  const left = Math.round((x - safeW / 2) / cell) * cell;
  const top = Math.round((y - safeH / 2) / cell) * cell;
  const clampedLeft = Math.min(worldW - safeW, Math.max(0, left));
  const clampedTop = Math.min(worldH - safeH, Math.max(0, top));
  return {
    x: clampedLeft + safeW / 2,
    y: clampedTop + safeH / 2,
    w: safeW,
    h: safeH,
  };
}

function MapCanvas({
  clues,
  selectedClueId,
  propAssets,
  draggingAsset,
  metadataSizeByAsset,
  onSelectClue,
  onDropAsset,
  onMoveClue,
}: {
  clues: DraftClue[];
  selectedClueId: string | null;
  propAssets: PropAsset[];
  draggingAsset: string | null;
  metadataSizeByAsset: Map<string, { w: number; h: number }>;
  onSelectClue: (id: string | null) => void;
  onDropAsset: (asset: string, x: number, y: number) => void;
  onMoveClue: (id: string, x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /**
   * 단순 클릭(=선택만)과 드래그(=이동) 를 구분하기 위한 상태.
   * - pointerDown 시점에는 _대기_ 상태로만 기록한다 (selection 만 즉시 반영).
   * - 임계값(DRAG_THRESHOLD) 이상 움직여야 비로소 드래그를 활성화하고 pointer capture 를 잡는다.
   * - 활성화되지 않은 채 pointerUp 이 오면 = 단순 클릭으로 간주, 선택을 유지한다.
   */
  const dragRef = useRef<DragState | null>(null);
  /** 드래그 직후 발생할 click 이벤트로 인한 deselect 차단용 가드 */
  const justDraggedRef = useRef(false);
  /** 배치 예정 위치 프리뷰 (사이드바 drag/drop + 맵 내 이동) */
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);

  const assetUrlByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of propAssets) map.set(a.asset, a.url);
    return map;
  }, [propAssets]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const asset =
        event.dataTransfer.getData(DRAG_TYPE_PROP) ||
        event.dataTransfer.getData("text/plain");
      if (!asset) return;
      const previewSize = metadataSizeByAsset.get(asset);
      const previewW = previewSize?.w ?? PROP_DEFAULT_DROP_SIZE.w;
      const previewH = previewSize?.h ?? PROP_DEFAULT_DROP_SIZE.h;
      const rect = event.currentTarget.getBoundingClientRect();
      const rawX = clampWithin(event.clientX - rect.left, MAP_EDITOR_WORLD.w, rect.width);
      const rawY = clampWithin(event.clientY - rect.top, MAP_EDITOR_WORLD.h, rect.height);
      const rectOnGrid = snapClueRectToGrid(
        rawX,
        rawY,
        previewW,
        previewH,
        MAP_EDITOR_WORLD.w,
        MAP_EDITOR_WORLD.h,
        MAP_GRID_STEP_PX,
      );
      onDropAsset(asset, rectOnGrid.x, rectOnGrid.y);
      setPlacementPreview(null);
    },
    [metadataSizeByAsset, onDropAsset],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;

      if (!drag.activated) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        drag.activated = true;
        try {
          containerRef.current?.setPointerCapture(event.pointerId);
        } catch {
          // ignore — 일부 환경에서 capture 실패해도 move 자체는 동작
        }
      }

      const worldDx = (dx / drag.rectW) * MAP_EDITOR_WORLD.w;
      const worldDy = (dy / drag.rectH) * MAP_EDITOR_WORLD.h;
      const rawX = Math.min(MAP_EDITOR_WORLD.w, Math.max(0, drag.initialX + worldDx));
      const rawY = Math.min(MAP_EDITOR_WORLD.h, Math.max(0, drag.initialY + worldDy));
      const rectOnGrid = snapClueRectToGrid(
        rawX,
        rawY,
        drag.initialW,
        drag.initialH,
        MAP_EDITOR_WORLD.w,
        MAP_EDITOR_WORLD.h,
        MAP_GRID_STEP_PX,
      );
      onMoveClue(drag.clueId, rectOnGrid.x, rectOnGrid.y);
      setPlacementPreview(rectOnGrid);
    },
    [onMoveClue],
  );

  const finishGesture = useCallback((pointerId: number, target: Element) => {
    justDraggedRef.current = true;
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
    try {
      if (target instanceof Element && (target as Element & { hasPointerCapture?: (id: number) => boolean }).hasPointerCapture?.(pointerId)) {
        (target as Element & { releasePointerCapture: (id: number) => void }).releasePointerCapture(pointerId);
      }
    } catch {
      // ignore
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        if (drag.activated) finishGesture(event.pointerId, event.currentTarget);
        dragRef.current = null;
      }
      setPlacementPreview(null);
    },
    [finishGesture],
  );

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          const assetFromData =
            event.dataTransfer.getData(DRAG_TYPE_PROP) ||
            event.dataTransfer.getData("text/plain");
          const asset = draggingAsset ?? assetFromData;
          const previewSize = asset ? metadataSizeByAsset.get(asset) : undefined;
          const previewW = previewSize?.w ?? PROP_DEFAULT_DROP_SIZE.w;
          const previewH = previewSize?.h ?? PROP_DEFAULT_DROP_SIZE.h;

          // 일부 브라우저는 dragover 시 getData()를 빈 문자열로 돌려준다.
          // 따라서 dataTransfer 타입과 현재 draggingAsset 상태를 함께 본다.
          const types = Array.from(event.dataTransfer.types ?? []);
          const isPropDrag =
            !!asset || types.includes(DRAG_TYPE_PROP) || types.includes("text/plain");
          if (!isPropDrag) {
            setPlacementPreview(null);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const rawX = clampWithin(event.clientX - rect.left, MAP_EDITOR_WORLD.w, rect.width);
          const rawY = clampWithin(event.clientY - rect.top, MAP_EDITOR_WORLD.h, rect.height);
          const rectOnGrid = snapClueRectToGrid(
            rawX,
            rawY,
            previewW,
            previewH,
            MAP_EDITOR_WORLD.w,
            MAP_EDITOR_WORLD.h,
            MAP_GRID_STEP_PX,
          );
          setPlacementPreview(rectOnGrid);
        }}
        onDragLeave={(event) => {
          // dragleave 의 relatedTarget 은 브라우저별로 불안정하므로, 일단 즉시 숨긴다.
          // 다음 dragover 에서 다시 정확한 위치 프리뷰가 갱신된다.
          event.preventDefault();
          setPlacementPreview(null);
        }}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          if (justDraggedRef.current) return;
          if (event.target === event.currentTarget) onSelectClue(null);
        }}
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `${MAP_EDITOR_WORLD.w} / ${MAP_EDITOR_WORLD.h}`,
          ...mapEditorLocationCanvasStyle(
            MAP_EDITOR_WORLD.w,
            MAP_EDITOR_WORLD.h,
            MAP_GRID_STEP_PX,
          ),
        }}
      >
        {clues.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--muted-foreground,#94a3b8)]">
            왼쪽 사이드바의 prop 을 이곳으로 드래그해서 단서를 배치하세요.
          </div>
        ) : null}

        {placementPreview ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/15"
            style={{
              left: `${(placementPreview.x / MAP_EDITOR_WORLD.w) * 100}%`,
              top: `${(placementPreview.y / MAP_EDITOR_WORLD.h) * 100}%`,
              width: `${(placementPreview.w / MAP_EDITOR_WORLD.w) * 100}%`,
              height: `${(placementPreview.h / MAP_EDITOR_WORLD.h) * 100}%`,
            }}
          />
        ) : null}

        {clues.map((clue) => {
          const url = assetUrlByName.get(clue.asset);
          const left = `${(clue.x / MAP_EDITOR_WORLD.w) * 100}%`;
          const top = `${(clue.y / MAP_EDITOR_WORLD.h) * 100}%`;
          const widthPct = `${(clue.w / MAP_EDITOR_WORLD.w) * 100}%`;
          const heightPct = `${(clue.h / MAP_EDITOR_WORLD.h) * 100}%`;
          const selected = clue.tempId === selectedClueId;
          return (
            <div
              key={clue.tempId}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                onSelectClue(clue.tempId);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                dragRef.current = {
                  clueId: clue.tempId,
                  pointerId: event.pointerId,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  initialX: clue.x,
                  initialY: clue.y,
                  initialW: clue.w,
                  initialH: clue.h,
                  rectW: rect.width,
                  rectH: rect.height,
                  activated: false,
                };
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none rounded outline-offset-2 " +
                (selected ? "outline outline-2 outline-[var(--accent)]" : "")
              }
              style={{ left, top, width: widthPct, height: heightPct }}
            >
              {url ? (
                <>
                  <img
                    src={url}
                    alt={clue.asset}
                    draggable={false}
                    className="h-full w-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded bg-yellow-300/80 text-[10px] text-yellow-900">
                  ?
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClueEditorPanel({
  clue,
  onChange,
  onRemove,
}: {
  clue: DraftClue | null;
  onChange: (patch: Partial<DraftClue>) => void;
  onRemove: () => void;
}) {
  if (!clue) {
    return (
      <aside className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-center text-xs text-[var(--muted-foreground,#94a3b8)]">
        맵에 배치된 prop 을 클릭하면 여기서 단서 이름과 내용을 편집할 수 있어요.
      </aside>
    );
  }
  return (
    <aside className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          단서 편집
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-red-300 transition-colors hover:bg-red-500/20"
          aria-label="단서 삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80">
          단서 이름<span className="ml-0.5 text-red-400">*</span>
        </label>
        <Input
          value={clue.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="예) 낡은 열쇠"
          aria-required
          className={cn(
            "h-8 text-xs",
            !clue.name.trim() ? "border-red-500/50 focus-visible:ring-red-500/30" : "",
          )}
        />
        {!clue.name.trim() ? (
          <p className="text-[10px] text-red-300/90">이름을 입력해야 다음 단계로 진행할 수 있어요.</p>
        ) : null}
      </div>
  
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80">
          단서 내용
        </label>
        <Textarea
          value={clue.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="학생이 조사했을 때 보여줄 설명"
          rows={4}
          className="resize-none text-xs"
        />
      </div>
    </aside>
  );
} 


function clampWithin(localPx: number, worldDim: number, renderedDim: number) {
  if (renderedDim <= 0) return 0;
  const ratio = localPx / renderedDim;
  const world = ratio * worldDim;
  return Math.min(worldDim, Math.max(0, world));
}
