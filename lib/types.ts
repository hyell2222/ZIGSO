import type { ActivityPack, PracticeQuestionResult, QuizAnswer } from "@/lib/activity-pack/types";

export type ActivityPhase =
  | "waiting"
  | "overview"
  | "expert_group"
  | "home_group"
  | "individual_quiz"
  | "results";

export type SessionStatus = "active" | "ended";

export type GroupRecord = {
  id: string;
  session_id: string | null;
  name: string | null;
};

export type PlayerRecord = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  group_id: string | null;
  assigned_role_id: string | null;
  /** 전문가 연습 결과 — 기준 점수 (문항 점수 평균) */
  base_score?: number | null;
  /** 연습 문항별 결과 */
  practice_results?: PracticeQuestionResult[];
  /** 연습 완료 시각 */
  practice_submitted_at?: string | null;
  /** 개별 형성평가(실전 문제) 응답 */
  individual_quiz_answers: QuizAnswer[];
  /** 개별 형성평가 제출 시각 */
  individual_quiz_submitted_at?: string | null;
};

export type GameSession = {
  id: string;
  activity_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: ActivityPhase | string | null;
  status: SessionStatus | string | null;
  created_at: string | null;
};

export { isResultsPhase, isSessionEnded } from "@/lib/activity-phases";

export type { ActivityPack, QuizAnswer };
