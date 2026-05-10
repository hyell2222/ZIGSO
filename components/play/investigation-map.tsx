"use client";

import * as Phaser from "phaser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAP_EDITOR_SPACE,
  mapPropTextureKey,
  preloadMapPropImages,
  setMapPropTexturesNearest,
} from "@/lib/assets/map-props";
import {
  MAP_GRID_LINE,
  MAP_GRID_STEP_PX,
  MAP_LOCATION_CORNER_RADIUS,
  MAP_LOCATION_FILL,
  MAP_LOCATION_STROKE,
  MAP_WORLD_BACKGROUND,
  MAP_WORLD_BACKGROUND_HEX,
  MAP_WORLD_OUTER_STROKE,
  snapDimensionToOddTileCount,
  snapWorldPointToNearestTileCenter,
} from "@/lib/map-location-style";
import { Package, X } from "lucide-react";

import type { CaseClueForMap, CaseLocationForMap } from "@/lib/api/play";
import {
  clampPropFootprintToMapEditorCanvas,
  mapPropDisplayEditorPx,
} from "@/lib/map-prop-pixel-size";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

/** 맵 기본 가로·세로 (장소/단서가 더 나가면 computeWorldSize에서 확장). `MAP_GRID_STEP_PX` 배수·타일 수 홀수 */
const DEFAULT_WORLD_W = 2000;
const DEFAULT_WORLD_H = 1392;
/** 플레이어 스프라이트 한 변 길이(픽셀) */
const PLAYER_SIZE = 28;
/** 이동 목표 속도(픽셀/초) — Matter는 Arcade와 달리 동일 수치여도 더 빨리 느껴져 다소 낮춤 */
const SPEED = 5;
/** 저장 풋프린트보다 큰 원본 텍스처 여유 — `computeWorldSize` 반경 추정 */
const MAP_PROP_TEXTURE_WORLD_HALO = 240;

/** Phaser load.font / Text 에서 쓰는 폰트 키 (preload에서 등록) */
const FONT_KEY = "DungGeunMo";
/** public 폰트 URL — Turbopack에서 otf 직접 import 대신 정적 경로 사용 */
const FONT_URL = "/assets/DungGeunMo.otf";

/**
 * 장소 박스를 격자로 자동 배치
 * (장소 개수에 맞춰 열·행 수를 잡고, 셀 안에서 중앙 정렬)
 */
function autoLayoutLocation(index: number, total: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / cols));
  const pad = 100;
  const cellW = (DEFAULT_WORLD_W - pad * 2) / cols;
  const cellH = (DEFAULT_WORLD_H - pad * 2) / rows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gap = 32;
  const w = Math.min(MAP_EDITOR_SPACE.w, Math.max(320, cellW - gap));
  const h = Math.min(460, Math.max(240, cellH - gap));
  const x = pad + col * cellW + (cellW - w) / 2;
  const y = pad + row * cellH + (cellH - h) / 2;
  return { x, y, w, h };
}

/** 화면에 그릴 장소 하나의 사각형 + 메타 */
type LocationLayout = { id: string; name: string | null; x: number; y: number; w: number; h: number };

/** placeholder 표시용 텍스처 키 (asset 미지정 단서에 쓰임) */
const PLACEHOLDER_TEXTURE_KEY = "map_prop:__placeholder__";

type ClueEntry = {
  id: string;
  locationId: string;
  locationName: string;
  asset: string | null;
  propLabel: string;
  x: number;
  y: number;
  /** `props.w`/`h` 를 장소 스케일로 월드 px 에 투영한 표시 크기 */
  w: number;
  h: number;
  /** 한 단서 = 한 엔티티 (props 기반 배치). clues.length 는 항상 1. */
  clues: CaseClueForMap[];
};

type ActiveClueState = {
  clueName: string;
  locationName: string;
} | null;

type PlacedClueObject = {
  entry: ClueEntry;
  /** 시각 + Matter 정적 몸체(다각형 실루엣) — Arcade 사각 히트박스 없음 */
  image: Phaser.GameObjects.Image;
};

/** phaser 공개 타입에 Matter 믹스인이 완전히 올라오지 않아 이동·회전 고정용으로만 사용 */
type MatterSpritePlayer = Phaser.GameObjects.Sprite & {
  setFixedRotation(value?: boolean): void;
  setFrictionAir(value: number): void;
  setVelocity(x: number, y: number): void;
};

/**
 * props 가 없는 단서들을 해당 장소 박스 안에 격자로 자동 배치.
 * (창작 단계에서 props 를 채워 넣지 않은 임시 단서를 위한 폴백)
 */
