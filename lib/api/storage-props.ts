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
};

/** 폴더 내부 파일 항목만 추려 PropAsset 으로 변환 */
function toPropAsset(filename: string): PropAsset {
  const cleaned = filename.replace(/^\/+/, "");
  const dot = cleaned.lastIndexOf(".");
  const asset = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  return { asset, filename: cleaned, url: mapPropAssetUrl(cleaned) };
}

/**
 * Supabase Storage 의 prop bucket 안에 있는 SVG/이미지 자산 목록을 반환.
 * Supabase env 가 없으면 빈 배열을 돌려준다 (호출자가 폴백 처리).
 */
export async function listPropAssets(): Promise<PropAsset[]> {
  if (!hasSupabaseEnv) return [];

  const { data, error } = await supabase.storage
    .from(MAP_PROP_BUCKET)
    .list(MAP_PROP_PREFIX || "", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
  if (error) throw error;

  const files = (data ?? []).filter(
    (entry) => entry?.name && /\.(svg|png|jpe?g|webp|gif)$/i.test(entry.name),
  );
  return files.map((entry) => toPropAsset(entry.name));
}

/** 디버그/안내용으로 사용 — 로컬 폴백 경로 안내 */
export const PROP_LOCAL_BASE_URL = MAP_PROP_LOCAL_BASE;
