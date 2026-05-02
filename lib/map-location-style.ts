import type { CSSProperties } from "react";

/**
 * 사건 장소(location) 영역 — 플레이 Phaser 맵과 어드민 맵 에디터에서 동일하게 사용.
 * 팔레트: 입장 랜딩(`--entry-shell` / `--primary` / `--accent`)과 맞춘 갈흑·칠판초록·한지 톤.
 */

export const MAP_WORLD_BACKGROUND = 0x1a1511 as const;
/** CSS `background-color` (Phaser `MAP_WORLD_BACKGROUND` 와 동일) */
export const MAP_WORLD_BACKGROUND_HEX = "#1a1511" as const;

/** 월드 전체 격자 (장소 박스 아래에 그려짐) — `var(--entry-grid)` 에 가깝게. 작을수록 배치·스냅이 촘촘함 */
export const MAP_GRID_STEP_PX = 16 as const;
export const MAP_GRID_LINE = { width: 1, color: 0x2a4a3c as const, alpha: 0.38 as const };

/**
 * `sizePx` 이상으로, `stepPx` 격자에 맞추되 타일 개수(sizePx/step)가 홀수가 되도록 올림.
 * 홀수 칸이면 월드 기하학적 중앙이 한 타일의 중심과 같다(중앙 소품 배치에 유리).
 */
export function snapDimensionToOddTileCount(
  sizePx: number,
  stepPx: number = MAP_GRID_STEP_PX,
): number {
  if (!Number.isFinite(sizePx) || sizePx <= 0 || !Number.isFinite(stepPx) || stepPx <= 0) {
    return Math.max(0, sizePx);
  }
  const tiles = Math.ceil(sizePx / stepPx);
  const oddTiles = tiles % 2 === 1 ? tiles : tiles + 1;
  return oddTiles * stepPx;
}

/**
 * 월드 좌표를 가장 가까운 격자 **칸 중심**으로 스냅.
 * 한 칸은 `[k·step, (k+1)·step]` 구간이고 중심은 `k·step + step/2`.
 */
export function snapWorldPointToNearestTileCenter(
  x: number,
  y: number,
  stepPx: number = MAP_GRID_STEP_PX,
): { x: number; y: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(stepPx) || stepPx <= 0) {
    return { x, y };
  }
  const half = stepPx * 0.5;
  const ix = Math.round((x - half) / stepPx);
  const iy = Math.round((y - half) / stepPx);
  return { x: ix * stepPx + half, y: iy * stepPx + half };
}

/** 가로·세로 픽셀 길이를 격자에 맞춤(최소 한 칸). 에디터·저장 시 공통 사용 */
export function snapSizePxToGrid(sizePx: number, stepPx: number = MAP_GRID_STEP_PX): number {
  if (!Number.isFinite(sizePx) || sizePx <= 0 || !Number.isFinite(stepPx) || stepPx <= 0) {
    return stepPx;
  }
  return Math.max(stepPx, Math.round(sizePx / stepPx) * stepPx);
}

/** 장소 사각형: 칠판초록(--primary) 얕은 면 + 아코디언(--accent) 테두리 느낌 */
export const MAP_LOCATION_FILL = { color: 0x1b4a3a as const, alpha: 0.4 as const };
export const MAP_LOCATION_STROKE = {
  width: 2,
  color: 0x8a7355 as const,
  alpha: 0.45 as const,
} as const;
export const MAP_LOCATION_CORNER_RADIUS = 8 as const;

/** 바깥 월드 테두리 (플레이 맵 전용) */
export const MAP_WORLD_OUTER_STROKE = { width: 2, color: 0x5a4d42 as const, alpha: 0.5 as const };

function rgbaFromHex(hex: number, alpha: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 맵 에디터 캔버스: 월드 배경 + 장소 틴트 + 플레이와 동일한 격자 */
export function mapEditorLocationCanvasStyle(
  worldW: number,
  worldH: number,
  gridCell: number = MAP_GRID_STEP_PX,
): CSSProperties {
  const gridLine = rgbaFromHex(MAP_GRID_LINE.color, MAP_GRID_LINE.alpha);
  /** 세로선(to right) + 가로선(to bottom) — CSS 에서는 레이어당 background-size 가 필요하다. */
  const gridVertical = `linear-gradient(to right, ${gridLine} 1px, transparent 1px)`;
  const gridHorizontal = `linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  const tint = `linear-gradient(${rgbaFromHex(MAP_LOCATION_FILL.color, MAP_LOCATION_FILL.alpha)}, ${rgbaFromHex(MAP_LOCATION_FILL.color, MAP_LOCATION_FILL.alpha)})`;
  const gridSizeX = `${100 / (worldW / gridCell)}%`;
  const gridSizeY = `${100 / (worldH / gridCell)}%`;
  const gridTile = `${gridSizeX} ${gridSizeY}`;
  // 첫 번째가 위쪽 레이어 — 플레이 맵과 같이 격자 위에 장소 틴트가 올라간다.
  return {
    backgroundColor: MAP_WORLD_BACKGROUND_HEX,
    backgroundImage: `${tint}, ${gridVertical}, ${gridHorizontal}`,
    backgroundSize: `auto, ${gridTile}, ${gridTile}`,
    border: `${MAP_LOCATION_STROKE.width}px solid ${rgbaFromHex(MAP_LOCATION_STROKE.color, MAP_LOCATION_STROKE.alpha)}`,
    borderRadius: MAP_LOCATION_CORNER_RADIUS,
  };
}
