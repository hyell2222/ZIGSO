/**
 * Jigsaw 활동 팩(ActivityPack) 데이터 모델.
 * 게임 엔진은 이 JSON 구조만으로 동작하며, AI는 초안 생성기 역할만 한다.
 */

export const ACTIVITY_PACK_VERSION = 2 as const;

/** 항목 5단계 힌트 (1=가장 어려움, 5=가장 쉬움) */
export type ItemHints = {
  stage1: string;
  stage2: string;
  stage3: string;
  stage4: string;
  stage5: string;
};

export type Item = {
  id: string;
  name: string;
  hints: ItemHints;
  aliases?: string[];
};

/** 홈 모둠 역할 — 역할별로 맞출 아이템(정답)이 여러 개일 수 있음 */
export type Role = {
  id: string;
  name: string;
  items: Item[];
};

/** 모둠이 해결할 미션 — acceptedItemIds 에 체크된 항목을 모두 획득·제출해야 완료 */
export type Task = {
  id: string;
  title: string;
  description: string;
  /** 미션 완료에 필수로 제출해야 하는 아이템 id 목록 */
  acceptedItemIds: string[];
};

export type ActivityPack = {
  version: typeof ACTIVITY_PACK_VERSION;
  title: string;
  description: string;
  /** 모둠 인원 — 역할 수와 동일 (저장 시 자동 정규화) */
  groupSize: number;
  /** 역할당 최대 아이템 수 (저장 시 자동 정규화) */
  itemsPerPlayer: number;
  roles: Role[];
  /** roles를 펼친 아이템 목록 — 엔진·미션 참조용 */
  items: Item[];
  tasks: Task[];
};

/** 전문가 단계에서 획득한 항목 */
export type AcquiredItem = {
  itemId: string;
  hintLevelUsed: 1 | 2 | 3 | 4 | 5;
  score: number;
  acquiredAt: string;
};

/** 모둠이 완성한 미션 (DB 컬럼명 completed_tasks) */
export type CompletedTask = {
  taskId: string;
  submittedItemIds: string[];
  completedAt: string;
  score: number;
};

/** 모둠 최종 제출 */
export type CompletedActivity = {
  taskIds: string[];
  submittedAt: string;
};
