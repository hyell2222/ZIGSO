import type { CSSProperties } from "react";

/**
 * 시나리오 장소(location) 영역 — 플레이 Phaser 맵과 어드민 맵 에디터에서 동일하게 사용.
 */

export const MAP_WORLD_BACKGROUND = 0x0f172a as const;
/** CSS `background-color` (Phaser `MAP_WORLD_BACKGROUND` 와 동일) */
export const MAP_WORLD_BACKGROUND_HEX = "#0f172a" as const;

/** 월드 전체 격자 (장소 박스 아래에 그려짐) */
export const MAP_GRID_STEP_PX = 40 as const;
export const MAP_GRID_LINE = { width: 1, color: 0x1e293b as const, alpha: 0.85 as const };

/** 장소 사각형 채움·테두리 (플레이 맵 `layouts` / 에디터 단일 장소 캔버스) */
export const MAP_LOCATION_FILL = { color: 0x164e63 as const, alpha: 0.45 as const };
export const MAP_LOCATION_STROKE = {
  width: 2,
  color: 0x22d3ee as const,
  alpha: 0.35 as const,
} as const;
export const MAP_LOCATION_CORNER_RADIUS = 8 as const;

/** 바깥 월드 테두리 (플레이 맵 전용) */
export const MAP_WORLD_OUTER_STROKE = { width: 2, color: 0x334155 as const, alpha: 0.6 as const };

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
