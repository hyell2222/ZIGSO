"use client";

import * as Phaser from "phaser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ScenarioClueForMap, ScenarioLocationForMap } from "@/lib/api/play";
import { cn } from "@/lib/utils";

const DEFAULT_WORLD_W = 2000;
const DEFAULT_WORLD_H = 1400;
const PLAYER_SIZE = 28;
const SPEED = 220;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * 장소 `information` JSON에 좌표가 있으면 사용합니다.
 * 예: `{ "map": { "x": 320, "y": 280, "w": 180, "h": 120 } }`
 * 또는 최상위 `mapX`, `mapY`, `mapW`, `mapH`
 */
function readMapRectFromInformation(info: Record<string, unknown> | null): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (!info) return null;
  const map = info.map;
  const src =
    map && typeof map === "object" && !Array.isArray(map) ? (map as Record<string, unknown>) : info;
  const x = num(src.x ?? src.mapX);
  const y = num(src.y ?? src.mapY);
  const w = num(src.w ?? src.mapW ?? src.width);
  const h = num(src.h ?? src.mapH ?? src.height);
  if (x === null || y === null || w === null || h === null) return null;
  if (w < 40 || h < 40) return null;
  return { x, y, w, h };
}

function autoLayoutLocation(index: number, total: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / cols));
  const pad = 100;
  const cellW = (DEFAULT_WORLD_W - pad * 2) / cols;
  const cellH = (DEFAULT_WORLD_H - pad * 2) / rows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const w = Math.min(240, cellW - 32);
  const h = Math.min(180, cellH - 32);
  const x = pad + col * cellW + (cellW - w) / 2;
  const y = pad + row * cellH + (cellH - h) / 2;
  return { x, y, w, h };
}

type LocationLayout = { id: string; name: string | null; x: number; y: number; w: number; h: number };

function asInfoRecord(v: ScenarioLocationForMap["information"]): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function buildLocationLayouts(locations: ScenarioLocationForMap[]): LocationLayout[] {
  const sorted = [...locations].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((loc, i) => {
    const parsed = readMapRectFromInformation(asInfoRecord(loc.information));
    if (parsed) return { id: loc.id, name: loc.name, ...parsed };
    const auto = autoLayoutLocation(i, sorted.length);
    return { id: loc.id, name: loc.name, ...auto };
  });
}

type CluePlacement = { clueId: string; x: number; y: number; label: string };

function buildCluePlacements(clues: ScenarioClueForMap[], layouts: LocationLayout[]): CluePlacement[] {
  const byLoc = new Map<string, ScenarioClueForMap[]>();
  for (const c of clues) {
    if (!c.location_id) continue;
    const list = byLoc.get(c.location_id) ?? [];
    list.push(c);
    byLoc.set(c.location_id, list);
  }
  const layoutById = new Map(layouts.map((L) => [L.id, L]));
  const out: CluePlacement[] = [];
  for (const [locId, list] of byLoc) {
    const L = layoutById.get(locId);
    if (!L) continue;
    const cx = L.x + L.w / 2;
    const cy = L.y + L.h / 2;
    const n = list.length;
    list.forEach((clue, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const radius = n === 1 ? 0 : 32 + Math.min(48, n * 6);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const label = clue.name?.trim() || "단서";
      out.push({ clueId: clue.id, x, y, label });
    });
  }
  return out;
}

function computeWorldSize(layouts: LocationLayout[], placements: CluePlacement[]) {
  let w = DEFAULT_WORLD_W;
  let h = DEFAULT_WORLD_H;
  for (const L of layouts) {
    w = Math.max(w, L.x + L.w + 120);
    h = Math.max(h, L.y + L.h + 120);
  }
  for (const p of placements) {
    w = Math.max(w, p.x + 80);
    h = Math.max(h, p.y + 80);
  }
  return { w, h };
}

type InvestigationMapProps = {
  className?: string;
  variant?: "embedded" | "fullscreen";
  /** 상단 상태줄에 표시 (예: 1차 현장 / 2차 현장) */
  phaseLabel?: string;
  locations?: ScenarioLocationForMap[];
  clues?: ScenarioClueForMap[];
  onEvidenceProgress?: (found: number, total: number) => void;
};

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

