"use client";

import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import {
  MAP_PROP_BUCKET,
  MAP_PROP_LOCAL_BASE,
  MAP_PROP_PREFIX,
  mapPropAssetUrl,
} from "@/lib/assets/map-props";

export type PropAsset = {
  /** 확장자 제외 식별자 (예: "blackboard"). DB clues.props.asset 에 저장될 값 */
  asset: string;
  /** 원본 파일명 (확장자 포함) */
  filename: string;
  /** 사이드바 썸네일/맵 렌더용 public URL */
  url: string;
  /** `asset_metadata` 기준 기본 타일 크기 (없으면 자연 크기 폴백) */
  tileW: number | null;
  tileH: number | null;
};

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

/** 폴더 내부 파일 항목만 추려 PropAsset 으로 변환 */
function toPropAsset(
  filename: string,
  metaByAsset: Map<string, { tileW: number | null; tileH: number | null }>,
): PropAsset {
  const cleaned = filename.replace(/^\/+/, "");
  const dot = cleaned.lastIndexOf(".");
  const asset = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const meta = metaByAsset.get(asset.toLowerCase()) ?? null;
  return {
    asset,
    filename: cleaned,
    url: mapPropAssetUrl(cleaned),
    tileW: meta?.tileW ?? null,
    tileH: meta?.tileH ?? null,
  };
}

/**
 * Supabase Storage 의 prop bucket 안에 있는 SVG/이미지 자산 목록을 반환.
 * Supabase env 가 없으면 빈 배열을 돌려준다 (호출자가 폴백 처리).
 */
export async function listPropAssets(): Promise<PropAsset[]> {
  if (!hasSupabaseEnv) return [];

  const [storageRes, metaRes] = await Promise.all([
    supabase.storage.from(MAP_PROP_BUCKET).list(MAP_PROP_PREFIX || "", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    }),
    supabase.from("asset_metadata").select("asset,filename,tile_w,tile_h"),
  ]);
  if (storageRes.error) throw storageRes.error;
  if (metaRes.error) throw metaRes.error;

  const files = (storageRes.data ?? []).filter(
    (entry) => entry?.name && /\.(svg|png|jpe?g|webp|gif)$/i.test(entry.name),
  );
  const existingFilenameSet = new Set(files.map((entry) => entry.name.toLowerCase()));

  const metaByAsset = new Map<string, { tileW: number | null; tileH: number | null }>();
  const fromMetadata: PropAsset[] = [];
  for (const row of metaRes.data ?? []) {
    const asset = typeof row.asset === "string" ? row.asset.trim() : "";
    const filename = typeof row.filename === "string" ? row.filename.trim() : "";
    const tileW = parsePositiveInt(row.tile_w);
    const tileH = parsePositiveInt(row.tile_h);
    const meta = { tileW, tileH };
    if (asset) metaByAsset.set(asset.toLowerCase(), meta);
    // `asset` 오타가 있어도 filename stem 으로 매칭되게 보강
    if (filename) {
      const dot = filename.lastIndexOf(".");
      const stem = (dot > 0 ? filename.slice(0, dot) : filename).replace(/^\/+/, "");
      if (stem) metaByAsset.set(stem.toLowerCase(), meta);
      if (!existingFilenameSet.has(filename.toLowerCase())) continue;
      fromMetadata.push({
        asset: asset || stem,
        filename,
        url: mapPropAssetUrl(filename),
        tileW,
        tileH,
      });
    }
  }

  // metadata 에 없는 파일도 노출하되 tile 은 null 로 둔다.
  const metadataFilenameSet = new Set(fromMetadata.map((a) => a.filename.toLowerCase()));
  const extras = files
    .filter((entry) => !metadataFilenameSet.has(entry.name.toLowerCase()))
    .map((entry) => toPropAsset(entry.name, metaByAsset));
  return [...fromMetadata, ...extras];
}

/** 디버그/안내용으로 사용 — 로컬 폴백 경로 안내 */
export const PROP_LOCAL_BASE_URL = MAP_PROP_LOCAL_BASE;
