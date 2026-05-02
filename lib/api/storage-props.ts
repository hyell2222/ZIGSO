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
  /** 예약 필드 — 단서 크기는 `props.tile_w`/`tile_h` 또는 레거시 `props.w`/`h` */
  tileW: number | null;
  tileH: number | null;
};

/**
 * Supabase Storage 의 props bucket 안에 있는 목록을 반환.
 * Supabase env 가 없으면 빈 배열을 돌려준다 (호출자가 폴백 처리).
 */
export async function listPropAssets(): Promise<PropAsset[]> {
  if (!hasSupabaseEnv) return [];

  const storageRes = await supabase.storage.from(MAP_PROP_BUCKET).list(MAP_PROP_PREFIX || "", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (storageRes.error) throw storageRes.error;

  const files = (storageRes.data ?? []).filter(
    (entry) => entry?.name && /\.(svg|png|jpe?g|webp|gif)$/i.test(entry.name),
  );

  return files.map((entry) => {
    const cleaned = entry.name.replace(/^\/+/, "");
    const dot = cleaned.lastIndexOf(".");
    const asset = dot > 0 ? cleaned.slice(0, dot) : cleaned;
    return {
      asset,
      filename: cleaned,
      url: mapPropAssetUrl(cleaned),
      tileW: null,
      tileH: null,
    };
  });
}

/** 디버그/안내용으로 사용 — 로컬 폴백 경로 안내 */
export const PROP_LOCAL_BASE_URL = MAP_PROP_LOCAL_BASE;
