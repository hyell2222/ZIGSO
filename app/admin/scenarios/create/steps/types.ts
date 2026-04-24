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
  /**
   * 어느 캐릭터의 장소에 배치된 단서인지.
   * 최종 미션(Final Mission) 전용 맵의 단서는 RESOLUTION_LOCATION_TEMP_ID 를 사용한다.
   */
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
  /**
   * 최종 미션 2단계: 미션 타겟(Mission Target) 표식.
   * - 학생이 최종 미션 맵에서 이 소품을 조사하면 타겟 발견으로 처리된다.
   * - 시나리오 전체에서 1개만 의미 있다 (최종 미션 맵의 clue 권장).
   */
  isResolutionTarget?: boolean;
  /**
   * 최종 미션 3단계: 제출 아이템(Required Items) 표식.
   * - 학생이 모달에서 이 표식이 달린 clue 들을 정확히 골라 제출해야 클리어 조건이 충족된다.
   * - 정확히 3개 권장 (UI 가 강제).
   */
  isResolutionUnlockItem?: boolean;
};

/**
 * 최종 미션(Final Mission) 전용 맵을 가리키는 sentinel tempId.
 * MapEditorStep 의 탭과 DraftClue.characterTempId 모두에서 동일하게 사용된다.
 * (DB 의 character_id 와 충돌하지 않도록 일반 Math.random 결과와 다른 형태를 쓴다)
 */
export const RESOLUTION_LOCATION_TEMP_ID = "__resolution_location__" as const;

/**
 * 맵 에디터에서 캐릭터마다 보여주는 월드 사이즈.
 * 학생 맵도 같은 좌표 공간으로 해석하므로(lib/assets/map-props.ts 의 MAP_EDITOR_SPACE)
 * 여기선 단일 진리원을 재-export 한다.
 */
export { MAP_EDITOR_SPACE as MAP_EDITOR_WORLD } from "@/lib/assets/map-props";

/** prop 기본 표시 크기 (드롭 시 폴백) */
export const PROP_DEFAULT_DROP_SIZE = { w: 80, h: 80 } as const;

/** 드래그 데이터 식별자 — 사이드바 → 맵 드롭 */
export const DRAG_TYPE_PROP = "application/x-codezero-prop-asset";
