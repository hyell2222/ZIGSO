"use client";

import * as Phaser from "phaser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAP_EDITOR_SPACE,
  MAP_PROP_DEFAULT_SIZE,
  mapPropTextureKey,
  preloadMapPropImages,
  setMapPropTexturesNearest,
} from "@/lib/assets/map-props";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Package, X } from "lucide-react";

import type { ScenarioClueForMap, ScenarioLocationForMap } from "@/lib/api/play";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

/** 맵 기본 가로·세로 (장소/단서가 더 나가면 computeWorldSize에서 확장) */
const DEFAULT_WORLD_W = 2000;
const DEFAULT_WORLD_H = 1400;
/** 플레이어 스프라이트 한 변 길이(픽셀) */
const PLAYER_SIZE = 28;
/** 이동 목표 속도(픽셀/초) — Matter는 Arcade와 달리 동일 수치여도 더 빨리 느껴져 다소 낮춤 */
const SPEED = 5;

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
  const w = Math.min(800, cellW - gap);
  const h = Math.min(460, cellH - gap);
  const x = pad + col * cellW + (cellW - w) / 2;
  const y = pad + row * cellH + (cellH - h) / 2;
  return { x, y, w, h };
}

/** 화면에 그릴 장소 하나의 사각형 + 메타 */
type LocationLayout = { id: string; name: string | null; x: number; y: number; w: number; h: number };

/** placeholder 표시용 텍스처 키 (asset 미지정 단서에 쓰임) */
const PLACEHOLDER_TEXTURE_KEY = "map_prop:__placeholder__";

type EvidenceEntry = {
  id: string;
  locationId: string;
  locationName: string;
  /** 사용할 prop asset 식별자 (없으면 placeholder) */
  asset: string | null;
  /** 모달 헤더에 표시할 라벨 (기본 "조사") */
  propLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 한 단서 = 한 엔티티 (props 기반 배치). clues.length 는 항상 1. */
  clues: ScenarioClueForMap[];
};

type ActiveEvidenceState = {
  label: string;
  clueCount: number;
} | null;

type PlacedEvidenceObject = {
  entry: EvidenceEntry;
  /** 시각 + Matter 정적 몸체(다각형 실루엣) — Arcade 사각 히트박스 없음 */
  image: Phaser.GameObjects.Image;
};

/** phaser 공개 타입에 Matter 믹스인이 완전히 올라오지 않아 이동·회전 고정용으로만 사용 */
type MatterSpritePlayer = Phaser.GameObjects.Sprite & {
  setFixedRotation(value?: boolean): void;
  setFrictionAir(value: number): void;
  setVelocity(x: number, y: number): void;
};

function resolveSize(override?: { w?: number; h?: number }) {
  const w =
    typeof override?.w === "number" && Number.isFinite(override.w) && override.w > 0
      ? override.w
      : MAP_PROP_DEFAULT_SIZE.w;
  const h =
    typeof override?.h === "number" && Number.isFinite(override.h) && override.h > 0
      ? override.h
      : MAP_PROP_DEFAULT_SIZE.h;
  return { w, h };
}

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

