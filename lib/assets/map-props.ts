import * as Phaser from "phaser";

import { hasSupabaseEnv, supabase } from "@/lib/supabase";

/**
 * 탐색 맵 소품 — Supabase Storage 의 prop bucket 에서 동적으로 로딩.
 *
 * 어떤 prop 이 사용 가능한지 코드에 박지 않는다.
 * - 시나리오의 단서(`clues.props.asset`) 가 가리키는 파일을 런타임에 로딩한다.
 * - 충돌 모양은 표시 크기 기반 사각형으로 자동 계산한다 (별도 vertex 정의 불필요).
 * - asset 식별자에 확장자가 포함되어 있으면 그대로, 없으면 기본 `.svg` 를 붙인다.
 *
 * URL 우선순위:
 *   1) Supabase Storage public URL (env 가 있을 때)
 *   2) 로컬 `public/assets/props/*` 폴백
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUPABASE_PROPS_BUCKET   (기본: "props")
 *   NEXT_PUBLIC_SUPABASE_PROPS_PREFIX   (기본: "")  — bucket 내부 폴더 경로
 */

export const MAP_PROP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PROPS_BUCKET ?? "props";

const RAW_PREFIX = process.env.NEXT_PUBLIC_SUPABASE_PROPS_PREFIX ?? "";
export const MAP_PROP_PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, "");

/** 폴백용 로컬 경로 (개발 환경 / Supabase 미설정 시) */
export const MAP_PROP_LOCAL_BASE = "/assets/props";

/** 기본 표시 크기 (asset 의 w/h 가 모두 비어있을 때 사용) */
export const MAP_PROP_DEFAULT_SIZE = { w: 80, h: 80 };

/** asset 문자열에서 안전한 Phaser 텍스처 키를 만든다 */
export function mapPropTextureKey(asset: string): string {
  return `map_prop:${asset}`;
}

/** 확장자 보정 — 없으면 기본 `.svg` */
function normalizeAssetFilename(asset: string): string {
  const trimmed = asset.replace(/^\/+/, "");
  const hasExt = /\.[a-zA-Z0-9]+$/.test(trimmed);
  return hasExt ? trimmed : `${trimmed}.svg`;
}

/** bucket 내부의 object key (prefix + filename) */
function mapPropStorageKey(asset: string): string {
  const filename = normalizeAssetFilename(asset);
  return MAP_PROP_PREFIX ? `${MAP_PROP_PREFIX}/${filename}` : filename;
}

/** asset 문자열을 로딩 가능한 URL 로 변환 */
export function mapPropAssetUrl(asset: string): string {
  if (hasSupabaseEnv) {
    const { data } = supabase.storage
      .from(MAP_PROP_BUCKET)
      .getPublicUrl(mapPropStorageKey(asset));
    if (data?.publicUrl) return data.publicUrl;
  }
  return `${MAP_PROP_LOCAL_BASE}/${normalizeAssetFilename(asset)}`;
}

/**
 * Scene.preload 안에서 호출.
 * 실제 사용되는 asset 들의 키 집합만 받아 로딩한다.
 * (수백 개 prop 이 있어도 시나리오에서 쓰는 것만 다운로드)
 */
export function preloadMapPropImages(scene: Phaser.Scene, assets: Iterable<string>): void {
  const seen = new Set<string>();
  for (const asset of assets) {
    if (!asset || seen.has(asset)) continue;
    seen.add(asset);
    const key = mapPropTextureKey(asset);
    if (scene.textures.exists(key)) continue;
    scene.load.image(key, mapPropAssetUrl(asset));
  }
}

/** create 첫머리 등에서 호출 — 확대 시 도트 느낌 유지 */
export function setMapPropTexturesNearest(
  scene: Phaser.Scene,
  assets: Iterable<string>,
): void {
  for (const asset of assets) {
    if (!asset) continue;
    const key = mapPropTextureKey(asset);
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}
