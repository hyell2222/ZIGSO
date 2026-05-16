/**
 * School Lunch Rush — 급식 협동 영어 타이쿤 게임 데이터 모델.
 * 게임 엔진은 이 JSON 구조만으로 동작하며, AI는 초안 생성기 역할만 한다.
 */

export const SCENARIO_PACK_VERSION = 1 as const;
/** @deprecated use SCENARIO_PACK_VERSION */
export const LUNCH_PACK_VERSION = SCENARIO_PACK_VERSION;

export type EnglishLevel = "A1" | "A2" | "B1" | "B2";

/** 재료 5단계 힌트 (1=가장 어려움, 5=가장 쉬움) */
export type IngredientHints = {
  stage1: string;
  stage2: string;
  stage3: string;
  stage4: string;
  stage5: string;
};

export type Ingredient = {
  id: string;
  name: string;
  /** 카테고리: staple(밥) | soup(국) | side(반찬) | dessert(후식) | other */
  category: "staple" | "soup" | "side" | "dessert" | "other";
  hints: IngredientHints;
  /** 조에서 메뉴 만들 때 보여줄 짧은 조리 힌트 (영어) */
  cookingHint: string;
  /** 정답 입력 시 허용 별칭 (소문자, trim) */
  aliases?: string[];
};

export type CookingStep = {
  order: number;
  /** 정답 영어 명령문 */
  sentence: string;
};

export type LunchMenu = {
  id: string;
  name: string;
  /** 메뉴 슬롯: rice | soup | side1 | side2 | side3 | dessert */
  slot: "rice" | "soup" | "side1" | "side2" | "side3" | "dessert";
  ingredientIds: string[];
  cookingSteps: CookingStep[];
};

/** 학생이 조합 UI에서 쓸 수 있는 영어 명령문 카드 */
export type CommandCard = {
  id: string;
  text: string;
};

export type ScenarioPack = {
  version: typeof SCENARIO_PACK_VERSION;
  title: string;
  description: string;
  difficulty: "Easy" | "Normal" | "Hard";
  englishLevel: EnglishLevel;
  teamSize: number;
  menus: LunchMenu[];
  ingredients: Ingredient[];
  commandCards: CommandCard[];
};

/** @deprecated use ScenarioPack */
export type LunchScenarioPack = ScenarioPack;

/** 플레이어가 재료 추리에서 획득한 기록 */
export type AcquiredIngredient = {
  ingredientId: string;
  hintStageUsed: 1 | 2 | 3 | 4 | 5;
  score: number;
  acquiredAt: string;
};

/** 팀이 완성한 메뉴 */
export type CompletedMenu = {
  menuId: string;
  /** 학생이 조합한 조리 명령문 (순서대로) */
  submittedSteps: string[];
  completedAt: string;
  score: number;
};

/** 팀 급식판 제출 */
export type TraySubmission = {
  menuIds: string[];
  submittedAt: string;
};
