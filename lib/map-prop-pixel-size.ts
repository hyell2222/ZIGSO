import { MAP_GRID_STEP_PX, snapSizePxToGrid } from "@/lib/map-location-style";

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
 * 맵 에디터 기준 표시 크기(px). `props.w`/`h`(DB 저장) 우선,
 * 없으면 `tile_w`/`tile_h`, 없으면 기본 2×2칸.
 */
export function mapPropDisplayEditorPx(
  props: {
    tile_w?: unknown;
    tile_h?: unknown;
    w?: unknown;
    h?: unknown;
  } | null | undefined,
): { w: number; h: number } {
  if (!props) return mapDefaultPropPixelSize();
  const pw = parsePositiveNumber(props.w);
  const ph = parsePositiveNumber(props.h);
  if (pw != null && ph != null) {
    return { w: Math.round(pw), h: Math.round(ph) };
  }
  const tw = parsePositiveTileCount(props.tile_w);
  const th = parsePositiveTileCount(props.tile_h);
  if (tw != null && th != null) {
    return { w: tw * MAP_GRID_STEP_PX, h: th * MAP_GRID_STEP_PX };
  }
  return mapDefaultPropPixelSize();
}

/**
 * 맵 월드(예: 848×592) 기준으로 가로·세로 각 약 40%를 넘지 않게 비율 유지 축소.
 * 첫 드롭 배치·고해상도 PNG 기본 크기에 사용. 둘 다 상한 이하면 격자 스냅만 한다.
 */
export function clampPropFootprintToEditorWorld(
  widthPx: number,
  heightPx: number,
  worldW: number,
  worldH: number,
  gridStep: number = MAP_GRID_STEP_PX,
): { w: number; h: number } {
  let w = widthPx;
  let h = heightPx;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return mapDefaultPropPixelSize();
  }
  if (!Number.isFinite(worldW) || !Number.isFinite(worldH) || worldW <= 0 || worldH <= 0) {
    return {
      w: snapSizePxToGrid(w, gridStep),
      h: snapSizePxToGrid(h, gridStep),
    };
  }
  const maxW = Math.max(gridStep, Math.floor(worldW * 0.4));
  const maxH = Math.max(gridStep, Math.floor(worldH * 0.4));
  if (w > maxW || h > maxH) {
    const scale = Math.min(maxW / w, maxH / h, 1);
    w *= scale;
    h *= scale;
  }
  return {
    w: snapSizePxToGrid(Math.max(gridStep, Math.round(w)), gridStep),
    h: snapSizePxToGrid(Math.max(gridStep, Math.round(h)), gridStep),
  };
}

/**
 * 맵 **에디터 캔버스** 안에서만: 한 변이 `worldW` / `worldH` 를 넘지 않도록 격자 스냅.
 * (`clampPropFootprintToEditorWorld` 의 ~40% 상한은 첫 배치·초기 과대 방지에 쓰고,
 *  에디터에서는 캔버스 전체까지 키울 수 있게 이 함수를 쓴다.)
 */
export function clampPropFootprintToMapEditorCanvas(
  widthPx: number,
  heightPx: number,
  worldW: number,
  worldH: number,
  gridStep: number = MAP_GRID_STEP_PX,
): { w: number; h: number } {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return mapDefaultPropPixelSize();
  }
  if (!Number.isFinite(worldW) || !Number.isFinite(worldH) || worldW <= 0 || worldH <= 0) {
    return {
      w: snapSizePxToGrid(Math.max(gridStep, widthPx), gridStep),
      h: snapSizePxToGrid(Math.max(gridStep, heightPx), gridStep),
    };
  }
  return {
    w: snapSizePxToGrid(Math.max(gridStep, Math.min(worldW, widthPx)), gridStep),
    h: snapSizePxToGrid(Math.max(gridStep, Math.min(worldH, heightPx)), gridStep),
  };
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
