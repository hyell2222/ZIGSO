/**
 * Jigsaw 활동 팩(ActivityPack) 데이터 모델.
 * 게임 엔진은 이 JSON 구조만으로 동작하며, AI는 초안 생성기 역할만 한다.
 */

export const ACTIVITY_PACK_VERSION = 1 as const;

/** 항목 5단계 힌트 (1=가장 어려움, 5=가장 쉬움) */
export type ItemHints = {
  stage1: string;
  stage2: string;
  stage3: string;
  stage4: string;
  stage5: string;
};

export type ItemCategory =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "bonus"
  | "other";

export type TaskSlot = "slot1" | "slot2" | "slot3" | "slot4" | "slot5" | "slot6";

export type Item = {
  id: string;
  name: string;
  category: ItemCategory;
  hints: ItemHints;
  /** 모둠 단계에서 보여줄 짧은 안내 */
  groupHint: string;
  aliases?: string[];
};

export type TaskStep = {
  order: number;
  sentence: string;
};

export type Task = {
  id: string;
  name: string;
  slot: TaskSlot;
  itemIds: string[];
  steps: TaskStep[];
};

/** 학생이 조합 UI에서 쓸 수 있는 수행 문장 카드 */
export type ActionCard = {
  id: string;
  text: string;
};

export type ActivityPack = {
  version: typeof ACTIVITY_PACK_VERSION;
  title: string;
  description: string;
  difficulty: "Easy" | "Normal" | "Hard";
  groupSize: number;
  tasks: Task[];
  items: Item[];
  actionCards: ActionCard[];
};

/** 전문가 단계에서 획득한 항목 */
export type AcquiredItem = {
  itemId: string;
  hintLevelUsed: 1 | 2 | 3 | 4 | 5;
  score: number;
  acquiredAt: string;
};

/** 모둠이 완성한 과제 */
export type CompletedTask = {
  taskId: string;
  submittedSteps: string[];
  completedAt: string;
  score: number;
};

/** 모둠 최종 제출 */
export type CompletedActivity = {
  taskIds: string[];
  submittedAt: string;
};
