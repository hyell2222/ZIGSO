"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PropAsset } from "@/lib/api/storage-props";

import {
  DRAG_TYPE_PROP,
  MAP_EDITOR_WORLD,
  PROP_DEFAULT_DROP_SIZE,
  RESOLUTION_LOCATION_TEMP_ID,
  type DraftCharacter,
  type DraftClue,
} from "./types";

type Props = {
  characters: DraftCharacter[];
  clues: DraftClue[];
  propAssets: PropAsset[];
  isLoadingAssets: boolean;
  onUpdateClue: (tempId: string, patch: Partial<DraftClue>) => void;
  onAddClue: (clue: Omit<DraftClue, "tempId">) => string;
  onRemoveClue: (tempId: string) => void;
  resolutionLocationName: string;
  onChangeResolutionLocationName: (value: string) => void;
  resolutionMission: string;
  onChangeResolutionMission: (value: string) => void;
  /** 정답 prop 표식 토글 (전체 시나리오에서 1개만). null = 모두 해제 */
  onSetResolutionTarget: (tempId: string | null) => void;
  /** 잠금 해제 아이템 표식 토글 (전체 시나리오에서 정확히 3개) */
  onToggleResolutionUnlockItem: (tempId: string, value: boolean) => void;
};

export function MapEditorStep({
  characters,
  clues,
  propAssets,
  isLoadingAssets,
  onAddClue,
  onUpdateClue,
  onRemoveClue,
  resolutionLocationName,
  onChangeResolutionLocationName,
  resolutionMission,
  onChangeResolutionMission,
  onSetResolutionTarget,
  onToggleResolutionUnlockItem,
}: Props) {
  /**
   * 활성 탭 식별자.
   * - 캐릭터 tempId 인 경우: 해당 캐릭터의 장소
   * - RESOLUTION_LOCATION_TEMP_ID 인 경우: 사건 해결 정답 장소
   */
  const [activeTabId, setActiveTabId] = useState<string>(
    () => characters[0]?.tempId ?? RESOLUTION_LOCATION_TEMP_ID,
  );
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);

  const isResolutionTab = activeTabId === RESOLUTION_LOCATION_TEMP_ID;

  useEffect(() => {
    if (isResolutionTab) return;
    if (!activeTabId && characters[0]) {
      setActiveTabId(characters[0].tempId);
    } else if (activeTabId && !characters.find((c) => c.tempId === activeTabId)) {
      // 활성화돼 있던 캐릭터가 사라지면 다른 캐릭터(없으면 정답 장소)로 이동
      setActiveTabId(characters[0]?.tempId ?? RESOLUTION_LOCATION_TEMP_ID);
    }
  }, [characters, activeTabId, isResolutionTab]);

  useEffect(() => {
    if (selectedClueId && !clues.find((c) => c.tempId === selectedClueId)) {
      setSelectedClueId(null);
    }
  }, [clues, selectedClueId]);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.tempId === activeTabId) ?? null,
    [characters, activeTabId],
  );

  const cluesInLocation = useMemo(
    () => clues.filter((c) => c.characterTempId === activeTabId),
    [clues, activeTabId],
  );

  const selectedClue = useMemo(
    () => clues.find((c) => c.tempId === selectedClueId) ?? null,
    [clues, selectedClueId],
  );

  const trimmedResolutionName = resolutionLocationName.trim();
  const resolutionLocationLabel = trimmedResolutionName
    ? `${trimmedResolutionName} (사건 해결의 장소)`
    : "사건 해결의 장소";

  const resolutionTargetClueId = useMemo(
    () => clues.find((c) => c.isResolutionTarget)?.tempId ?? null,
    [clues],
  );
  const resolutionTargetClue = useMemo(
    () => clues.find((c) => c.tempId === resolutionTargetClueId) ?? null,
    [clues, resolutionTargetClueId],
  );
  const unlockItemTempIds = useMemo(
    () => clues.filter((c) => c.isResolutionUnlockItem).map((c) => c.tempId),
    [clues],
  );
  const unlockItemCount = unlockItemTempIds.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. 장소마다 prop 배치하기</CardTitle>
      </CardHeader>
      <CardContent>
        {characters.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground,#94a3b8)]">
            먼저 2단계에서 캐릭터를 한 명 이상 추가해주세요.
          </p>
        ) : (
          <>
            <LocationTabs
              characters={characters}
              clues={clues}
              activeId={activeTabId}
              onSelect={(id) => {
                setActiveTabId(id);
                setSelectedClueId(null);
              }}
            />

            {isResolutionTab ? (
              <ResolutionMissionFields
                locationName={resolutionLocationName}
                onChangeLocationName={onChangeResolutionLocationName}
                mission={resolutionMission}
                onChangeMission={onChangeResolutionMission}
                targetClueName={resolutionTargetClue?.name ?? null}
                hasTarget={resolutionTargetClueId !== null}
                unlockItemCount={unlockItemCount}
              />
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
              <PropSidebar assets={propAssets} isLoading={isLoadingAssets} />

              <MapCanvas
                locationLabel={
                  isResolutionTab
                    ? resolutionLocationLabel
                    : activeCharacter
                      ? `${activeCharacter.name}의 장소`
                      : "장소"
                }
                clues={cluesInLocation}
                selectedClueId={selectedClueId}
                onSelectClue={setSelectedClueId}
                onDropAsset={(asset, x, y) => {
                  if (!activeTabId) return;
                  const newId = onAddClue({
                    characterTempId: activeTabId,
                    asset,
                    x,
                    y,
                    w: PROP_DEFAULT_DROP_SIZE.w,
                    h: PROP_DEFAULT_DROP_SIZE.h,
                    name: "",
                    content: "",
                  });
                  setSelectedClueId(newId);
                }}
                onMoveClue={(id, x, y) => onUpdateClue(id, { x, y })}
                onResizeClue={(id, patch) => onUpdateClue(id, patch)}
                propAssets={propAssets}
              />

              <ClueEditorPanel
                clue={selectedClue}
                isInResolutionLocation={isResolutionTab}
                unlockItemCount={unlockItemCount}
                onChange={(patch) => {
                  if (!selectedClue) return;
                  onUpdateClue(selectedClue.tempId, patch);
                }}
                onRemove={() => {
                  if (!selectedClue) return;
                  onRemoveClue(selectedClue.tempId);
                }}
                onSetAsTarget={(value) => {
                  if (!selectedClue) return;
                  onSetResolutionTarget(value ? selectedClue.tempId : null);
                }}
                onToggleUnlockItem={(value) => {
                  if (!selectedClue) return;
                  onToggleResolutionUnlockItem(selectedClue.tempId, value);
                }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Sub components ---------------- */

function LocationTabs({
  characters,
  clues,
  activeId,
  onSelect,
}: {
  characters: DraftCharacter[];
  clues: DraftClue[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const resolutionCount = clues.filter(
    (cl) => cl.characterTempId === RESOLUTION_LOCATION_TEMP_ID,
  ).length;
  const resolutionActive = activeId === RESOLUTION_LOCATION_TEMP_ID;

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
      {characters.map((c) => {
        const count = clues.filter((cl) => cl.characterTempId === c.tempId).length;
        const active = c.tempId === activeId;
        return (
          <button
            key={c.tempId}
            type="button"
            onClick={() => onSelect(c.tempId)}
            className={
              "rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--foreground)] hover:text-[var(--accent)]")
            }
          >
            <span className="font-semibold">{c.name}</span>
            <span className="ml-1 text-xs text-[var(--muted-foreground,#94a3b8)]">
              ({count})
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onSelect(RESOLUTION_LOCATION_TEMP_ID)}
        className={
          "rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors " +
          (resolutionActive
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-transparent text-[var(--foreground)] hover:text-[var(--accent)]")
        }
        title="사건 해결 단계에서 학생이 이름을 맞히면 열리는 정답 장소"
      >
        <span className="font-semibold">사건 해결의 장소</span>
        <span className="ml-1 text-xs text-[var(--muted-foreground,#94a3b8)]">
          ({resolutionCount})
        </span>
      </button>
    </div>
  );
}

function ResolutionMissionFields({
  locationName,
  onChangeLocationName,
  mission,
  onChangeMission,
  targetClueName,
  hasTarget,
  unlockItemCount,
}: {
  locationName: string;
  onChangeLocationName: (value: string) => void;
  mission: string;
  onChangeMission: (value: string) => void;
  /** 현재 정답 prop 으로 표시된 단서 이름 (없으면 null) */
  targetClueName: string | null;
  hasTarget: boolean;
  /** 잠금 해제 아이템으로 표시된 단서 개수 */
  unlockItemCount: number;
}) {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-[var(--accent)]/40 bg-[rgba(201,209,107,0.08)] p-4">
      <p className="text-[11px] leading-snug text-[var(--muted-foreground,#94a3b8)]">
        사건 해결 단계의 정답 정보입니다. 학생은 <b>장소 이름 입력 → 정답
        prop 조사 → 잠금 해제 아이템 3개 제출</b> 순서로 미션을 완료합니다.
        <b> 장소</b>를 비우면 정답 장소 없이 저장됩니다.
      </p>

      <ResolutionField
        label="장소 (1단계 정답)"
        value={locationName}
        onChange={onChangeLocationName}
        placeholder="예) 학교 지하실"
        hint="학생이 정확히 입력하면 정답 장소의 맵이 열립니다."
      />
      <ResolutionField
        label="미션"
        value={mission}
        onChange={onChangeMission}
        placeholder="예) 보물상자 열기"
        hint="맵 상단에 미션 목표로 표시됩니다."
      />

      <div className="grid gap-2 rounded border border-dashed border-[var(--border)] p-2 text-[11px] sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
            정답 prop (2단계)
          </p>
          <p
            className={
              hasTarget
                ? "mt-1 font-semibold text-[var(--foreground)]"
                : "mt-1 text-red-300"
            }
          >
            {hasTarget
              ? targetClueName?.trim() || "(이름 없는 prop)"
              : "정답 장소 단서 중 1개를 골라 표시하세요"}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted-foreground,#94a3b8)]">
            정답 장소 맵에서 학생이 직접 조사해 찾아냅니다 (3번의 기회).
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
            잠금 해제 아이템 (3단계)
          </p>
          <p
            className={
              unlockItemCount === 3
                ? "mt-1 font-semibold text-[var(--foreground)]"
                : "mt-1 text-red-300"
            }
          >
            {unlockItemCount} / 3 개 표시됨
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted-foreground,#94a3b8)]">
            어느 장소의 단서든 정확히 3개를 골라 표시하면, 학생이 모달에서
            제출해 잠금을 해제합니다 (3번의 기회).
          </p>
        </div>
      </div>
    </div>
  );
}

function ResolutionField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-[var(--accent)]">
        {label}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hint ? (
        <p className="text-[11px] leading-snug text-[var(--muted-foreground,#94a3b8)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PropSidebar({ assets, isLoading }: { assets: PropAsset[]; isLoading: boolean }) {
  return (
    <aside className="rounded-md border border-[var(--border)] bg-[rgba(15,23,42,0.45)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Prop ({assets.length})
        </h3>
      </div>
      {isLoading ? (
        <p className="text-xs text-[var(--muted-foreground,#94a3b8)]">불러오는 중…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground,#94a3b8)]">
          사용 가능한 prop 이 없어요. Supabase Storage 의 prop bucket 을 확인해주세요.
        </p>
      ) : (
        <ul className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {assets.map((p) => (
            <li key={p.asset}>
              <PropDraggable asset={p} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-snug text-[var(--muted-foreground,#94a3b8)]">
        썸네일을 맵 위로 드래그해서 놓으면 단서가 생성돼요.
      </p>
    </aside>
  );
}

function PropDraggable({ asset }: { asset: PropAsset }) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE_PROP, asset.asset);
        event.dataTransfer.setData("text/plain", asset.asset);
        event.dataTransfer.effectAllowed = "copy";
      }}
      className="group flex cursor-grab flex-col items-center gap-1 rounded border border-[var(--border)] bg-[rgba(36,40,43,0.7)] p-2 hover:border-[var(--accent)]"
      title={asset.asset}
    >
      <div className="flex h-14 w-14 items-center justify-center">
        <img
          src={asset.url}
          alt={asset.asset}
          draggable={false}
          className="max-h-full max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <span className="w-full truncate text-center text-[10px] text-[var(--foreground)] opacity-80 group-hover:opacity-100">
        {asset.asset}
      </span>
    </div>
  );
}

type Sign = -1 | 0 | 1;

type DragState = {
  clueId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  rectW: number;
  rectH: number;
  activated: boolean;
};

type ResizeState = {
  clueId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
  signX: Sign;
  signY: Sign;
  rectW: number;
  rectH: number;
};

const MIN_PROP_SIZE = 16;
const DRAG_THRESHOLD = 4; // px

function MapCanvas({
  locationLabel,
  clues,
  selectedClueId,
  propAssets,
  onSelectClue,
  onDropAsset,
  onMoveClue,
  onResizeClue,
}: {
  locationLabel: string;
  clues: DraftClue[];
  selectedClueId: string | null;
  propAssets: PropAsset[];
  onSelectClue: (id: string | null) => void;
  onDropAsset: (asset: string, x: number, y: number) => void;
  onMoveClue: (id: string, x: number, y: number) => void;
  onResizeClue: (
    id: string,
    patch: { x: number; y: number; w: number; h: number },
  ) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /**
   * 단순 클릭(=선택만)과 드래그(=이동) 를 구분하기 위한 상태.
   * - pointerDown 시점에는 _대기_ 상태로만 기록한다 (selection 만 즉시 반영).
   * - 임계값(DRAG_THRESHOLD) 이상 움직여야 비로소 드래그를 활성화하고 pointer capture 를 잡는다.
   * - 활성화되지 않은 채 pointerUp 이 오면 = 단순 클릭으로 간주, 선택을 유지한다.
   */
  const dragRef = useRef<DragState | null>(null);
  /** 가장자리 핸들 드래그 상태 (resize). pointerDown 즉시 활성화 (임계값 없음). */
  const resizeRef = useRef<ResizeState | null>(null);
  /** 드래그/리사이즈 직후 발생할 click 이벤트로 인한 deselect 차단용 가드 */
  const justDraggedRef = useRef(false);

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
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clampWithin(event.clientX - rect.left, MAP_EDITOR_WORLD.w, rect.width);
      const y = clampWithin(event.clientY - rect.top, MAP_EDITOR_WORLD.h, rect.height);
      onDropAsset(asset, x, y);
    },
    [onDropAsset],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // 1) 리사이즈 우선 처리
      const resize = resizeRef.current;
      if (resize && resize.pointerId === event.pointerId) {
        const worldDx = ((event.clientX - resize.startClientX) / resize.rectW) * MAP_EDITOR_WORLD.w;
        const worldDy = ((event.clientY - resize.startClientY) / resize.rectH) * MAP_EDITOR_WORLD.h;

        const newW =
          resize.signX === 0
            ? resize.initialW
            : Math.min(
                MAP_EDITOR_WORLD.w,
                Math.max(MIN_PROP_SIZE, resize.initialW + resize.signX * worldDx),
              );
        const newH =
          resize.signY === 0
            ? resize.initialH
            : Math.min(
                MAP_EDITOR_WORLD.h,
                Math.max(MIN_PROP_SIZE, resize.initialH + resize.signY * worldDy),
              );

        let newX = resize.initialX + (resize.signX * (newW - resize.initialW)) / 2;
        let newY = resize.initialY + (resize.signY * (newH - resize.initialH)) / 2;
        // 월드 밖으로 나가지 않게 중심 좌표 clamp
        newX = Math.min(MAP_EDITOR_WORLD.w - newW / 2, Math.max(newW / 2, newX));
        newY = Math.min(MAP_EDITOR_WORLD.h - newH / 2, Math.max(newH / 2, newY));

        onResizeClue(resize.clueId, { x: newX, y: newY, w: newW, h: newH });
        return;
      }

      // 2) 본체 드래그 (이동)
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
      const x = Math.min(MAP_EDITOR_WORLD.w, Math.max(0, drag.initialX + worldDx));
      const y = Math.min(MAP_EDITOR_WORLD.h, Math.max(0, drag.initialY + worldDy));
      onMoveClue(drag.clueId, x, y);
    },
    [onMoveClue, onResizeClue],
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
      const resize = resizeRef.current;
      if (resize && resize.pointerId === event.pointerId) {
        finishGesture(event.pointerId, event.currentTarget);
        resizeRef.current = null;
        return;
      }
      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        if (drag.activated) finishGesture(event.pointerId, event.currentTarget);
        dragRef.current = null;
      }
    },
    [finishGesture],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground,#94a3b8)]">
        <span className="font-medium text-[var(--foreground)]">{locationLabel}</span>
        <span>
          월드 {MAP_EDITOR_WORLD.w}×{MAP_EDITOR_WORLD.h}
        </span>
      </div>
      <div
        ref={containerRef}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          if (justDraggedRef.current) return;
          if (event.target === event.currentTarget) onSelectClue(null);
        }}
        className="relative w-full overflow-hidden rounded-md border border-[var(--border)] bg-[#0f172a]"
        style={{
          aspectRatio: `${MAP_EDITOR_WORLD.w} / ${MAP_EDITOR_WORLD.h}`,
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: `${100 / (MAP_EDITOR_WORLD.w / 40)}% ${100 / (MAP_EDITOR_WORLD.h / 40)}%`,
        }}
      >
        {clues.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--muted-foreground,#94a3b8)]">
            왼쪽 사이드바의 prop 을 이곳으로 드래그해서 단서를 배치하세요.
          </div>
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
                <img
                  src={url}
                  alt={clue.asset}
                  draggable={false}
                  className="h-full w-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded bg-yellow-300/80 text-[10px] text-yellow-900">
                  ?
                </div>
              )}
              {clue.name ? (
                <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[rgba(15,23,42,0.85)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
                  {clue.name}
                </div>
              ) : null}

              {selected
                ? RESIZE_HANDLE_DIRS.map(({ signX, signY, cursor }) => (
                    <ResizeHandle
                      key={`${signX}:${signY}`}
                      signX={signX}
                      signY={signY}
                      cursor={cursor}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.stopPropagation();
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        // 진행 중이던 드래그는 취소 (handle 위에서 시작했을 수 있음)
                        dragRef.current = null;
                        resizeRef.current = {
                          clueId: clue.tempId,
                          pointerId: event.pointerId,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          initialX: clue.x,
                          initialY: clue.y,
                          initialW: clue.w,
                          initialH: clue.h,
                          signX,
                          signY,
                          rectW: rect.width,
                          rectH: rect.height,
                        };
                        try {
                          containerRef.current?.setPointerCapture(event.pointerId);
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Resize handles ---------------- */

const RESIZE_HANDLE_DIRS: Array<{ signX: Sign; signY: Sign; cursor: string }> = [
  { signX: -1, signY: -1, cursor: "nwse-resize" },
  { signX: 1, signY: -1, cursor: "nesw-resize" },
  { signX: -1, signY: 1, cursor: "nesw-resize" },
  { signX: 1, signY: 1, cursor: "nwse-resize" },
];

function ResizeHandle({
  signX,
  signY,
  cursor,
  onPointerDown,
}: {
  signX: Sign;
  signY: Sign;
  cursor: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const left = signX === -1 ? "0%" : signX === 0 ? "50%" : "100%";
  const top = signY === -1 ? "0%" : signY === 0 ? "50%" : "100%";
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      className="absolute z-10 h-2.5 w-2.5 rounded-sm border border-[#0f172a] bg-[var(--accent)]"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        cursor,
        touchAction: "none",
      }}
    />
  );
}

function ClueEditorPanel({
  clue,
  isInResolutionLocation,
  unlockItemCount,
  onChange,
  onRemove,
  onSetAsTarget,
  onToggleUnlockItem,
}: {
  clue: DraftClue | null;
  /** 현재 활성 탭이 "사건 해결의 장소" 인지 — 정답 prop 토글은 여기서만 의미 있음 */
  isInResolutionLocation: boolean;
  /** 시나리오 전체의 잠금 해제 아이템 개수 (3 도달 시 새 토글 차단) */
  unlockItemCount: number;
  onChange: (patch: Partial<DraftClue>) => void;
  onRemove: () => void;
  onSetAsTarget: (value: boolean) => void;
  onToggleUnlockItem: (value: boolean) => void;
}) {
  if (!clue) {
    return (
      <aside className="rounded-md border border-dashed border-[var(--border)] bg-[rgba(15,23,42,0.45)] p-4 text-center text-xs text-[var(--muted-foreground,#94a3b8)]">
        맵에 배치된 prop 을 클릭하면 여기서 단서 이름과 내용을 편집할 수 있어요.
      </aside>
    );
  }
  const isTarget = clue.isResolutionTarget === true;
  const isUnlock = clue.isResolutionUnlockItem === true;
  const unlockToggleDisabled = !isUnlock && unlockItemCount >= 3;
  return (
    <aside className="space-y-3 rounded-md border border-[var(--border)] bg-[rgba(15,23,42,0.45)] p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          단서 편집
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-red-300 hover:bg-[rgba(239,68,68,0.15)]"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="text-[11px] text-[var(--muted-foreground,#94a3b8)]">
        에셋: <span className="text-[var(--foreground)]">{clue.asset}</span>
      </div>

      <div className="space-y-2 rounded border border-[var(--accent)]/30 bg-[rgba(201,209,107,0.06)] p-2">
        <label
          className={
            "flex items-start gap-2 text-[11px] " +
            (isInResolutionLocation
              ? "text-[var(--foreground)]"
              : "cursor-not-allowed text-[var(--muted-foreground,#94a3b8)]")
          }
        >
          <input
            type="checkbox"
            checked={isTarget}
            disabled={!isInResolutionLocation}
            onChange={(event) => onSetAsTarget(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <b>정답 prop (2단계)</b>
            <span className="ml-1 text-[10px] text-[var(--muted-foreground,#94a3b8)]">
              {isInResolutionLocation
                ? "정답 장소에서 1개만"
                : "정답 장소 단서에서만 설정 가능"}
            </span>
          </span>
        </label>
        <label
          className={
            "flex items-start gap-2 text-[11px] " +
            (unlockToggleDisabled
              ? "cursor-not-allowed text-[var(--muted-foreground,#94a3b8)]"
              : "text-[var(--foreground)]")
          }
        >
          <input
            type="checkbox"
            checked={isUnlock}
            disabled={unlockToggleDisabled}
            onChange={(event) => onToggleUnlockItem(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <b>잠금 해제 아이템 (3단계)</b>
            <span className="ml-1 text-[10px] text-[var(--muted-foreground,#94a3b8)]">
              현재 {unlockItemCount}/3
              {unlockToggleDisabled ? " · 다른 표시를 해제 후 가능" : ""}
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-[var(--accent)]">
          단서 이름
        </label>
        <Input
          value={clue.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="예) 낡은 열쇠"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-[var(--accent)]">
          단서 내용
        </label>
        <Textarea
          value={clue.content}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder="학생이 조사했을 때 보여줄 설명"
          rows={5}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="너비"
          value={clue.w}
          onChange={(v) => onChange({ w: v })}
          min={16}
          max={400}
        />
        <NumberField
          label="높이"
          value={clue.h}
          onChange={(v) => onChange({ h: v })}
          min={16}
          max={400}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={Math.round(clue.x)}
          onChange={(v) => onChange({ x: v })}
          min={0}
          max={MAP_EDITOR_WORLD.w}
        />
        <NumberField
          label="Y"
          value={Math.round(clue.y)}
          onChange={(v) => onChange({ y: v })}
          min={0}
          max={MAP_EDITOR_WORLD.h}
        />
      </div>
    </aside>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="space-y-1 text-[11px] uppercase tracking-wider text-[var(--accent)]">
      <span>{label}</span>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) {
            const clamped = Math.min(max, Math.max(min, parsed));
            onChange(clamped);
          }
        }}
      />
    </label>
  );
}

/* ---------------- helpers ---------------- */

function clampWithin(localPx: number, worldDim: number, renderedDim: number) {
  if (renderedDim <= 0) return 0;
  const ratio = localPx / renderedDim;
  const world = ratio * worldDim;
  return Math.min(worldDim, Math.max(0, world));
}
