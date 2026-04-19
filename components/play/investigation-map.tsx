"use client";

/**
 * 플레이 화면용 탐색 맵: Phaser로 2D 맵·장소·소품을 그리고,
 * 방향키로 이동하며 소품을 조사해 단서 정보를 확인합니다.
 * @see lib/api/play 의 ScenarioLocationForMap / ScenarioClueForMap
 */
import * as Phaser from "phaser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MapPropTextureKey,
  MAP_PROP_COLLISION_VERTS,
  MAP_PROP_NATURAL_SIZE,
  preloadMapPropImages,
  setMapPropTexturesNearest,
} from "@/lib/assets/map-props";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Package } from "lucide-react";

import type { ScenarioClueForMap, ScenarioLocationForMap } from "@/lib/api/play";
import { cn } from "@/lib/utils";

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

type PropType = keyof typeof MapPropTextureKey;
type PropSlot = { propType: PropType; x: number; y: number; w: number; h: number };
const PROP_LABELS: Record<PropType, string> = {
  desk: "책상",
  drawer: "서랍장",
  shelf: "책장",
  chair: "의자",
  lamp: "스탠드",
};
type EvidenceEntry = {
  id: string;
  locationId: string;
  locationName: string;
  propType: PropType;
  propLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
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

function buildPropSlots(d: LocationLayout): PropSlot[] {
  const { x, y, w, h } = d;
  const m = Math.min(w, h) * 0.035;

  const deskW = w * 0.44;
  const deskH = Math.max(28, h * 0.09);
  const deskX = x + (w - deskW) / 2;
  const deskY = y + h - deskH - m * 1.4;

  const dw = w * 0.17;
  const dh = h * 0.34;
  const bw = w * 0.19;
  const bh = h * 0.4;
  const cw = w * 0.11;
  const ch = h * 0.13;
  const cx = deskX + deskW * 0.58;
  const cy = deskY - ch * 0.75;

  const lampX = deskX + deskW * 0.22;
  const lampBaseY = deskY;
  const lampH = Math.max(h * 0.14, 40);
  const { w: lampNatW, h: lampNatH } = MAP_PROP_NATURAL_SIZE.lamp;
  const lampW = lampH * (lampNatW / lampNatH);

  return [
    { propType: "desk", x: deskX + deskW / 2, y: deskY + deskH / 2, w: deskW, h: deskH },
    { propType: "drawer", x: x + m + dw / 2, y: y + h * 0.2 + dh / 2, w: dw, h: dh },
    { propType: "shelf", x: x + w - m - bw / 2, y: y + h * 0.14 + bh / 2, w: bw, h: bh },
    { propType: "chair", x: cx + cw / 2, y: cy + ch / 2, w: cw, h: ch },
    { propType: "lamp", x: lampX, y: lampBaseY - lampH * 0.35, w: lampW, h: lampH },
  ];
}

function buildEvidenceEntries(layouts: LocationLayout[], clues: ScenarioClueForMap[]): EvidenceEntry[] {
  const cluesByLoc = new Map<string, ScenarioClueForMap[]>();
  for (const clue of clues) {
    if (!clue.location_id) continue;
    const list = cluesByLoc.get(clue.location_id) ?? [];
    list.push(clue);
    cluesByLoc.set(clue.location_id, list);
  }

  const out: EvidenceEntry[] = [];
  for (const L of layouts) {
    const slots = buildPropSlots(L);
    const localClues = cluesByLoc.get(L.id) ?? [];
    const buckets: ScenarioClueForMap[][] = slots.map(() => []);
    localClues.forEach((clue, i) => {
      buckets[i % slots.length]?.push(clue);
    });
    slots.forEach((slot, i) => {
      out.push({
        id: `${L.id}:${slot.propType}:${i}`,
        locationId: L.id,
        locationName: L.name?.trim() || "장소",
        propType: slot.propType,
        propLabel: PROP_LABELS[slot.propType],
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        clues: buckets[i] ?? [],
      });
    });
  }
  return out;
}

function rectsTouchOrOverlap(a: Phaser.Geom.Rectangle, b: Phaser.Geom.Rectangle) {
  return a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;
}

function placeLocationProps2D(scene: Phaser.Scene, entries: EvidenceEntry[]) {
  const objects: PlacedEvidenceObject[] = [];
  for (const entry of entries) {
    const verts = MAP_PROP_COLLISION_VERTS[entry.propType];
    const image = scene.matter.add.image(entry.x, entry.y, MapPropTextureKey[entry.propType], undefined, {
      isStatic: true,
      shape: { type: "fromVerts", verts, flagInternal: true },
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
    propType: "desk",
    propLabel: "증거",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    clues: [clue],
  };
}

/** 기본 월드보다 장소가 밖으로 나가면 bounds 확장 */
function computeWorldSize(layouts: LocationLayout[]) {
  let w = DEFAULT_WORLD_W;
  let h = DEFAULT_WORLD_H;
  for (const L of layouts) {
    w = Math.max(w, L.x + L.w + 120);
    h = Math.max(h, L.y + L.h + 120);
  }
  return { w, h };
}

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

  /** locations/clues 가 바뀔 때만 맵 레이아웃·월드 크기 재계산 */
  const layoutData = useMemo(() => {
    const layouts = buildLocationLayouts(locations);
    const evidenceEntries = buildEvidenceEntries(layouts, clues);
    const { w, h } = computeWorldSize(layouts);
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
    const entriesByLocation = new Map<string, EvidenceEntry[]>();
    for (const entry of evidenceEntries) {
      const list = entriesByLocation.get(entry.locationId) ?? [];
      list.push(entry);
      entriesByLocation.set(entry.locationId, list);
    }

    class InvestigationScene extends Phaser.Scene {
      private player!: MatterSpritePlayer;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private interactKey!: Phaser.Input.Keyboard.Key;
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

      /** 웹폰트 + 플레이어용 작은 텍스처(둥근 사각형) 생성 */
      preload() {
        this.load.font(FONT_KEY, FONT_URL, "opentype");
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x22d3ee, 1);
        g.fillRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.lineStyle(2, 0xa5f3fc, 1);
        g.strokeRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.generateTexture("player", PLAYER_SIZE, PLAYER_SIZE);
        g.destroy();

        preloadMapPropImages(this);
      }

      create() {
        setMapPropTexturesNearest(this);

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

        // 장소 영역 + 소품 + 이름 라벨
        layouts.forEach((d) => {
          const gfx = this.add.graphics();
          gfx.setDepth(0);
          gfx.fillStyle(0x164e63, 0.45);
          gfx.fillRoundedRect(d.x, d.y, d.w, d.h, 8);
          this.evidenceObjects.push(...placeLocationProps2D(this, entriesByLocation.get(d.id) ?? []));
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

        // 카메라가 플레이어 추적, 데드존으로 미세 흔들림 완화
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(120, 90);

        // 화면 고정 UI (스크롤 안 함)
        const hint = "방향키로 이동 · 소품에 닿으면 강조 · F 키로 조사";
        this.add
          .text(16, 16, hint, {
            fontFamily: FONT_KEY,
            fontSize: "15px",
            color: "#e2e8f0",
            backgroundColor: "#0f172acc",
            padding: { x: 10, y: 6 },
          })
          .setScrollFactor(0)
          .setDepth(100);
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

        if (hovered && Phaser.Input.Keyboard.JustDown(this.interactKey) && !modalOpenRef.current) {
          setSelectedEvidence(hovered.entry);
          registerDiscoveriesRef.current(hovered.entry.clues.map((c) => c.id));
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
        <span>{phaseLabel} — 탐색 중</span>
        <div className="flex items-center gap-3">
          <span>{activeEvidence ? `${activeEvidence.label} · F 조사` : "소품에 가까이 다가가세요"}</span>
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
              <button
                type="button"
                onClick={() => setInventoryOpen(false)}
                className="shrink-0 rounded p-1 text-[var(--muted-foreground)] hover:bg-white/10 hover:text-[var(--foreground)]"
              >
                <ChevronRight className="hidden h-4 w-4 md:block" aria-hidden />
                <ChevronUp className="h-4 w-4 md:hidden" aria-hidden />
              </button>
            </div>
            <ul className="min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-2">
              {discoveredClues.length === 0 ? (
                <li className="rounded-md border border-dashed border-[var(--border)] px-2 py-6 text-center text-[11px] text-[var(--muted-foreground)]">
                  소품을 조사하면 증거가 여기에 쌓입니다.
                </li>
              ) : (
                discoveredClues.map((clue) => (
                  <li key={clue.id} className="mb-1.5 last:mb-0">
                    <button
                      type="button"
                      onClick={() => openEvidenceFromInventory(clue)}
                      className="w-full rounded border border-[var(--border)] bg-black/20 px-2.5 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-black/35"
                    >
                      <span className="line-clamp-2">{clue.name?.trim() || "이름 없음"}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className={cn(
              "flex shrink-0 items-center justify-center gap-2 border-[var(--border)] bg-[rgba(15,23,42,0.85)] text-[var(--foreground)] transition-colors hover:bg-black/30",
              isFull
                ? "w-10 flex-col border-l py-2"
                : "h-10 w-full border-t md:h-auto md:w-10 md:flex-col md:border-l md:border-t-0 md:py-2",
            )}
          >
            <Package className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <ChevronLeft className="hidden h-4 w-4 md:block" aria-hidden />
            <ChevronDown className="h-4 w-4 md:hidden" aria-hidden />
          </button>
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
              <button
                type="button"
                onClick={() => setSelectedEvidence(null)}
                className="rounded-md border border-[var(--border)] px-3 py-1 text-sm text-[var(--foreground)]"
              >
                닫기
              </button>
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