function autoPlaceInsideLocation(
  L: LocationLayout,
  index: number,
  total: number,
): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / cols));
  const pad = Math.min(L.w, L.h) * 0.12;
  const cellW = (L.w - pad * 2) / cols;
  const cellH = (L.h - pad * 2) / rows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: L.x + pad + cellW * col + cellW / 2,
    y: L.y + pad + cellH * row + cellH / 2,
  };
}

/** 편집기 월드(848×592) 한도까지 — 에디터에서 저장한 크기와 플레이 스케일이 맞도록 */
function cluePropsDisplayEditorPx(props: CaseClueForMap["props"]): { w: number; h: number } {
  const raw = mapPropDisplayEditorPx(props);
  return clampPropFootprintToMapEditorCanvas(
    raw.w,
    raw.h,
    MAP_EDITOR_SPACE.w,
    MAP_EDITOR_SPACE.h,
    MAP_GRID_STEP_PX,
  );
}

function buildClueEntries(layouts: LocationLayout[], clues: CaseClueForMap[]): ClueEntry[] {
  const layoutById = new Map(layouts.map((l) => [l.id, l]));

  const fallbackCounts = new Map<string, number>();
  const fallbackTotals = new Map<string, number>();
  for (const clue of clues) {
    if (clue.props) continue;
    const key = clue.location_id ?? "__none__";
    fallbackTotals.set(key, (fallbackTotals.get(key) ?? 0) + 1);
  }

  const out: ClueEntry[] = [];
  clues.forEach((clue) => {
    const L = clue.location_id ? layoutById.get(clue.location_id) : undefined;
    const locationName = L?.name?.trim() || "장소";

    const asset = clue.props?.asset?.trim() || null;

    // 어드민은 단서의 x/y 및 표시 크기 w/h(px, MAP_EDITOR_SPACE 기준)를 props 에 저장한다.
    // 학생 맵은 여러 장소를 한 월드에 배치하므로, 각 장소 박스 L.w/L.h 크기에 맞춰
    // 편집기 좌표를 장소 내부 좌표로 선형 매핑해야 소품이 장소 안에 그려진다.
    let cx: number;
    let cy: number;
    let w: number;
    let h: number;
    const hasEditorCoords =
      !!clue.props &&
      Number.isFinite(clue.props.x) &&
      Number.isFinite(clue.props.y);

    if (hasEditorCoords && L) {
      const sx = L.w / MAP_EDITOR_SPACE.w;
      const sy = L.h / MAP_EDITOR_SPACE.h;
      cx = L.x + clue.props!.x * sx;
      cy = L.y + clue.props!.y * sy;
      const base = cluePropsDisplayEditorPx(clue.props);
      w = Math.max(8, base.w * sx);
      h = Math.max(8, base.h * sy);
    } else if (hasEditorCoords) {
      // 장소 정보가 없으면 스케일 불가 → 편집기 좌표를 그대로 사용.
      cx = clue.props!.x;
      cy = clue.props!.y;
      const size = cluePropsDisplayEditorPx(clue.props);
      w = size.w;
      h = size.h;
    } else if (L) {
      const key = clue.location_id ?? "__none__";
      const i = fallbackCounts.get(key) ?? 0;
      const total = fallbackTotals.get(key) ?? 1;
      const placed = autoPlaceInsideLocation(L, i, total);
      fallbackCounts.set(key, i + 1);
      cx = placed.x;
      cy = placed.y;
      const sx = L.w / MAP_EDITOR_SPACE.w;
      const sy = L.h / MAP_EDITOR_SPACE.h;
      const size = cluePropsDisplayEditorPx(clue.props);
      w = Math.max(8, size.w * sx);
      h = Math.max(8, size.h * sy);
    } else {
      cx = DEFAULT_WORLD_W / 2;
      cy = DEFAULT_WORLD_H / 2;
      const size = cluePropsDisplayEditorPx(clue.props);
      w = size.w;
      h = size.h;
    }

    // 편집기에서 저장한 좌표는 이미 격자/경계에 맞춰졌다. 타일 중심 스냅을 다시 쓰면
    // 맵 끝 근처 소품이 안쪽으로 밀린다.
    if (!hasEditorCoords) {
      const onTile = snapWorldPointToNearestTileCenter(cx, cy, MAP_GRID_STEP_PX);
      cx = onTile.x;
      cy = onTile.y;
    }

    out.push({
      id: `clue:${clue.id}`,
      locationId: clue.location_id ?? "",
      locationName,
      asset,
      propLabel: clue.name?.trim() || "이름 없는 단서",
      x: cx,
      y: cy,
      w,
      h,
      clues: [clue],
    });
  });
  return out;
}

