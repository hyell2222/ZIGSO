"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { StepHeading } from "./step-blocks";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PropAsset } from "@/lib/api/storage-props";
import {
  mapEditorLocationCanvasStyle,
  MAP_GRID_STEP_PX,
  snapSizePxToGrid,
} from "@/lib/map-location-style";
import { loadImageNaturalSize } from "@/lib/natural-image-size";
import {
  clampPropFootprintToEditorWorld,
  clampPropFootprintToMapEditorCanvas,
} from "@/lib/map-prop-pixel-size";
import { cn } from "@/lib/utils";

import {
  DRAG_TYPE_PROP,
  MAP_EDITOR_WORLD,
  PROP_DEFAULT_DROP_SIZE,
  type DraftClue,
  type DraftInvestigationZone,
} from "./types";

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
  /** 맵에 막 올린 단서 — 이름·내용 입력 모달 */
  const [draftClueModalId, setDraftClueModalId] = useState<string | null>(null);
  const [clueModalNameError, setClueModalNameError] = useState(false);
  const [draggingAsset, setDraggingAsset] = useState<string | null>(null);
  /** 소품 PNG 등 자연 크기 — 드롭 시 기본 w/h(격자 스냅) */
  const [naturalByAsset, setNaturalByAsset] = useState(() => new Map<string, { w: number; h: number }>());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        propAssets.map(async (a) => {
          const { w, h } = await loadImageNaturalSize(a.url);
          return { asset: a.asset, size: w > 0 && h > 0 ? { w, h } : null };
        }),
      );
      if (cancelled) return;
      const m = new Map<string, { w: number; h: number }>();
      for (const { asset, size } of pairs) {
        if (size) m.set(asset, size);
      }
      setNaturalByAsset(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [propAssets]);

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
      tabLabel: z.zoneName.trim() || "미정 장소",
      canvasLabel: `${z.zoneName.trim() || "미정 장소"} (조사 장소)`,
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

  /** 고해상도 텍스처를 그대로 w/h에 넣었을 때 맵 밖으로 퍼지는 기존 데이터 보정 */
  useLayoutEffect(() => {
    for (const c of cluesInLocation) {
      const cl = clampPropFootprintToMapEditorCanvas(
        c.w,
        c.h,
        MAP_EDITOR_WORLD.w,
        MAP_EDITOR_WORLD.h,
        MAP_GRID_STEP_PX,
      );
      if (cl.w !== c.w || cl.h !== c.h) {
        onUpdateClue(c.tempId, { w: cl.w, h: cl.h });
      }
    }
  }, [cluesInLocation, onUpdateClue]);

  const selectedClue = useMemo(
    () => clues.find((c) => c.tempId === validSelectedClueId) ?? null,
    [clues, validSelectedClueId],
  );

  const draftClueForModal = useMemo(
    () => (draftClueModalId ? clues.find((c) => c.tempId === draftClueModalId) ?? null : null),
    [clues, draftClueModalId],
  );

  useEffect(() => {
    if (draftClueModalId) setClueModalNameError(false);
  }, [draftClueModalId]);

  const closeDraftClueModal = useCallback(() => {
    setDraftClueModalId(null);
    setClueModalNameError(false);
  }, []);

  const confirmDraftClueModal = useCallback(() => {
    const c = draftClueForModal;
    if (!c?.name.trim()) {
      setClueModalNameError(true);
      return;
    }
    closeDraftClueModal();
  }, [closeDraftClueModal, draftClueForModal]);

  return (
    <Card>
      <CardHeader>
        <StepHeading
          step={4}
          title="맵 에디터"
          subtitle="소품을 맵에 놓으면 단서 입력 창이 열립니다. 이후에는 오른쪽 패널에서도 수정할 수 있어요."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <LocationTabs
          locations={locationTabs}
          activeId={effectiveTabId}
          onSelect={(id) => {
            setActiveTabId(id);
            setSelectedClueId(null);
          }}
        />

        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
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
            onDropAsset={(asset, x, y, w, h) => {
              if (!effectiveTabId) return;
              const newId = onAddClue({
                assignmentTempId: effectiveTabId,
                asset,
                x,
                y,
                w,
                h,
                name: "",
                content: "",
              });
              setSelectedClueId(newId);
              setDraftClueModalId(newId);
            }}
            onUpdateClue={onUpdateClue}
            onRemoveClue={onRemoveClue}
            propAssets={propAssets}
            draggingAsset={draggingAsset}
            naturalByAsset={naturalByAsset}
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

        <Modal
          open={draftClueForModal != null}
          onClose={closeDraftClueModal}
          title="단서 입력"
          titleId="map-editor-draft-clue-modal-title"
          sheetOnNarrow
          maxWidthClassName="max-w-md"
          zIndexClassName="z-[200]"
          footer={
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeDraftClueModal}>
                나중에
              </Button>
              <Button type="button" size="sm" onClick={confirmDraftClueModal}>
                확인
              </Button>
            </div>
          }
        >
          {draftClueForModal ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground,#94a3b8)]">
                학생에게 보일 <strong className="text-[var(--foreground)]">이름</strong>과
                조사 시 보일 <strong className="text-[var(--foreground)]">설명</strong>을 적어주세요. <br />
                오른쪽 패널에서도 언제든 수정할 수 있어요.
              </p>
              {(() => {
                const thumb = propAssets.find((a) => a.asset === draftClueForModal.asset)?.url;
                return thumb ? (
                  <div className="w-fit mx-auto flex items-center rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-2">
                    <img src={thumb} alt="" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" />
                  </div>
                ) : null;
              })()}
              <ClueNameContentFields
                clue={draftClueForModal}
                onChange={(patch) => onUpdateClue(draftClueForModal.tempId, patch)}
                nameInputAutoFocus
                emphasizeEmptyName={false}
                submitAttempted={clueModalNameError}
              />
            </div>
          ) : null}
        </Modal>
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
        <LoadingState variant="compact" label="소품을 불러오는 중…" className="min-h-[6rem]" />
      ) : assets.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground,#94a3b8)]">
          사용 가능한 소품이 없어요. Supabase Storage 의 소품bucket 을 확인해주세요.
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

