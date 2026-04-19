/**
 * Scenario create wizard 의 공용 도메인 타입.
 *
 * tempId 는 클라이언트에서만 쓰이는 임시 ID. (DB 저장 시점에는 사용되지 않음)
 * 캐릭터/단서 사이 참조를 안정적으로 잇기 위해 사용한다.
 */

export type DraftCharacter = {
  tempId: string;
  name: string;
  role: string;
};

export type DraftClue = {
  tempId: string;
  /** 어느 캐릭터의 방에 배치된 단서인지 */
  characterTempId: string;
  /** prop 에셋 식별자 (예: "blackboard") */
  asset: string;
  /** 월드 픽셀 좌표 (좌상단 0,0 기준, 중심점) */
  x: number;
  y: number;
  /** 표시 크기 (px) */
  w: number;
  h: number;
  /** 단서 이름/설명 — 학생에게 노출됨 */
  name: string;
  content: string;
};

/** 맵 에디터에서 캐릭터마다 보여주는 월드 사이즈 */
export const MAP_EDITOR_WORLD = { w: 800, h: 600 } as const;

/** prop 기본 표시 크기 (드롭 시 폴백) */
export const PROP_DEFAULT_DROP_SIZE = { w: 80, h: 80 } as const;

/** 드래그 데이터 식별자 — 사이드바 → 맵 드롭 */
export const DRAG_TYPE_PROP = "application/x-codezero-prop-asset";