export function InvestigationMap({
  className,
  variant = "embedded",
  phaseLabel = "1차 현장",
  locations: locationsProp,
  clues: cluesProp,
  onEvidenceProgress,
}: InvestigationMapProps) {
  const locations = locationsProp ?? [];
  const clues = cluesProp ?? [];

  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(onEvidenceProgress);
  const [foundCount, setFoundCount] = useState(0);

  const layoutData = useMemo(() => {
    const layouts = buildLocationLayouts(locations);
    const placements = buildCluePlacements(clues, layouts);
    const { w, h } = computeWorldSize(layouts, placements);
    return { layouts, placements, worldW: w, worldH: h };
  }, [locations, clues]);

  const totalCollectibles = layoutData.placements.length;

  useEffect(() => {
    progressRef.current = onEvidenceProgress;
  }, [onEvidenceProgress]);

  const notifyProgress = useCallback((found: number, total: number) => {
    setFoundCount(found);
    progressRef.current?.(found, total);
  }, []);

  useEffect(() => {
    setFoundCount(0);
    const parent = hostRef.current;
    if (!parent) return;

    const { layouts, placements, worldW, worldH } = layoutData;
    const total = placements.length;

    class InvestigationScene extends Phaser.Scene {
      private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private found = 0;

      constructor() {
        super({ key: "InvestigationScene" });
      }

      preload() {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x22d3ee, 1);
        g.fillRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.lineStyle(2, 0xa5f3fc, 1);
        g.strokeRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 6);
        g.generateTexture("player", PLAYER_SIZE, PLAYER_SIZE);
        g.destroy();
      }

      create() {
        this.physics.world.setBounds(0, 0, worldW, worldH);

        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 1);
        bg.fillRect(0, 0, worldW, worldH);
        bg.lineStyle(2, 0x334155, 0.6);
        bg.strokeRect(2, 2, worldW - 4, worldH - 4);

        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1e293b, 0.85);
        for (let x = 0; x <= worldW; x += 40) {
          grid.lineBetween(x, 0, x, worldH);
        }
        for (let y = 0; y <= worldH; y += 40) {
          grid.lineBetween(0, y, worldW, y);
        }

        layouts.forEach((d) => {
          const gfx = this.add.graphics();
          gfx.fillStyle(0x164e63, 0.45);
          gfx.fillRoundedRect(d.x, d.y, d.w, d.h, 8);
          gfx.lineStyle(2, 0x22d3ee, 0.35);
          gfx.strokeRoundedRect(d.x, d.y, d.w, d.h, 8);
          const title = d.name?.trim() || "장소";
          this.add.text(d.x + 12, d.y + 10, title, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            color: "#94a3b8",
          });
        });

        const startX =
          layouts.length > 0 ? layouts[0].x + layouts[0].w / 2 : worldW / 2;
        const startY =
          layouts.length > 0 ? layouts[0].y + layouts[0].h / 2 : worldH / 2;
        this.player = this.physics.add.sprite(startX, startY, "player");
        this.player.setCollideWorldBounds(true);
        this.player.setDrag(800);
        this.player.setMaxVelocity(SPEED, SPEED);

        const evidenceGroup = this.physics.add.staticGroup();
        placements.forEach((p) => {
          const zone = this.add.rectangle(p.x, p.y, 28, 28, 0xfbbf24, 0.95);
          zone.setStrokeStyle(2, 0xfde68a);
          zone.setData("clueId", p.clueId);
          this.physics.add.existing(zone, true);
          evidenceGroup.add(zone);
          this.add.text(p.x - 40, p.y - 40, p.label, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            color: "#fcd34d",
          });
        });

        this.physics.add.overlap(this.player, evidenceGroup, (_player, obj) => {
          const sprite = obj as Phaser.GameObjects.Rectangle;
          if (!sprite.active) return;
          sprite.destroy();
          this.found += 1;
          notifyProgress(this.found, total);
        });

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(120, 90);

        const hint =
          total > 0
            ? "방향키로 이동 · 노란 표식에 접촉해 단서를 수집하세요"
            : "방향키로 이동 · 이 시나리오에는 장소에 연결된 단서가 없습니다";
        this.add.text(16, 16, hint, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#e2e8f0",
          backgroundColor: "#0f172acc",
          padding: { x: 10, y: 6 },
        }).setScrollFactor(0);
      }

      update() {
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
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent,
      width: initial.width,
      height: variant === "fullscreen" ? initial.height : 420,
      backgroundColor: "#020617",
      physics: {
        default: "arcade",
        arcade: {
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
    if (variant === "fullscreen" && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const { width, height } = readHostSize(parent);
        game.scale.resize(width, height);
      });
      ro.observe(parent);
    }

    return () => {
      ro?.disconnect();
      game.destroy(true);
    };
  }, [layoutData, notifyProgress, variant]);

  const isFull = variant === "fullscreen";

  return (
    <div
      className={cn(
        isFull ? "relative flex h-full min-h-0 w-full flex-col bg-slate-950" : "",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-slate-800 text-xs text-slate-400",
          isFull ? "border-b px-4 py-2" : "mb-2",
          !isFull && "px-0",
        )}
      >
        <span>{phaseLabel} — 탐색 중</span>
        <span className="font-mono text-amber-200/90">
          단서 수집 {foundCount} / {Math.max(totalCollectibles, 0)}
        </span>
      </div>
      <div
        ref={hostRef}
        className={cn(
          "w-full overflow-hidden bg-slate-950",
          isFull ? "min-h-0 flex-1" : "min-h-[420px] rounded-md border border-slate-700",
        )}
      />
      {!isFull ? (
        <p className="mt-2 text-xs text-slate-500">
          키보드 방향키(↑↓←→)로 맵을 돌아다니며 장소에 배치된 단서를 찾을 수 있습니다.
        </p>
      ) : (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-slate-500">
          방향키 ↑↓←→ · 노란 표식 = clues (location 기준)
        </p>
      )}
    </div>
  );
}