function buildEvidenceEntries(layouts: LocationLayout[], clues: ScenarioClueForMap[]): EvidenceEntry[] {
  const layoutById = new Map(layouts.map((l) => [l.id, l]));

  const fallbackCounts = new Map<string, number>();
  const fallbackTotals = new Map<string, number>();
  for (const clue of clues) {
    if (clue.props) continue;
    const key = clue.location_id ?? "__none__";
    fallbackTotals.set(key, (fallbackTotals.get(key) ?? 0) + 1);
  }

  const out: EvidenceEntry[] = [];
  clues.forEach((clue) => {
    const L = clue.location_id ? layoutById.get(clue.location_id) : undefined;
    const locationName = L?.name?.trim() || "장소";

    const asset = clue.props?.asset?.trim() || null;

    // 어드민은 단서의 x/y/w/h 를 MAP_EDITOR_SPACE(= 800×600) 좌표로 저장한다.
    // 학생 맵은 여러 장소를 한 월드에 배치하므로, 각 장소 박스 L.w/L.h 크기에 맞춰
    // 편집기 좌표를 장소 내부 좌표로 선형 매핑해야 prop 이 장소 안에 그려진다.
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
      const editorW = Number.isFinite(clue.props!.w) ? Number(clue.props!.w) : NaN;
      const editorH = Number.isFinite(clue.props!.h) ? Number(clue.props!.h) : NaN;
      w =
        Number.isFinite(editorW) && editorW > 0
          ? Math.max(8, editorW * sx)
          : MAP_PROP_DEFAULT_SIZE.w;
      h =
        Number.isFinite(editorH) && editorH > 0
          ? Math.max(8, editorH * sy)
          : MAP_PROP_DEFAULT_SIZE.h;
    } else if (hasEditorCoords) {
      // 장소 정보가 없으면 스케일 불가 → 편집기 좌표를 그대로 사용.
      cx = clue.props!.x;
      cy = clue.props!.y;
      const size = resolveSize({ w: clue.props?.w, h: clue.props?.h });
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
      const size = resolveSize({ w: clue.props?.w, h: clue.props?.h });
      w = size.w;
      h = size.h;
    } else {
      cx = DEFAULT_WORLD_W / 2;
      cy = DEFAULT_WORLD_H / 2;
      const size = resolveSize({ w: clue.props?.w, h: clue.props?.h });
      w = size.w;
      h = size.h;
    }

    out.push({
      id: `clue:${clue.id}`,
      locationId: clue.location_id ?? "",
      locationName,
      asset,
      propLabel: "조사",
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

function placeLocationProps2D(scene: Phaser.Scene, entries: EvidenceEntry[]) {
  const objects: PlacedEvidenceObject[] = [];
  for (const entry of entries) {
    const textureKey = entry.asset ? mapPropTextureKey(entry.asset) : PLACEHOLDER_TEXTURE_KEY;
    // 텍스처가 로딩되지 않았으면 placeholder 로 대체 (404 에셋 보호)
    const safeKey = scene.textures.exists(textureKey) ? textureKey : PLACEHOLDER_TEXTURE_KEY;

    // Matter body 는 "옵션에 shape 를 넣지 않고" 기본값(텍스처 프레임 크기)으로 생성한다.
    // 이렇게 하면 이어지는 setDisplaySize 가 스케일을 바꿀 때 Matter 가 body 도 동일 비율로
    // 스케일해 visual 과 collider 가 정확히 같은 크기로 맞춰진다.
    //
    // (이전엔 shape:{w:entry.w,h:entry.h} + setDisplaySize(entry.w,entry.h) 로 설정했는데,
    //  텍스처 해상도(T)와 표시 크기(D)가 다르면 body 가 D×(D/T) 로 과대/과소 스케일되어
    //  visual 바깥까지 충돌 영역이 삐져나와 "닿지 않는 padding" 버그가 있었음.)
    const image = scene.matter.add.image(entry.x, entry.y, safeKey, undefined, {
      isStatic: true,
    });
    image.setDisplaySize(entry.w, entry.h);
    image.setDepth(1);
    image.setData("evidenceEntry", entry);
    objects.push({ entry, image });
  }
  return objects;
}

/** 장소 목록 → autoLayout 으로 LocationLayout 배열 생성 (좌표는 자동 격자 배치) */
function buildLocationLayouts(locations: ScenarioLocationForMap[]): LocationLayout[] {
  const sorted = [...locations].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((loc, i) => {
    const auto = autoLayoutLocation(i, sorted.length);
    return { id: loc.id, name: loc.name, ...auto };
  });
}

/** 인벤토리에서 다시 열 때: 원래 소품 정보를 유지하되 본문에는 해당 clue만 표시 */
function evidenceEntryForSingleClue(
  clue: ScenarioClueForMap,
  evidenceEntries: EvidenceEntry[],
  layouts: LocationLayout[],
): EvidenceEntry {
  const entry = evidenceEntries.find((e) => e.clues.some((c) => c.id === clue.id));
  if (entry) {
    return { ...entry, id: `${entry.id}:inv:${clue.id}`, clues: [clue] };
  }
  const L = layouts.find((l) => l.id === clue.location_id);
  return {
    id: `inv:${clue.id}`,
    locationId: clue.location_id ?? "",
    locationName: L?.name?.trim() ?? "장소",
    asset: null,
    propLabel: "증거",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    clues: [clue],
  };
}

/** 기본 월드보다 장소·증거가 밖으로 나가면 bounds 확장 */
function computeWorldSize(layouts: LocationLayout[], entries: EvidenceEntry[]) {
  let w = DEFAULT_WORLD_W;
  let h = DEFAULT_WORLD_H;
  for (const L of layouts) {
    w = Math.max(w, L.x + L.w + 120);
    h = Math.max(h, L.y + L.h + 120);
  }
  for (const e of entries) {
    w = Math.max(w, e.x + e.w / 2 + 120);
    h = Math.max(h, e.y + e.h / 2 + 120);
  }
  return { w, h };
}

/**
 * "조사 모드": 사건 해결 단계에서 정답 prop 을 지목하는 별도 입력 경로.
 *
 * - F 키는 investigateMode 와 **무관하게 항상 단서 수집**(evidence 모달 + 인벤토리 추가).
 * - E 키는 investigateMode 가 활성일 때만 동작하며
 *   호버 중인 prop 의 clue id 들로 `onInvestigate(clueIds)` 를 호출한다
 *   (정답·오답 판정은 부모가 책임).
 * - 호버 중인 prop 이 없으면 E 입력은 무시된다.
 */
type InvestigateMode = {
  /** 상단 안내 텍스트 (예: "정답 prop 찾기 · 남은 기회 3") */
  topBarLabel?: string;
  /** E 키 입력 시 호출. 보통 1개의 clue id 가 들어온다. */
  onInvestigate: (clueIds: string[]) => void;
};

/** React 래퍼 props — Phaser 인스턴스는 내부 useEffect에서만 생성 */
type InvestigationMapProps = {
  className?: string;
  variant?: "embedded" | "fullscreen";
  /** 상단 상태줄에 표시 (예: 1차 현장 / 2차 현장) */
  phaseLabel?: string;
  locations?: ScenarioLocationForMap[];
  clues?: ScenarioClueForMap[];
  onEvidenceProgress?: (found: number, total: number) => void;
  /** 부모에서 단서 인벤토리 상태를 유지하고 싶을 때 초기값으로 전달 */
  initialDiscoveredClueIds?: string[];
  /** 발견 단서 변경을 부모로 전달 (phase 전환 후 briefing 인벤토리 표시용) */
  onDiscoveredClueIdsChange?: (ids: string[]) => void;
  /**
   * 우측 인벤토리 패널에 표시할 단서를 외부에서 제어한다.
   * - 미지정(undefined): F 로 직접 발견한 단서들(`discoveredClueIds`)만 노출 (investigation phase 기본).
   * - 지정 시: 해당 배열을 그대로 노출 (resolution phase 에서 팀 전체 수집 단서를 보여주기 위함).
   *   배열이 빈 배열이면 "수집한 단서 없음" 안내가 뜬다.
   */
  inventoryClues?: ScenarioClueForMap[];
  /** 사건 해결 단계의 "정답 prop 찾기" 모드 — 지정 시 F 키 동작이 바뀐다 */
  investigateMode?: InvestigateMode;
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
  phaseLabel = "1차 현장",
  locations: locationsProp,
  clues: cluesProp,
  onEvidenceProgress,
  initialDiscoveredClueIds,
  onDiscoveredClueIdsChange,
  inventoryClues,
  investigateMode,
}: InvestigationMapProps) {
  const locations = locationsProp ?? [];
  const clues = cluesProp ?? [];

  /** Phaser Game 이 붙는 DOM (고정 높이 embedded / flex-1 fullscreen) */
  const hostRef = useRef<HTMLDivElement>(null);
  /** 콜백은 매 렌더마다 바뀔 수 있어 ref로 최신만 유지 (effect 의존성 최소화) */
  const progressRef = useRef(onEvidenceProgress);
  const modalOpenRef = useRef(false);
  const [activeEvidence, setActiveEvidence] = useState<ActiveEvidenceState>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceEntry | null>(null);
  /** F로 조사해 획득한 clue id (인벤토리 표시용) */
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>(initialDiscoveredClueIds ?? []);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const registerDiscoveriesRef = useRef<(ids: string[]) => void>(() => {});
  /** investigateMode 의 최신 참조를 Phaser scene 에서 쓰기 위해 ref 로 유지 */
  const investigateModeRef = useRef<InvestigateMode | undefined>(investigateMode);
  useEffect(() => {
    investigateModeRef.current = investigateMode;
  }, [investigateMode]);

  /** locations/clues 가 바뀔 때만 맵 레이아웃·월드 크기 재계산 */
  const layoutData = useMemo(() => {
    const layouts = buildLocationLayouts(locations);
    const evidenceEntries = buildEvidenceEntries(layouts, clues);
    const { w, h } = computeWorldSize(layouts, evidenceEntries);
    return { layouts, evidenceEntries, worldW: w, worldH: h };
  }, [locations, clues]);

  const totalEvidence = clues.length;

  const discoveredClues = useMemo(() => {
    const byId = new Map(clues.map((c) => [c.id, c]));
    return discoveredClueIds
      .map((id) => byId.get(id))
      .filter((c): c is ScenarioClueForMap => c != null)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [clues, discoveredClueIds]);

  /**
   * 인벤토리 패널에 실제로 그려질 단서 목록.
   * `inventoryClues` 가 명시되면(=resolution phase 에서 팀 전체 단서 표시) 그 값을 우선,
   * 아니면 내가 직접 발견한 `discoveredClues` 만 노출.
   */
  const inventoryDisplayClues = useMemo(() => {
    const source = inventoryClues ?? discoveredClues;
    return [...source].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [inventoryClues, discoveredClues]);

  /** 부모에 전달하는 onEvidenceProgress 항상 최신 참조 유지 */
  useEffect(() => {
    progressRef.current = onEvidenceProgress;
  }, [onEvidenceProgress]);

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
    modalOpenRef.current = selectedEvidence !== null;
  }, [selectedEvidence]);

  useEffect(() => {
    progressRef.current?.(discoveredClueIds.length, totalEvidence);
  }, [discoveredClueIds.length, totalEvidence]);

  useEffect(() => {
    onDiscoveredClueIdsChange?.(discoveredClueIds);
  }, [discoveredClueIds, onDiscoveredClueIdsChange]);

  useEffect(() => {
    if (!initialDiscoveredClueIds) return;
    setDiscoveredClueIds(initialDiscoveredClueIds);
  }, [initialDiscoveredClueIds]);

  useEffect(() => {
    if (!selectedEvidence) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEvidence(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEvidence]);

  const notifyProgress = useCallback((found: number, total: number) => {
    progressRef.current?.(found, total);
  }, []);

  const openEvidenceFromInventory = useCallback(
    (clue: ScenarioClueForMap) => {
      setSelectedEvidence(evidenceEntryForSingleClue(clue, layoutData.evidenceEntries, layoutData.layouts));
    },
    [layoutData.evidenceEntries, layoutData.layouts],
  );

  /**
   * 마운트 시 Phaser.Game + Scene 생성, 언마운트 시 destroy.
   * layoutData / variant 가 바뀌면 전체 재생성(간단·안전).
   */
  useEffect(() => {
    setActiveEvidence(null);
    const parent = hostRef.current;
    if (!parent) return;

    const { layouts, evidenceEntries, worldW, worldH } = layoutData;
    const assetIdsInUse: string[] = Array.from(
      new Set(
        evidenceEntries
          .map((e) => e.asset)
          .filter((a): a is string => typeof a === "string" && a.length > 0),
      ),
    );

    class InvestigationScene extends Phaser.Scene {
      private player!: MatterSpritePlayer;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      /** F — 항상 "단서 수집" (증거 모달 + 인벤토리 추가) */
      private interactKey!: Phaser.Input.Keyboard.Key;
      /** E — `investigateMode` 가 있을 때만 "target clue 조사 시도" */
      private investigateKey!: Phaser.Input.Keyboard.Key;
      private evidenceObjects: PlacedEvidenceObject[] = [];
      private activeEvidenceId: string | null = null;
      /** 강조 중인 소품 스프라이트 — 별도 사각형이 아니라 텍스처 경계 기준 postFX */
      private highlightedPropImage: Phaser.GameObjects.Image | null = null;

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
      private setActive(entry: EvidenceEntry | null, target: PlacedEvidenceObject | null) {
        const nextId = entry?.id ?? null;
        if (this.activeEvidenceId === nextId) return;
        this.activeEvidenceId = nextId;

        this.clearPropHighlightFx();

        if (!entry || !target) {
          setActiveEvidence(null);
          return;
        }

        const img = target.image;
        if (img.postFX) {
          img.postFX.addGlow(0xfacc15, 2, 1.25, false);
        } else {
          img.setTint(0xffe066);
        }
        this.highlightedPropImage = img;

        setActiveEvidence({
          label: entry.propLabel,
          clueCount: entry.clues.length,
        });
      }

      /** 웹폰트 + 플레이어용 작은 텍스처(둥근 사각형) + asset 미지정 시 쓸 placeholder 생성 */
      preload() {
        this.load.font(FONT_KEY, FONT_URL, "opentype");

        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x22d3ee, 1);
        g.fillRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.lineStyle(2, 0xa5f3fc, 1);
        g.strokeRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.generateTexture("player", PLAYER_SIZE, PLAYER_SIZE);
        g.destroy();

        // asset 미지정 / 로딩 실패 시 폴백 — 노란 다이아몬드
        if (!this.textures.exists(PLACEHOLDER_TEXTURE_KEY)) {
          const PH = 64;
          const ph = this.make.graphics({ x: 0, y: 0 });
          ph.fillStyle(0xfacc15, 1);
          ph.fillTriangle(PH / 2, 0, PH, PH / 2, PH / 2, PH);
          ph.fillTriangle(PH / 2, 0, 0, PH / 2, PH / 2, PH);
          ph.lineStyle(2, 0x713f12, 1);
          ph.strokeTriangle(PH / 2, 0, PH, PH / 2, PH / 2, PH);
          ph.strokeTriangle(PH / 2, 0, 0, PH / 2, PH / 2, PH);
          ph.generateTexture(PLACEHOLDER_TEXTURE_KEY, PH, PH);
          ph.destroy();
        }

        // 시나리오에서 실제로 쓰이는 asset 만 동적으로 로딩
        preloadMapPropImages(this, assetIdsInUse);

        // 누락된 asset 은 무시하고 placeholder 로 폴백 (Phaser 가 게임 정지하지 않도록)
        this.load.on("loaderror", (file: Phaser.Loader.File) => {
          // eslint-disable-next-line no-console
          console.warn(`[map] failed to load prop asset: ${file.key} (${file.src})`);
        });
      }

      create() {
        setMapPropTexturesNearest(this, assetIdsInUse);

        this.matter.world.setBounds(0, 0, worldW, worldH, 64, true, true, true, true);

        // 배경색 + 바깥 테두리
        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 1);
        bg.fillRect(0, 0, worldW, worldH);
        bg.lineStyle(2, 0x334155, 0.6);
        bg.strokeRect(2, 2, worldW - 4, worldH - 4);

        // 격자 (월드 좌표 기준)
        const gridStep = 40;
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1e293b, 0.85);
        for (let gx = 0; gx <= worldW; gx += gridStep) {
          grid.lineBetween(gx, 0, gx, worldH);
        }
        for (let gy = 0; gy <= worldH; gy += gridStep) {
          grid.lineBetween(0, gy, worldW, gy);
        }

        // 장소 박스(배경) + 이름 라벨
        layouts.forEach((d) => {
          const gfx = this.add.graphics();
          gfx.setDepth(0);
          gfx.fillStyle(0x164e63, 0.45);
          gfx.fillRoundedRect(d.x, d.y, d.w, d.h, 8);
          gfx.lineStyle(2, 0x22d3ee, 0.35);
          gfx.strokeRoundedRect(d.x, d.y, d.w, d.h, 8);
          const title = d.name?.trim() || "장소";
          const pad = 12;
          this.add
            .text(d.x + pad, d.y + pad * 0.85, title, {
              fontFamily: FONT_KEY,
              fontSize: "22px",
              color: "#94a3b8",
            })
            .setDepth(2);
        });

        // 단서(증거) 에셋 — 각 단서의 props 로 배치
        this.evidenceObjects.push(...placeLocationProps2D(this, evidenceEntries));

        // 첫 번째 장소 중앙에서 시작 (장소 없으면 월드 중앙)
        const startX =
          layouts.length > 0 ? layouts[0].x + layouts[0].w / 2 : worldW / 2;
        const startY =
          layouts.length > 0 ? layouts[0].y + layouts[0].h / 2 : worldH / 2;
        this.player = this.matter.add.sprite(startX, startY, "player", undefined, {
          shape: { type: "rectangle", width: PLAYER_SIZE, height: PLAYER_SIZE },
          friction: 0.85,
          frictionStatic: 1,
          restitution: 0,
          frictionAir: 0,
        }) as MatterSpritePlayer;
        this.player.setFixedRotation();
        /** 물리 스텝 후에도 입력으로 정한 최대 속도를 넘지 않게(충돌로 튀는 속도 제한) */
        this.events.on("postupdate", this.clampPlayerSpeed, this);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.investigateKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

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

      /** 방향키 입력 → 대각선 이동 시 속도 정규화(√2) */
      update() {
        let hovered: PlacedEvidenceObject | null = null;
        let hoveredDistance = Number.POSITIVE_INFINITY;

        for (const candidate of this.evidenceObjects) {
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
          // F: 항상 단서 수집 (investigation / resolution 동일).
          if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            setSelectedEvidence(hovered.entry);
            registerDiscoveriesRef.current(clueIds);
          }
          // E: investigateMode 가 활성일 때만 "target clue 조사 시도".
          //    (정답·오답 판정은 부모의 onInvestigate 가 책임)
          if (
            investigateModeRef.current &&
            Phaser.Input.Keyboard.JustDown(this.investigateKey)
          ) {
            investigateModeRef.current.onInvestigate(clueIds);
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
      backgroundColor: "#020617",
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
        isFull ? "flex h-full min-h-0 w-full flex-col bg-[var(--background)]" : "",
        className,
      )}
    >
      {/* 상단: 페이즈 라벨 + 수집 진행 (React state) */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-[var(--border)] text-xs text-[var(--muted-foreground)]",
          isFull ? "border-b px-4 py-2" : "mb-2",
          !isFull && "px-0",
        )}
      >
        <span>
          {investigateMode?.topBarLabel
            ? investigateMode.topBarLabel
            : `${phaseLabel} — 탐색 중`}
        </span>
        <div className="flex items-center gap-3">
          <span>
            {activeEvidence
              ? `${activeEvidence.label} · F 수집`
              : "소품에 가까이 다가가세요"}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "flex min-h-0 w-full flex-1",
          isFull ? "flex-row" : "flex-col-reverse gap-2 md:flex-row",
        )}
      >
        {/* Phaser 캔버스 */}
        <div
          ref={hostRef}
          className={cn(
            "min-w-0 flex-1 overflow-hidden bg-[var(--background)]",
            isFull ? "min-h-0" : "min-h-[420px] rounded-md border border-[var(--border)]",
          )}
        />
        {/* 발견 증거 인벤토리 — 접기/펼치기 */}
        {inventoryOpen ? (
          <aside
            className={cn(
              "flex min-h-0 shrink-0 flex-col border-[var(--border)] bg-[rgba(15,23,42,0.85)]",
              isFull
                ? "w-[220px] border-l"
                : "max-h-[200px] w-full border-t md:max-h-none md:w-[200px] md:border-l md:border-t-0",
            )}
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-2 py-2 pl-3">
              <Package className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
              <span className="min-w-0 flex-1 text-xs font-medium text-[var(--foreground)]">발견한 증거</span>
              <Button
                type="button"
                onClick={() => setInventoryOpen(false)}
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                aria-label="인벤토리 접기"
              >
                <ChevronRight className="hidden h-4 w-4 md:block" aria-hidden />
                <ChevronUp className="h-4 w-4 md:hidden" aria-hidden />
              </Button>
            </div>
            <ul className="min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-2">
              {inventoryDisplayClues.length === 0 ? (
                <li className="rounded-md border border-dashed border-[var(--border)] px-2 py-6 text-center text-[11px] text-[var(--muted-foreground)]">
                  소품을 조사하면 증거가 여기에 쌓입니다.
                </li>
              ) : (
                inventoryDisplayClues.map((clue) => (
                  <li key={clue.id} className="mb-1.5 last:mb-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEvidenceFromInventory(clue)}
                      className="h-auto w-full justify-start rounded border border-[var(--border)] bg-black/20 px-2.5 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-black/35"
                    >
                      <span className="line-clamp-2">{clue.name?.trim() || "이름 없음"}</span>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </aside>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setInventoryOpen(true)}
            className={cn(
              "flex shrink-0 items-center justify-center gap-2 border-[var(--border)] bg-[rgba(15,23,42,0.85)] text-[var(--foreground)] transition-colors hover:bg-black/30",
              isFull
                ? "w-10 flex-col border-l py-2"
                : "h-10 w-full border-t md:h-auto md:w-10 md:flex-col md:border-l md:border-t-0 md:py-2",
            )}
            aria-label="인벤토리 열기"
          >
            <Package className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <ChevronLeft className="hidden h-4 w-4 md:block" aria-hidden />
            <ChevronDown className="h-4 w-4 md:hidden" aria-hidden />
          </Button>
        )}
      </div>
      {selectedEvidence ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-md border border-[var(--border)] bg-[var(--background)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">{selectedEvidence.locationName}</p>
                <h2 className="text-lg text-[var(--foreground)]">{selectedEvidence.propLabel} 조사 결과</h2>
              </div>
              <Button
                type="button"
                onClick={() => setSelectedEvidence(null)}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                aria-label="증거 모달 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 py-4">
              {selectedEvidence.clues.length > 0 ? (
                selectedEvidence.clues.map((clue) => (
                  <section key={clue.id} className="rounded-md border border-[var(--border)] bg-black/10 p-4">
                    <h3 className="text-base text-[var(--foreground)]">{clue.name?.trim() || "이름 없는 증거"}</h3>
                    {clue.content?.trim() ? (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
                        {clue.content}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">등록된 증거 내용이 없습니다.</p>
                    )}
                  </section>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">이 소품에는 연결된 증거가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
