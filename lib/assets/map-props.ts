import * as Phaser from "phaser";

/**
 * 탐색 맵 소품 — `public/assets/props/*.svg` 와 1:1 대응.
 * 다른 씬·컴포넌트에서도 동일 키·URL로 재사용 가능.
 */
export const MAP_PROP_BASE = "/assets/props";

export const MapPropTextureKey = {
  desk: "map_prop_desk",
  drawer: "map_prop_drawer",
  shelf: "map_prop_shelf",
  chair: "map_prop_chair",
  lamp: "map_prop_lamp",
} as const;

export type MapPropId = keyof typeof MapPropTextureKey;

export const MAP_PROP_FILES: Record<MapPropId, string> = {
  desk: "desk.svg",
  drawer: "drawer.svg",
  shelf: "shelf.svg",
  chair: "chair.svg",
  lamp: "lamp.svg",
};

/** 원본 픽셀 크기(비율 계산용) — 에셋 교체 시 여기만 맞추면 됨 */
export const MAP_PROP_NATURAL_SIZE: Record<MapPropId, { w: number; h: number }> = {
  desk: { w: 40, h: 22 },
  drawer: { w: 24, h: 48 },
  shelf: { w: 28, h: 56 },
  chair: { w: 20, h: 28 },
  lamp: { w: 16, h: 36 },
};

/**
 * Matter `fromVerts`용 경로 — 텍스처 자연 픽셀 좌표(0,0 = 좌상단)에 맞춘 불투명 실루엣 외곽.
 * `setDisplaySize`로 스케일할 때 Transform이 body도 같은 비율로 맞춤.
 */
export const MAP_PROP_COLLISION_VERTS: Record<MapPropId, string> = {
  desk: "4 6 36 6 36 20 32 20 32 22 28 22 28 20 12 20 12 22 8 22 8 20 4 20 4 6",
  drawer: "2 2 22 2 22 46 2 46 2 2",
  shelf: "2 2 26 2 26 54 2 54 2 2",
  chair: "6 2 14 2 14 14 18 16 18 22 16 22 16 26 13 26 13 22 7 22 7 26 4 26 4 22 2 22 2 16 6 14 6 2",
  lamp: "2 4 14 4 14 16 10 16 10 34 6 34 6 16 2 16 2 4",
};

export function mapPropAssetUrl(id: MapPropId): string {
  return `${MAP_PROP_BASE}/${MAP_PROP_FILES[id]}`;
}

const MAP_PROP_IDS = Object.keys(MapPropTextureKey) as MapPropId[];

/** Scene.preload 안에서 호출 */
export function preloadMapPropImages(scene: Phaser.Scene): void {
  for (const id of MAP_PROP_IDS) {
    scene.load.image(MapPropTextureKey[id], mapPropAssetUrl(id));
  }
}

/** load 완료 후(create 첫머리 등) 호출 — 확대 시 도트 느낌 유지 */
export function setMapPropTexturesNearest(scene: Phaser.Scene): void {
  for (const id of MAP_PROP_IDS) {
    const key = MapPropTextureKey[id];
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}
