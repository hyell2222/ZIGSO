import { MAP_GRID_STEP_PX } from "@/lib/map-location-style";

/** 맵 에디터 드롭 기본값·`MAP_PROP_DEFAULT_SIZE` 와 동일 */
export const MAP_PROP_EDITOR_DEFAULT_PIXEL_SIZE = { w: 80, h: 80 } as const;

/**
 * `asset_metadata.tile_w` / `tile_h`(타일 단위)를 맵 에디터·AI 생성과 동일한 픽셀 크기로 변환.
 * DB 값이 없으면 기본 80×80.
 */
export function mapPixelSizeFromAssetTiles(
  tileW: number | null,
  tileH: number | null,
): { w: number; h: number } {
  if (
    tileW != null &&
    tileH != null &&
    Number.isFinite(tileW) &&
    Number.isFinite(tileH) &&
    tileW > 0 &&
    tileH > 0
  ) {
    return {
      w: Math.round(tileW * MAP_GRID_STEP_PX),
      h: Math.round(tileH * MAP_GRID_STEP_PX),
    };
  }
  return { ...MAP_PROP_EDITOR_DEFAULT_PIXEL_SIZE };
}
