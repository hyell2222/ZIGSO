/**
 * Jigsaw 활동 팩(ActivityPack) 데이터 모델.
 * 전문가 집단(단어 카드) + 홈 집단(공유 학습지) 구조.
 */

export const ACTIVITY_PACK_VERSION = 3 as const;

/** 아이템 5단계 단서 (1=가장 어려움, 5=가장 쉬움) */
export type ItemClues = {
  stage1: string;
  stage2: string;
  stage3: string;
  stage4: string;
  stage5: string;
};

export type Item = {
  id: string;
  name: string;
  clues: ItemClues;
  aliases?: string[];
};

/** 홈 모둠 역할 — 역할별 본문 핵심 단어 */
export type Role = {
  id: string;
  name: string;
  items: Item[];
};

/** 홈 집단 공유 학습지 — 빈칸 슬롯 */
export type WorksheetSlot = {
  id: string;
  itemId: string;
  /** 슬롯 소유 역할 — 해당 역할 학생 화면의 빈칸(본인은 직접 채울 수 없음) */
  ownerRoleId: string;
};

/** 홈 집단 공유 학습지 — summaryPassage 내 {{slot_id}} 가 빈칸 */
export type HomeWorksheet = {
  summaryPassage: string;
  slots: WorksheetSlot[];
};

export type ActivityPack = {
  version: typeof ACTIVITY_PACK_VERSION;
  title: string;
  description: string;
  groupSize: number;
  itemsPerPlayer: number;
  roles: Role[];
  items: Item[];
  homeWorksheet: HomeWorksheet;
};

/** 전문가 집단에서 획득한 단어 카드 (플레이어 개인 인벤토리) */
export type WordCard = {
  itemId: string;
  clueLevelUsed: 1 | 2 | 3 | 4 | 5;
  score: number;
  acquiredAt: string;
  /** 학습지에 배치된 시각 — 배치 후 인벤토리에서 사용 불가 */
  placedAt?: string;
};

/** 홈 집단 학습지 빈칸 배치 */
export type WorksheetPlacement = {
  slotId: string;
  itemId: string;
  placedByPlayerId: string;
  placedAt: string;
};
