import { MAP_GRID_STEP_PX } from "@/lib/map-location-style";

/**
 * 타일 수 메타가 없을 때 쓰는 기본 소품이 차지하는 격자 칸 수.
 * (가로·세로 × `MAP_GRID_STEP_PX` px)
 */
export const MAP_PROP_DEFAULT_TILE_SPAN = { w: 2, h: 2 } as const;

export function mapDefaultPropPixelSize(): { w: number; h: number } {
  return {
    w: MAP_PROP_DEFAULT_TILE_SPAN.w * MAP_GRID_STEP_PX,
    h: MAP_PROP_DEFAULT_TILE_SPAN.h * MAP_GRID_STEP_PX,
  };
}

function parsePositiveNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parsePositiveTileCount(v: unknown): number | null {
  const n = parsePositiveNumber(v);
  if (n == null) return null;
  return Math.max(1, Math.round(n));
}

/**
 * 맵 에디터 좌표계에서 소품 박스 크기(px).
 * - `tile_w` / `tile_h`(격자 칸 수)가 있으면 그것만 사용.
 * - 없으면 레거시 `w` / `h`(픽셀).
 * - 둘 다 없거나 유효하지 않으면 기본 2×2칸.
 */
export function mapPropFootprintEditorPx(
  props: {
    tile_w?: unknown;
    tile_h?: unknown;
    w?: unknown;
    h?: unknown;
  } | null | undefined,
): { w: number; h: number } {
  if (!props) return mapDefaultPropPixelSize();
  const tw = parsePositiveTileCount(props.tile_w);
  const th = parsePositiveTileCount(props.tile_h);
  if (tw != null && th != null) {
    return { w: tw * MAP_GRID_STEP_PX, h: th * MAP_GRID_STEP_PX };
  }
  const pw = parsePositiveNumber(props.w);
  const ph = parsePositiveNumber(props.h);
  if (pw != null && ph != null) {
    return { w: Math.round(pw), h: Math.round(ph) };
  }
  return mapDefaultPropPixelSize();
}

/**
 * 타일 수(정수)를 맵 격자 `MAP_GRID_STEP_PX` 기준 픽셀 크기로 변환.
 * (AI propCatalog 등 — 소품 목록에는 타일을 쓰지 않고 기본값만 넣을 때 `null,null` → 2×2칸)
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
  return mapDefaultPropPixelSize();
}