/** w/h 는 배치 박스(월드). asset 있으면 프리뷰 점선을 object-contain 표시 크기에 맞춤 */
type PlacementPreview = { x: number; y: number; w: number; h: number; asset?: string };

const DRAG_THRESHOLD = 4; // px

/** 격자 스냅만 하고 월드 박스 밖 배치를 허용한다(에디터에서 잘림 허용). */
function snapClueRectToGrid(x: number, y: number, w: number, h: number, cell: number) {
  const snappedW = Math.max(cell, Math.round(w / cell) * cell);
  const snappedH = Math.max(cell, Math.round(h / cell) * cell);
  const left = Math.round((x - snappedW / 2) / cell) * cell;
  const top = Math.round((y - snappedH / 2) / cell) * cell;
  return {
    x: left + snappedW / 2,
    y: top + snappedH / 2,
    w: snappedW,
    h: snappedH,
  };
}

/** 배치 박스 안 `object-contain` 과 동일한 표시 크기(월드 px 비율) */
function imageContainDisplaySize(
  boxW: number,
  boxH: number,
  natW: number | undefined,
  natH: number | undefined,
): { dispW: number; dispH: number } {
  if (
    natW == null ||
    natH == null ||
    !Number.isFinite(natW) ||
    !Number.isFinite(natH) ||
    natW <= 0 ||
    natH <= 0 ||
    !Number.isFinite(boxW) ||
    !Number.isFinite(boxH) ||
    boxW <= 0 ||
    boxH <= 0
  ) {
    return { dispW: boxW, dispH: boxH };
  }
  const ar = natW / natH;
  const boxAr = boxW / boxH;
  if (boxAr > ar) {
    return { dispH: boxH, dispW: boxH * ar };
  }
  return { dispW: boxW, dispH: boxW / ar };
}

type ResizeHandleId = "nw" | "ne" | "se" | "sw";

/**
 * 모서리 핸들이 실제 PNG 모서리에 붙은 경우를 위해 포인터 델타로 박스 크기 변화.
 * (절대 좌표식은 object-contain 빈 여백 때문에 방향이 뒤집힐 수 있음)
 */