function rectsTouchOrOverlap(a: Phaser.Geom.Rectangle, b: Phaser.Geom.Rectangle) {
  return a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;
}

/** `clue.props` 의 w/h 를 월드에 반영한 표시 크기(entry.w/h)로 그린다. */
function placeLocationProps2D(scene: Phaser.Scene, entries: ClueEntry[]) {
  const objects: PlacedClueObject[] = [];
  for (const entry of entries) {
    const textureKey = entry.asset ? mapPropTextureKey(entry.asset) : PLACEHOLDER_TEXTURE_KEY;
    // 텍스처가 로딩되지 않았으면 placeholder 로 대체 (404 에셋 보호)
    const safeKey = scene.textures.exists(textureKey) ? textureKey : PLACEHOLDER_TEXTURE_KEY;

    const image = scene.matter.add.image(entry.x, entry.y, safeKey, undefined, {
      isStatic: true,
    });
    image.setDisplaySize(entry.w, entry.h);
    image.setDepth(1);
    image.setData("clueEntry", entry);
    objects.push({ entry, image });
  }
  return objects;
}

/** 장소 목록 → autoLayout 으로 LocationLayout 배열 생성 (좌표는 자동 격자 배치) */
function buildLocationLayouts(locations: CaseLocationForMap[]): LocationLayout[] {
  const sorted = [...locations].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((loc, i) => {
    const auto = autoLayoutLocation(i, sorted.length);
    return { id: loc.id, name: loc.name, ...auto };
  });
}

/** 인벤토리에서 다시 열 때: 원래 소품 정보를 유지하되 본문에는 해당 clue만 표시 */
function clueEntryForSingleClue(
  clue: CaseClueForMap,
  clueEntries: ClueEntry[],
  layouts: LocationLayout[],
): ClueEntry {
  const entry = clueEntries.find((e) => e.clues.some((c) => c.id === clue.id));
  if (entry) {
    return { ...entry, id: `${entry.id}:inv:${clue.id}`, clues: [clue] };
  }
  const L = layouts.find((l) => l.id === clue.location_id);
  const fallback = cluePropsDisplayEditorPx(clue.props);
  return {
    id: `inv:${clue.id}`,
    locationId: clue.location_id ?? "",
    locationName: L?.name?.trim() ?? "장소",
    asset: clue.props?.asset?.trim() ?? null,
    propLabel: clue.name?.trim() || "이름 없는 단서",
    x: 0,
    y: 0,
    w: fallback.w,
    h: fallback.h,
    clues: [clue],
  };
}