function applyCornerResizeDelta(
  handle: ResizeHandleId,
  px: number,
  py: number,
  startWorldX: number,
  startWorldY: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  cell: number,
): { x: number; y: number; w: number; h: number } {
  const dpx = px - startWorldX;
  const dpy = py - startWorldY;
  const L0 = cx - w / 2;
  const T0 = cy - h / 2;
  const R0 = cx + w / 2;
  const B0 = cy + h / 2;
  const snap = (n: number) => snapSizePxToGrid(Math.max(cell, n), cell);
  switch (handle) {
    case "se": {
      const nw = snap(w + dpx);
      const nh = snap(h + dpy);
      return { x: L0 + nw / 2, y: T0 + nh / 2, w: nw, h: nh };
    }
    case "nw": {
      const nw = snap(w - dpx);
      const nh = snap(h - dpy);
      return { x: R0 - nw / 2, y: B0 - nh / 2, w: nw, h: nh };
    }
    case "ne": {
      const nw = snap(w + dpx);
      const nh = snap(h - dpy);
      return { x: L0 + nw / 2, y: B0 - nh / 2, w: nw, h: nh };
    }
    case "sw": {
      const nw = snap(w - dpx);
      const nh = snap(h + dpy);
      return { x: R0 - nw / 2, y: T0 + nh / 2, w: nw, h: nh };
    }
    default:
      return { x: cx, y: cy, w, h };
  }
}

const RESIZE_HANDLES: { id: ResizeHandleId; className: string; cursor: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
  // ne 는 우측 상단 삭제 버튼으로 대체
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
];

type ResizeGesture = {
  clueId: string;
  handle: ResizeHandleId;
  pointerId: number;
  startWorldX: number;
  startWorldY: number;
  initialCx: number;
  initialCy: number;
  initialW: number;
  initialH: number;
};

function MapCanvas({
  clues,
  selectedClueId,
  propAssets,
  draggingAsset,
  naturalByAsset,
  onSelectClue,
  onDropAsset,
  onUpdateClue,
  onRemoveClue,
}: {
  clues: DraftClue[];
  selectedClueId: string | null;
  propAssets: PropAsset[];
  draggingAsset: string | null;
  naturalByAsset: Map<string, { w: number; h: number }>;
  onSelectClue: (id: string | null) => void;
  onDropAsset: (asset: string, x: number, y: number, w: number, h: number) => void;
  onUpdateClue: (id: string, patch: Partial<Pick<DraftClue, "x" | "y" | "w" | "h">>) => void;
  onRemoveClue: (tempId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /**
   * 단순 클릭(=선택만)과 드래그(=이동) 를 구분하기 위한 상태.
   * - pointerDown 시점에는 _대기_ 상태로만 기록한다 (selection 만 즉시 반영).
   * - 임계값(DRAG_THRESHOLD) 이상 움직여야 비로소 드래그를 활성화하고 pointer capture 를 잡는다.
   * - 활성화되지 않은 채 pointerUp 이 오면 = 단순 클릭으로 간주, 선택을 유지한다.
   */
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeGesture | null>(null);
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
      const host = event.currentTarget;
      void (async () => {
        let nw = naturalByAsset.get(asset)?.w ?? 0;
        let nh = naturalByAsset.get(asset)?.h ?? 0;
        if (nw <= 0 || nh <= 0) {
          const url = assetUrlByName.get(asset);
          if (url) {
            const s = await loadImageNaturalSize(url);
            nw = s.w;
            nh = s.h;
          }
        }
        if (nw <= 0 || nh <= 0) {
          nw = PROP_DEFAULT_DROP_SIZE.w;
          nh = PROP_DEFAULT_DROP_SIZE.h;
        }
        const { w: sw, h: sh } = clampPropFootprintToEditorWorld(
          nw,
          nh,
          MAP_EDITOR_WORLD.w,
          MAP_EDITOR_WORLD.h,
          MAP_GRID_STEP_PX,
        );
        const { x: rawX, y: rawY } = editorMapClientToWorld(
          host,
          event.clientX,
          event.clientY,
          MAP_EDITOR_WORLD.w,
          MAP_EDITOR_WORLD.h,
        );
        const { dispW, dispH } = imageContainDisplaySize(sw, sh, nw, nh);
        const pos = snapClueRectToGrid(rawX, rawY, dispW, dispH, MAP_GRID_STEP_PX);
        onDropAsset(asset, pos.x, pos.y, sw, sh);
        setPlacementPreview(null);
      })();
    },
    [assetUrlByName, naturalByAsset, onDropAsset],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rs = resizeRef.current;
      if (rs && rs.pointerId === event.pointerId) {
        const host = containerRef.current;
        if (!host) return;
        const { x: px, y: py } = editorMapClientToWorld(
          host,
          event.clientX,
          event.clientY,
          MAP_EDITOR_WORLD.w,
          MAP_EDITOR_WORLD.h,
        );
        const raw = applyCornerResizeDelta(
          rs.handle,
          px,
          py,
          rs.startWorldX,
          rs.startWorldY,
          rs.initialCx,
          rs.initialCy,
          rs.initialW,
          rs.initialH,
          MAP_GRID_STEP_PX,
        );
        let snapped = snapClueRectToGrid(raw.x, raw.y, raw.w, raw.h, MAP_GRID_STEP_PX);
        const fp = clampPropFootprintToMapEditorCanvas(
          snapped.w,
          snapped.h,
          MAP_EDITOR_WORLD.w,
          MAP_EDITOR_WORLD.h,
          MAP_GRID_STEP_PX,
        );
        if (fp.w !== snapped.w || fp.h !== snapped.h) {
          snapped = snapClueRectToGrid(snapped.x, snapped.y, fp.w, fp.h, MAP_GRID_STEP_PX);
        }
        const resizedClue = clues.find((c) => c.tempId === rs.clueId);
        const natR = resizedClue ? naturalByAsset.get(resizedClue.asset) : undefined;
        const { dispW: dispRw, dispH: dispRh } = imageContainDisplaySize(
          snapped.w,
          snapped.h,
          natR?.w,
          natR?.h,
        );
        const posR = snapClueRectToGrid(snapped.x, snapped.y, dispRw, dispRh, MAP_GRID_STEP_PX);
        onUpdateClue(rs.clueId, {
          x: posR.x,
          y: posR.y,
          w: snapped.w,
          h: snapped.h,
        });
        return;
      }

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

      const cw = Math.max(1, drag.rectW);
      const ch = Math.max(1, drag.rectH);
      const worldDx = (dx / cw) * MAP_EDITOR_WORLD.w;
      const worldDy = (dy / ch) * MAP_EDITOR_WORLD.h;
      const rawX = drag.initialX + worldDx;
      const rawY = drag.initialY + worldDy;
      const moving = clues.find((c) => c.tempId === drag.clueId);
      const nat = moving ? naturalByAsset.get(moving.asset) : undefined;
      const { dispW, dispH } = imageContainDisplaySize(
        drag.initialW,
        drag.initialH,
        nat?.w,
        nat?.h,
      );
      const rectOnGrid = snapClueRectToGrid(rawX, rawY, dispW, dispH, MAP_GRID_STEP_PX);
      onUpdateClue(drag.clueId, { x: rectOnGrid.x, y: rectOnGrid.y });
      setPlacementPreview({
        x: rectOnGrid.x,
        y: rectOnGrid.y,
        w: drag.initialW,
        h: drag.initialH,
        asset: moving?.asset,
      });
    },
    [clues, naturalByAsset, onUpdateClue],
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
      const rs = resizeRef.current;
      if (rs && rs.pointerId === event.pointerId) {
        resizeRef.current = null;
        finishGesture(event.pointerId, event.currentTarget);
        setPlacementPreview(null);
        return;
      }
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
          const previewSize = asset ? naturalByAsset.get(asset) : undefined;
          const rawW = previewSize?.w ?? PROP_DEFAULT_DROP_SIZE.w;
          const rawH = previewSize?.h ?? PROP_DEFAULT_DROP_SIZE.h;
          const { w: previewW, h: previewH } = clampPropFootprintToEditorWorld(
            rawW,
            rawH,
            MAP_EDITOR_WORLD.w,
            MAP_EDITOR_WORLD.h,
            MAP_GRID_STEP_PX,
          );

          // 일부 브라우저는 dragover 시 getData()를 빈 문자열로 돌려준다.
          // 따라서 dataTransfer 타입과 현재 draggingAsset 상태를 함께 본다.
          const types = Array.from(event.dataTransfer.types ?? []);
          const isPropDrag =
            !!asset || types.includes(DRAG_TYPE_PROP) || types.includes("text/plain");
          if (!isPropDrag) {
            setPlacementPreview(null);
            return;
          }
          const host = event.currentTarget;
          const { x: rawX, y: rawY } = editorMapClientToWorld(
            host,
            event.clientX,
            event.clientY,
            MAP_EDITOR_WORLD.w,
            MAP_EDITOR_WORLD.h,
          );
          const { dispW, dispH } = imageContainDisplaySize(previewW, previewH, rawW, rawH);
          const pos = snapClueRectToGrid(rawX, rawY, dispW, dispH, MAP_GRID_STEP_PX);
          setPlacementPreview({
            x: pos.x,
            y: pos.y,
            w: previewW,
            h: previewH,
            asset: asset ?? undefined,
          });
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
            왼쪽 사이드바의 소품을 이곳으로 드래그해서 단서를 배치하세요.
          </div>
        ) : null}

        {placementPreview ? (
          (() => {
            const nat = placementPreview.asset
              ? naturalByAsset.get(placementPreview.asset)
              : undefined;
            const { dispW, dispH } = imageContainDisplaySize(
              placementPreview.w,
              placementPreview.h,
              nat?.w,
              nat?.h,
            );
            return (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/15"
                style={{
                  left: `${(placementPreview.x / MAP_EDITOR_WORLD.w) * 100}%`,
                  top: `${(placementPreview.y / MAP_EDITOR_WORLD.h) * 100}%`,
                  width: `${(dispW / MAP_EDITOR_WORLD.w) * 100}%`,
                  height: `${(dispH / MAP_EDITOR_WORLD.h) * 100}%`,
                }}
              />
            );
          })()
        ) : null}

        {clues.map((clue) => {
          const url = assetUrlByName.get(clue.asset);
          const nat = naturalByAsset.get(clue.asset);
          const { dispW, dispH } = imageContainDisplaySize(clue.w, clue.h, nat?.w, nat?.h);
          const innerLeftPct = ((clue.w - dispW) / (2 * clue.w)) * 100;
          const innerTopPct = ((clue.h - dispH) / (2 * clue.h)) * 100;
          const innerWidthPct = (dispW / clue.w) * 100;
          const innerHeightPct = (dispH / clue.h) * 100;
          const left = `${(clue.x / MAP_EDITOR_WORLD.w) * 100}%`;
          const top = `${(clue.y / MAP_EDITOR_WORLD.h) * 100}%`;
          const widthPct = `${(clue.w / MAP_EDITOR_WORLD.w) * 100}%`;
          const heightPct = `${(clue.h / MAP_EDITOR_WORLD.h) * 100}%`;
          const selected = clue.tempId === selectedClueId;
          return (
            <div
              key={clue.tempId}
              role="group"
              tabIndex={0}
              aria-label={`맵 소품: ${clue.asset}`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                onSelectClue(clue.tempId);
                const host = containerRef.current;
                if (!host) return;
                dragRef.current = {
                  clueId: clue.tempId,
                  pointerId: event.pointerId,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  initialX: clue.x,
                  initialY: clue.y,
                  initialW: clue.w,
                  initialH: clue.h,
                  rectW: host.clientWidth,
                  rectH: host.clientHeight,
                  activated: false,
                };
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none overflow-visible outline-none focus-visible:outline-none " +
                (selected ? "z-[5]" : "")
              }
              style={{ left, top, width: widthPct, height: heightPct }}
            >
              {url ? (
                <div
                  className={cn(
                    "absolute z-[1] overflow-hidden",
                    selected && "ring-2 ring-inset ring-[var(--accent)]",
                  )}
                  style={{
                    left: `${innerLeftPct}%`,
                    top: `${innerTopPct}%`,
                    width: `${innerWidthPct}%`,
                    height: `${innerHeightPct}%`,
                  }}
                >
                  <img
                    src={url}
                    alt={clue.asset}
                    draggable={false}
                    className="block h-full w-full object-contain [image-rendering:pixelated]"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "absolute z-[1] flex items-center justify-center overflow-hidden bg-yellow-300/80 text-[10px] text-yellow-900",
                    selected && "ring-2 ring-inset ring-[var(--accent)]",
                  )}
                  style={{
                    left: `${innerLeftPct}%`,
                    top: `${innerTopPct}%`,
                    width: `${innerWidthPct}%`,
                    height: `${innerHeightPct}%`,
                  }}
                >
                  ?
                </div>
              )}
              {selected ? (
                <div
                  className="pointer-events-none absolute z-20 overflow-visible"
                  style={{
                    left: `${innerLeftPct}%`,
                    top: `${innerTopPct}%`,
                    width: `${innerWidthPct}%`,
                    height: `${innerHeightPct}%`,
                  }}
                >
                  {RESIZE_HANDLES.map(({ id: hid, className: hClass, cursor }) => (
                    <button
                      key={hid}
                      type="button"
                      tabIndex={-1}
                      aria-label={`크기 조절 (${hid})`}
                      className={cn(
                        "pointer-events-auto absolute z-30 flex h-5 w-5 touch-none items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none",
                        hClass,
                      )}
                      style={{ cursor }}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.stopPropagation();
                        event.preventDefault();
                        const host = containerRef.current;
                        if (!host) return;
                        const p = editorMapClientToWorld(
                          host,
                          event.clientX,
                          event.clientY,
                          MAP_EDITOR_WORLD.w,
                          MAP_EDITOR_WORLD.h,
                        );
                        resizeRef.current = {
                          clueId: clue.tempId,
                          handle: hid,
                          pointerId: event.pointerId,
                          startWorldX: p.x,
                          startWorldY: p.y,
                          initialCx: clue.x,
                          initialCy: clue.y,
                          initialW: clue.w,
                          initialH: clue.h,
                        };
                        try {
                          host.setPointerCapture(event.pointerId);
                        } catch {
                          // ignore
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <span
                        className="pointer-events-none h-2.5 w-2.5 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--background)_88%,transparent)] bg-[var(--accent)] shadow-[0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-black/20"
                        aria-hidden
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    tabIndex={-1}
                    className="pointer-events-auto absolute right-0 top-0 z-30 flex h-5 w-5 translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--background)_88%,transparent)] bg-[var(--card-bg)] text-[var(--danger)] shadow-[0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-black/20"
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.stopPropagation();
                      event.preventDefault();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (clue.tempId === selectedClueId) onSelectClue(null);
                      onRemoveClue(clue.tempId);
                    }}
                  >
                    <Trash2 className="pointer-events-none h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClueNameContentFields({
  clue,
  onChange,
  nameInputAutoFocus,
  emphasizeEmptyName,
  submitAttempted,
}: {
  clue: DraftClue;
  onChange: (patch: Partial<DraftClue>) => void;
  nameInputAutoFocus?: boolean;
  /** true: 이름이 비면 항상 빨간 안내(오른쪽 패널). false: 아래 submitAttempted 가 true 일 때만 */
  emphasizeEmptyName: boolean;
  /** 모달에서 확인을 눌렀는데 이름이 비었을 때 true */
  submitAttempted?: boolean;
}) {
  const nameInvalid = !clue.name.trim();
  const showNameHint = nameInvalid && (emphasizeEmptyName || !!submitAttempted);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--accent)]" htmlFor={`clue-name-${clue.tempId}`}>
          단서 이름<span className="ml-0.5 text-[var(--danger)]">*</span>
        </label>
        <Input
          id={`clue-name-${clue.tempId}`}
          value={clue.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="예) 낡은 열쇠"
          aria-required
          autoFocus={nameInputAutoFocus}
          className={cn(
            showNameHint ? "border-[var(--danger)]/50 focus-visible:ring-[var(--danger)]/30" : "",
          )}
        />
        {showNameHint ? (
          <p className="text-[10px] text-[var(--danger)]/90 px-1">이름을 입력해주세요.</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--accent)]" htmlFor={`clue-content-${clue.tempId}`}>
          단서 내용
        </label>
        <Textarea
          id={`clue-content-${clue.tempId}`}
          value={clue.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="학생이 조사했을 때 보여줄 설명"
          rows={4}
        />
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
        맵에 배치된 소품을 클릭하면 여기서 단서 이름과 내용을 편집할 수 있어요.
      </aside>
    );
  }
  return (
    <aside className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--elevation-sm)]">
      <ClueNameContentFields clue={clue} onChange={onChange} emphasizeEmptyName />
    </aside>
  );
} 


/** border 제외 콘텐츠 박스 기준. 포인터가 맵 밖이어도 월드 좌표로 투영(에디터 밖 배치). */
function editorMapClientToWorld(
  host: HTMLElement,
  clientX: number,
  clientY: number,
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  const rect = host.getBoundingClientRect();
  const ox = rect.left + host.clientLeft;
  const oy = rect.top + host.clientTop;
  const cw = Math.max(1, host.clientWidth);
  const ch = Math.max(1, host.clientHeight);
  return {
    x: ((clientX - ox) / cw) * worldW,
    y: ((clientY - oy) / ch) * worldH,
  };
}