/** 모든 장소 사각형을 감싼 축정렬 경계 (플레이 이동 제한·Matter 월드 벽에 사용) */
function layoutClusterBounds(layouts: LocationLayout[]): { x: number; y: number; w: number; h: number } | null {
  if (layouts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const L of layouts) {
    minX = Math.min(minX, L.x);
    minY = Math.min(minY, L.y);
    maxX = Math.max(maxX, L.x + L.w);
    maxY = Math.max(maxY, L.y + L.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** 기본 월드보다 장소·단서가 밖으로 나가면 bounds 확장 */
function computeWorldSize(layouts: LocationLayout[], entries: ClueEntry[]) {
  let w = DEFAULT_WORLD_W;
  let h = DEFAULT_WORLD_H;
  for (const L of layouts) {
    w = Math.max(w, L.x + L.w + 120);
    h = Math.max(h, L.y + L.h + 120);
  }
  for (const e of entries) {
    const ext = Math.max(e.w, e.h, MAP_GRID_STEP_PX) * 0.5 + MAP_PROP_TEXTURE_WORLD_HALO;
    w = Math.max(w, e.x + ext + 120);
    h = Math.max(h, e.y + ext + 120);
  }
  return {
    w: snapDimensionToOddTileCount(w, MAP_GRID_STEP_PX),
    h: snapDimensionToOddTileCount(h, MAP_GRID_STEP_PX),
  };
}

/** React 래퍼 props — Phaser 인스턴스는 내부 useEffect에서만 생성 */
type InvestigationMapProps = {
  className?: string;
  variant?: "embedded" | "fullscreen";
  locations?: CaseLocationForMap[];
  clues?: CaseClueForMap[];
  onClueProgress?: (found: number, total: number) => void;
  /** 부모에서 단서 인벤토리 상태를 유지하고 싶을 때 초기값으로 전달 */
  initialDiscoveredClueIds?: string[];
  /** 발견 단서 변경을 부모로 전달 (phase 전환 후 briefing 인벤토리 표시용) */
  onDiscoveredClueIdsChange?: (ids: string[]) => void;
  /**
   * 우측 인벤토리 패널에 표시할 단서를 외부에서 제어한다.
   * - 미지정(undefined): F 로 직접 수집한 단서들(`discoveredClueIds`)만 노출 (investigation phase 기본).
   * - 지정 시: 해당 배열을 그대로 노출 (호스트/특수 UI에서 팀 전체 단서를 모아 보여줄 때).
   *   배열이 빈 배열이면 "수집한 단서 없음" 안내가 뜬다.
   */
  inventoryClues?: CaseClueForMap[];
  /** 최종 미션: 미션 타겟 조사 모드 — 지정 시 E 키로 타겟 제출 */
};

/** 풀스크린 시 부모 div 실제 크기로 캔버스 맞춤 (getBoundingClientRect + 최소값 보정) */
function readHostSize(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  let w = Math.max(320, Math.floor(r.width));
  let h = Math.max(240, Math.floor(r.height));
  if (typeof window !== "undefined") {
    if (w < 120) w = Math.max(320, window.innerWidth);
    if (h < 120) h = Math.max(240, window.innerHeight);
  }
  return { width: w, height: h };
}

/** 탐색 맵 UI: 상태줄 + Phaser 호스트 div + 도움말 문구 */
export function InvestigationMap({
  className,
  variant = "embedded",
  locations: locationsProp,
  clues: cluesProp,
  onClueProgress,
  initialDiscoveredClueIds,
  onDiscoveredClueIdsChange,
  inventoryClues,
}: InvestigationMapProps) {
  const locations = useMemo(() => locationsProp ?? [], [locationsProp]);
  const clues = useMemo(() => cluesProp ?? [], [cluesProp]);

  /** Phaser Game 이 붙는 DOM (고정 높이 embedded / flex-1 fullscreen) */
  const hostRef = useRef<HTMLDivElement>(null);
  /** 콜백은 매 렌더마다 바뀔 수 있어 ref로 최신만 유지 (effect 의존성 최소화) */
  const progressRef = useRef(onClueProgress);
  const modalOpenRef = useRef(false);
  const [activeClue, setActiveClue] = useState<ActiveClueState>(null);
  const [selectedClue, setSelectedClue] = useState<ClueEntry | null>(null);
  /** F로 조사해 획득한 clue id (인벤토리 표시용) */
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>(initialDiscoveredClueIds ?? []);
  const registerDiscoveriesRef = useRef<(ids: string[]) => void>(() => {});

  /** locations/clues 가 바뀔 때만 맵 레이아웃·월드 크기 재계산 */
  const layoutData = useMemo(() => {
    const layouts = buildLocationLayouts(locations);
    const clueEntries = buildClueEntries(layouts, clues);
    const { w, h } = computeWorldSize(layouts, clueEntries);
    return { layouts, clueEntries, worldW: w, worldH: h };
  }, [locations, clues]);

  const totalClue = clues.length;

  const discoveredClues = useMemo(() => {
    const byId = new Map(clues.map((c) => [c.id, c]));
    return discoveredClueIds
      .map((id) => byId.get(id))
      .filter((c): c is CaseClueForMap => c != null)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [clues, discoveredClueIds]);

  /**
   * 인벤토리 패널에 실제로 그려질 단서 목록.
   * `inventoryClues` 가 명시되면 그 값을 우선,
   * 아니면 내가 직접 발견한 `discoveredClues` 만 노출.
   */
  const inventoryDisplayClues = useMemo(() => {
    const source = inventoryClues ?? discoveredClues;
    return [...source].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [inventoryClues, discoveredClues]);

  /** 부모에 전달하는 onClueProgress 항상 최신 참조 유지 */
  useEffect(() => {
    progressRef.current = onClueProgress;
  }, [onClueProgress]);

  useEffect(() => {
    registerDiscoveriesRef.current = (ids: string[]) => {
      if (ids.length === 0) return;
      setDiscoveredClueIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return Array.from(next);
      });
    };
  }, []);

  useEffect(() => {
    modalOpenRef.current = selectedClue !== null;
  }, [selectedClue]);

  useEffect(() => {
    progressRef.current?.(discoveredClueIds.length, totalClue);
  }, [discoveredClueIds.length, totalClue]);

  useEffect(() => {
    onDiscoveredClueIdsChange?.(discoveredClueIds);
  }, [discoveredClueIds, onDiscoveredClueIdsChange]);

  useEffect(() => {
    if (!initialDiscoveredClueIds) return;
    setDiscoveredClueIds(initialDiscoveredClueIds);
  }, [initialDiscoveredClueIds]);

  useEffect(() => {
    if (!selectedClue) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedClue(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedClue]);

  const notifyProgress = useCallback((found: number, total: number) => {
    progressRef.current?.(found, total);
  }, []);

  const openClueFromInventory = useCallback(
    (clue: CaseClueForMap) => {
      setSelectedClue(clueEntryForSingleClue(clue, layoutData.clueEntries, layoutData.layouts));
    },
    [layoutData.clueEntries, layoutData.layouts],
  );

  /**
   * 마운트 시 Phaser.Game + Scene 생성, 언마운트 시 destroy.
   * layoutData / variant 가 바뀌면 전체 재생성(간단·안전).
   */
  useEffect(() => {
    setActiveClue(null);
    const parent = hostRef.current;
    if (!parent) return;

    const { layouts, clueEntries, worldW, worldH } = layoutData;
    const assetIdsInUse: string[] = Array.from(
      new Set(
        clueEntries
          .map((e) => e.asset)
          .filter((a): a is string => typeof a === "string" && a.length > 0),
      ),
    );

    // Phaser Scene 은 effect 내부에서만 closure 로 캡처되며, 모듈 최상위로 옮기면 의존성이 과도해진다.
    /* eslint-disable-next-line react-hooks/unsupported-syntax -- Phaser.Scene subclass lives in effect scope */
    class InvestigationScene extends Phaser.Scene {
      private player!: MatterSpritePlayer;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      /** F — 항상 "단서 수집" (단서 모달 + 인벤토리 추가) */
      private interactKey!: Phaser.Input.Keyboard.Key;
      /** E — `investigateMode` 가 있을 때만 "target clue 조사 시도" */
      private investigateKey!: Phaser.Input.Keyboard.Key;
      private clueObjects: PlacedClueObject[] = [];
      private activeClueId: string | null = null;
      /** 강조 중인 소품 스프라이트 — 별도 사각형이 아니라 텍스처 경계 기준 postFX */
      private highlightedPropImage: Phaser.GameObjects.Image | null = null;
      /** 장소 박스들을 감싼 영역 안에서만 플레이어 중심이 움직이도록 제한 */
      private playerCenterClamp: { cxMin: number; cxMax: number; cyMin: number; cyMax: number } | null = null;

      constructor() {
        super({ key: "InvestigationScene" });
      }

      private clearPropHighlightFx() {
        if (this.highlightedPropImage) {
          this.highlightedPropImage.postFX.clear();
          this.highlightedPropImage.clearTint();
          this.highlightedPropImage = null;
        }
      }

      /**
       * 소품 강조: 월드 좌표 사각형이 아니라 스프라이트 픽셀(알파) 윤곽에 맞는 Glow FX
       * (WebGL에서만 postFX 사용, Canvas 폴백은 tint)
       */
      private setActive(entry: ClueEntry | null, target: PlacedClueObject | null) {
        const nextId = entry?.id ?? null;
        if (this.activeClueId === nextId) return;
        this.activeClueId = nextId;

        this.clearPropHighlightFx();

        if (!entry || !target) {
          setActiveClue(null);
          return;
        }

        const img = target.image;
        if (img.postFX) {
          img.postFX.addGlow(0xd4a574, 2, 1.2, false);
        } else {
          img.setTint(0xe8c89a);
        }
        this.highlightedPropImage = img;

        setActiveClue({
          clueName: entry.propLabel,
          locationName: entry.locationName,
        });
      }

      /** 웹폰트 + 플레이어용 작은 텍스처(둥근 사각형) + asset 미지정 시 쓸 placeholder 생성 */
      preload() {
        this.load.font(FONT_KEY, FONT_URL, "opentype");
      
        const g = this.make.graphics({ x: 0, y: 0 });
        const r = PLAYER_SIZE / 2;
      
        g.fillStyle(0xffffff, 1);
        g.fillCircle(r, r, r);
        g.lineStyle(2, 0xcccccc, 1);
        g.strokeCircle(r, r, r);
        g.generateTexture("player", PLAYER_SIZE, PLAYER_SIZE);
        g.destroy();
      
        // asset 미지정 / 로딩 실패 시 폴백 — rounded rect
        if (!this.textures.exists(PLACEHOLDER_TEXTURE_KEY)) {
          const PH = 64;
          const RADIUS = 10;
          const ph = this.make.graphics({ x: 0, y: 0 });

          ph.fillStyle(0xc9a156, 1);
          ph.fillRoundedRect(0, 0, PH, PH, RADIUS);
          ph.lineStyle(2, 0x5c4528, 1);
          ph.strokeRoundedRect(0, 0, PH, PH, RADIUS);
          ph.generateTexture(PLACEHOLDER_TEXTURE_KEY, PH, PH);
          ph.destroy();
        }
      
        preloadMapPropImages(this, assetIdsInUse);
      
        this.load.on("loaderror", (file: Phaser.Loader.File) => {
          console.warn(`[map] failed to load prop asset: ${file.key} (${file.src})`);
        });
      }

      create() {
        setMapPropTexturesNearest(this, assetIdsInUse);

        const cluster = layoutClusterBounds(layouts);
        if (cluster && cluster.w > 0 && cluster.h > 0) {
          this.matter.world.setBounds(cluster.x, cluster.y, cluster.w, cluster.h, 64, true, true, true, true);
          const half = PLAYER_SIZE / 2;
          const cxMin = cluster.x + Math.min(half, cluster.w / 2);
          const cxMax = cluster.x + cluster.w - Math.min(half, cluster.w / 2);
          const cyMin = cluster.y + Math.min(half, cluster.h / 2);
          const cyMax = cluster.y + cluster.h - Math.min(half, cluster.h / 2);
          this.playerCenterClamp =
            cxMax >= cxMin && cyMax >= cyMin ? { cxMin, cxMax, cyMin, cyMax } : null;
        } else {
          this.matter.world.setBounds(0, 0, worldW, worldH, 64, true, true, true, true);
          const half = PLAYER_SIZE / 2;
          this.playerCenterClamp = {
            cxMin: half,
            cxMax: worldW - half,
            cyMin: half,
            cyMax: worldH - half,
          };
        }

        // 배경색 + 바깥 테두리
        const bg = this.add.graphics();
        bg.fillStyle(MAP_WORLD_BACKGROUND, 1);
        bg.fillRect(0, 0, worldW, worldH);
        bg.lineStyle(
          MAP_WORLD_OUTER_STROKE.width,
          MAP_WORLD_OUTER_STROKE.color,
          MAP_WORLD_OUTER_STROKE.alpha,
        );
        bg.strokeRect(2, 2, worldW - 4, worldH - 4);

        // 격자 (월드 좌표 기준)
        const grid = this.add.graphics();
        grid.lineStyle(MAP_GRID_LINE.width, MAP_GRID_LINE.color, MAP_GRID_LINE.alpha);
        for (let gx = 0; gx <= worldW; gx += MAP_GRID_STEP_PX) {
          grid.lineBetween(gx, 0, gx, worldH);
        }
        for (let gy = 0; gy <= worldH; gy += MAP_GRID_STEP_PX) {
          grid.lineBetween(0, gy, worldW, gy);
        }

        // 장소 박스(배경) + 이름 라벨
        layouts.forEach((d) => {
          const gfx = this.add.graphics();
          gfx.setDepth(0);
          gfx.fillStyle(MAP_LOCATION_FILL.color, MAP_LOCATION_FILL.alpha);
          gfx.fillRoundedRect(d.x, d.y, d.w, d.h, MAP_LOCATION_CORNER_RADIUS);
          gfx.lineStyle(
            MAP_LOCATION_STROKE.width,
            MAP_LOCATION_STROKE.color,
            MAP_LOCATION_STROKE.alpha,
          );
          gfx.strokeRoundedRect(d.x, d.y, d.w, d.h, MAP_LOCATION_CORNER_RADIUS);
          const title = d.name?.trim() || "장소";
          const pad = 12;
          this.add
            .text(d.x + pad, d.y + pad * 0.85, title, {
              fontFamily: FONT_KEY,
              fontSize: "22px",
              color: "#c4b5a3",
            })
            .setDepth(2);
        });

        // 단서(단서) 에셋 — 각 단서의 props 로 배치
        this.clueObjects.push(...placeLocationProps2D(this, clueEntries));

        // 첫 번째 장소 중앙에서 시작 (장소 없으면 월드 중앙)
        const startX =
          layouts.length > 0 ? layouts[0].x + layouts[0].w / 2 : worldW / 2;
        const startY =
          layouts.length > 0 ? layouts[0].y + layouts[0].h / 2 : worldH / 2;
        this.player = this.matter.add.sprite(startX, startY, "player", undefined, {
          shape: { type: "circle", radius: PLAYER_SIZE / 2 },
          friction: 0.85,
          frictionStatic: 1,
          restitution: 0,
          frictionAir: 0,
        }) as MatterSpritePlayer;
        this.player.setFixedRotation();
        /** 물리 스텝 후에도 입력으로 정한 최대 속도를 넘지 않게(충돌로 튀는 속도 제한) */
        this.events.on("postupdate", this.clampPlayerSpeed, this);
        this.events.on("postupdate", this.clampPlayerInsideLocationCluster, this);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        // 카메라가 플레이어 추적, 데드존으로 미세 흔들림 완화
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(120, 90);
      }

      private clampPlayerSpeed() {
        if (modalOpenRef.current) return;
        const body = this.player.body as { velocity?: { x: number; y: number } } | undefined;
        const v = body?.velocity;
        if (!v) return;
        const m = Math.hypot(v.x, v.y);
        if (m <= SPEED + 0.5) return;
        const s = SPEED / m;
        this.player.setVelocity(v.x * s, v.y * s);
      }

      private clampPlayerInsideLocationCluster() {
        if (modalOpenRef.current) return;
        const c = this.playerCenterClamp;
        if (!c) return;
        const nx = Phaser.Math.Clamp(this.player.x, c.cxMin, c.cxMax);
        const ny = Phaser.Math.Clamp(this.player.y, c.cyMin, c.cyMax);
        if (nx !== this.player.x || ny !== this.player.y) {
          this.player.setPosition(nx, ny);
          this.player.setVelocity(0, 0);
        }
      }

      /** 방향키 입력 → 대각선 이동 시 속도 정규화(√2) */
      update() {
        let hovered: PlacedClueObject | null = null;
        let hoveredDistance = Number.POSITIVE_INFINITY;

        for (const candidate of this.clueObjects) {
          const playerBounds = this.player.getBounds();
          const targetBounds = candidate.image.getBounds();
          if (!rectsTouchOrOverlap(playerBounds, targetBounds)) continue;

          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.image.x, candidate.image.y);
          if (dist < hoveredDistance) {
            hoveredDistance = dist;
            hovered = candidate;
          }
        }

        this.setActive(hovered?.entry ?? null, hovered);

        if (hovered && !modalOpenRef.current) {
          const clueIds = hovered.entry.clues.map((c) => c.id);
          // F: 항상 단서 수집
          if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            setSelectedClue(hovered.entry);
            registerDiscoveriesRef.current(clueIds);
          }
        }

        if (modalOpenRef.current) {
          this.player.setVelocity(0, 0);
          return;
        }

        const left = this.cursors.left?.isDown;
        const right = this.cursors.right?.isDown;
        const up = this.cursors.up?.isDown;
        const down = this.cursors.down?.isDown;

        let vx = 0;
        let vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;

        if (vx !== 0 && vy !== 0) {
          vx *= Math.SQRT1_2;
          vy *= Math.SQRT1_2;
        }

        this.player.setVelocity(vx * SPEED, vy * SPEED);
      }
    }

    const initial = readHostSize(parent);
    // embedded: 고정 높이 420 — 풀스크린은 부모 높이에 맞춤
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent,
      width: initial.width,
      height: variant === "fullscreen" ? initial.height : 420,
      backgroundColor: MAP_WORLD_BACKGROUND_HEX,
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: InvestigationScene,
      ...(variant === "fullscreen"
        ? {
            scale: {
              mode: Phaser.Scale.NONE,
              autoCenter: Phaser.Scale.NO_CENTER,
            },
          }
        : {}),
    };

    const game = new Phaser.Game(config);

    let ro: ResizeObserver | null = null;
    // 풀스크린만 창/레이아웃 리사이즈에 맞춰 게임 캔버스 크기 조정
    if (variant === "fullscreen" && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const { width, height } = readHostSize(parent);
        game.scale.resize(width, height);
      });
      ro.observe(parent);
    }

    return () => {
      ro?.disconnect();
      game.destroy(true); // 씬·캔버스·입력 정리
    };
  }, [layoutData, notifyProgress, variant]);

  const isFull = variant === "fullscreen";

  return (
    <div
      className={cn(
        "relative",
        isFull ? "flex h-full min-h-0 w-full flex-col text-[var(--foreground)]" : "",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-0 w-full flex-1",
          isFull ? "flex-row" : "flex-col-reverse gap-2 md:flex-row",
        )}
      >
        {/* Phaser 캔버스 + 근접 시 F 안내 */}
        <div
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden",
            isFull
              ? "min-h-0 border-r border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
              : "min-h-[420px] rounded-md border border-[var(--border)] bg-[var(--background)]",
          )}
        >
          <div
            ref={hostRef}
            className={cn("h-full w-full", isFull ? "min-h-0 bg-transparent" : "")}
          />
          {activeClue && !selectedClue ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[30] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
              <div
                key={`${activeClue.clueName}\0${activeClue.locationName}`}
                className={cn(
                  "max-w-md rounded-lg border px-3 py-2.5 text-center shadow-lg motion-safe:animate-[playRevealUp_0.42s_cubic-bezier(0.22,1,0.36,1)_both]",
                  isFull
                    ? "border-[color-mix(in_srgb,var(--primary)_42%,var(--play-border-warm))] bg-[color-mix(in_srgb,var(--play-paper)_92%,var(--play-veil))] text-[var(--foreground)] shadow-[var(--play-shadow-lift)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
                    : "border-[var(--border)] bg-[color-mix(in_srgb,var(--card-bg)_88%,var(--tint-accent-weak))] text-[var(--foreground)] ring-1 ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
                )}
              >
                <p
                  className={cn(
                    "flex items-center justify-center gap-2 text-[11px]",
                    isFull ? "text-[var(--muted-foreground)]" : "text-[var(--muted-foreground)]",
                  )}
                >
                  <kbd
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums shadow-sm",
                      isFull
                        ? "border-[var(--play-border-cool)] bg-[var(--play-inset)] text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]",
                    )}
                  >
                    F
                  </kbd>
                  <span className="text-[var(--foreground)]">를 눌러 단서를 확인해보세요</span>
                </p>
              </div>
            </div>
          ) : null}
        </div>
        {/* 발견 단서 인벤토리 */}
        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col",
            isFull
              ? "w-52 border-l border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] bg-[var(--background)] shadow-[inset_10px_0_32px_-12px_color-mix(in_srgb,var(--primary)_10%,transparent)] sm:w-56 md:w-60 md:min-w-[13.5rem]"
              : "max-h-[200px] w-full border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_55%,var(--card-bg))] md:max-h-none md:w-[200px] md:border-l md:border-t-0 md:border-l-[color-mix(in_srgb,var(--primary)_35%,var(--border))]",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b px-2 py-2 pl-3",
              isFull
                ? "border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_55%,var(--tint-accent-weak))]"
                : "border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_40%,var(--tint-accent-weak))]",
            )}
          >
            <Package
              className={cn(
                "h-4 w-4 shrink-0",
                isFull ? "text-[var(--primary)]" : "text-[var(--accent)]",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-xs font-semibold tracking-wide text-[var(--foreground)]">
              수집한 단서
            </span>
          </div>
          <ul
            className={cn(
              "min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-2",
              isFull ? "bg-[color-mix(in_srgb,var(--card-bg)_35%,var(--background))]" : "",
            )}
          >
            {inventoryDisplayClues.length === 0 ? (
              <li
                className={cn(
                  "rounded-md border border-dashed px-2 py-6 text-center text-[11px]",
                  isFull
                    ? "border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] text-[var(--muted-foreground)]"
                    : "border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] text-[var(--muted-foreground)]",
                )}
              >
                단서를 수집하면 단서가 여기에 쌓입니다.
              </li>
            ) : (
              inventoryDisplayClues.map((clue) => (
                <li key={clue.id} className="mb-1.5 last:mb-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openClueFromInventory(clue)}
                    className={cn(
                      "h-auto w-full justify-start rounded border px-2.5 py-2 text-left text-xs transition-colors",
                      isFull
                        ? "border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] hover:bg-[var(--tint-accent-weak)]"
                        : "border-[var(--border)] bg-[var(--tint-mystery)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--tint-accent-weak)]",
                    )}
                  >
                    <span className="line-clamp-2">{clue.name?.trim() || "이름 없음"}</span>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
      {selectedClue ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-[2px]">
          <div
            className={cn(
              "w-full max-w-2xl rounded-md border shadow-xl",
              isFull
                ? "border-[var(--play-border-warm)] bg-[var(--play-paper)] shadow-[var(--play-shadow-lift)]"
                : "border-[var(--border)] bg-[var(--card-bg)]",
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-between border-b px-4 py-3",
                isFull ? "border-[var(--play-border-cool)] bg-[var(--play-veil)]" : "border-[var(--border)]",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-70",
                  isFull ? "via-[color-mix(in_srgb,var(--primary)_75%,var(--highlight))]" : "",
                )}
                aria-hidden
              />
              <div className="min-w-0 pr-2">
                <h2
                  className={cn(
                    "mt-0.5 line-clamp-2 text-lg leading-snug",
                    isFull ? "text-[var(--foreground)]" : "text-[var(--foreground)]",
                  )}
                >
                  「{selectedClue.propLabel}」
                </h2>
              </div>
              <Button
                type="button"
                onClick={() => setSelectedClue(null)}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 py-4">
              {selectedClue.clues.length > 0 ? (
                selectedClue.clues.map((clue) => (
                  <section
                    key={clue.id}
                    className={cn(
                      "rounded-md border p-4",
                      isFull
                        ? "border-[var(--play-border-cool)] bg-[var(--play-inset)]"
                        : "border-[var(--border)] bg-[var(--tint-accent-weak)]",
                    )}
                  >
                    {clue.content?.trim() ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
                        {clue.content}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">등록된 단서 내용이 없습니다.</p>
                    )}
                  </section>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">이 소품에는 연결된 단서가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
