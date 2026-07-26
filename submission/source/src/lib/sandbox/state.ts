/**
 * 시뮬레이션 모드 — 교사 혼자서 활동 흐름을 시연·검수하기 위한 in-memory 모델.
 */

import { MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/activity-draft";
import type { ActivityPhase, SessionStatus } from "@/types/index";
import {
  assignRolesToPlayers,
  computeSessionGroupCount,
  getTestQuestions,
  groupLabel,
} from "@/lib/activity-pack/engine";
import {
  averagePracticeBaseScore,
  practiceBaseScore,
  PRACTICE_MAX_ATTEMPTS,
} from "@/lib/activity-pack/scoring";
import type { ActivityPack, PracticeQuestionResult, QuizAnswer, QuizQuestion } from "@/lib/activity-pack/types";
import { pickSandboxLobbyBotNicknames, SANDBOX_LOBBY_BOT_COUNT } from "@/lib/sandbox/waiting-nicknames";
import { getNextPhase } from "@/lib/api/sessions";

export type SandboxGroup = {
  id: string;
  name: string;
};

export type SandboxPlayer = {
  id: string;
  nickname: string;
  groupId: string;
  roleId: string;
  base_score?: number | null;
  practice_results?: PracticeQuestionResult[];
  practice_submitted_at?: string | null;
  peer_practice_completed?: string[];
  home_group_completed_at?: string | null;
  individual_quiz_answers: QuizAnswer[];
  individual_quiz_submitted_at?: string | null;
  isReal?: boolean;
};

export type SandboxState = {
  phase: ActivityPhase;
  status: SessionStatus;
  groups: SandboxGroup[];
  players: SandboxPlayer[];
  realStudentNickname: string | null;
};

export const SANDBOX_REAL_STUDENT_PLAYER_ID = "sandbox-real-student";
export const SANDBOX_JOIN_CODE = "ZIGSO";

export type SandboxWaitingChip = {
  id: string;
  nickname: string;
  isReal?: boolean;
};

export function buildSandboxWaitingRoster(
  activityId: string,
  realStudentNickname: string | null,
  groupSize = MIN_ROLES_PER_GROUP,
): SandboxWaitingChip[] {
  const slotsPerGroup = Math.max(MIN_ROLES_PER_GROUP, groupSize);
  const botCount = slotsPerGroup * Math.ceil(SANDBOX_LOBBY_BOT_COUNT / slotsPerGroup);
  const nicknames = pickSandboxLobbyBotNicknames(activityId.trim() || "_");
  const out: SandboxWaitingChip[] = Array.from({ length: botCount }, (_, i) => ({
    id: `sandbox-lobby-bot-${i}`,
    nickname: nicknames[i % nicknames.length] ?? `참가자 ${i + 1}`,
  }));

  const realNick = realStudentNickname?.trim();
  if (realNick) {
    out.unshift({
      id: "sandbox-real-student-join",
      nickname: realNick,
      isReal: true,
    });
  }
  return out;
}

function shuffleArrayInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

/** 가상 응답 생성 — correctRatio 비율만큼 정답, 나머지는 임의 오답을 고른다. */
function fakeQuizAnswers(questions: QuizQuestion[], correctRatio: number): QuizAnswer[] {
  return questions.map((q) => {
    const pickCorrect = Math.random() < correctRatio || q.choices.length <= 1;
    if (pickCorrect) {
      return { questionId: q.id, choiceIndex: q.correctIndex };
    }
    const wrongChoices: number[] = [];
    for (let i = 0; i < q.choices.length; i++) {
      if (i !== q.correctIndex) wrongChoices.push(i);
    }
    const choiceIndex = wrongChoices[Math.floor(Math.random() * wrongChoices.length)] ?? 0;
    return { questionId: q.id, choiceIndex };
  });
}

/** 0.4 ~ 1.0 사이의 무작위 정답 비율 — 가상 플레이어의 점수를 다양하게 만든다. */
function randomCorrectRatio(): number {
  return 0.4 + Math.random() * 0.6;
}

function recentTimestamp(): string {
  return new Date(Date.now() - Math.floor(Math.random() * 5 * 60 * 1000)).toISOString();
}

function randomWrongAttempts(): number {
  const roll = Math.random();
  return roll < 0.45 ? 0 : roll < 0.75 ? 1 : roll < 0.92 ? 2 : PRACTICE_MAX_ATTEMPTS;
}

/** 가상 연습 결과 — 역할 연습 문항마다 점수를 뽑고 평균을 기준 점수로 한다. */
function randomPracticeResults(questions: QuizQuestion[]): {
  results: PracticeQuestionResult[];
  baseScore: number;
} {
  const results = questions.map((q) => ({
    questionId: q.id,
    wrongAttempts: randomWrongAttempts(),
  }));
  return {
    results,
    baseScore: averagePracticeBaseScore(results.map((r) => practiceBaseScore(r.wrongAttempts))),
  };
}

export function createInitialSandboxState(): SandboxState {
  return {
    phase: "waiting",
    status: "active",
    groups: [],
    players: [],
    realStudentNickname: null,
  };
}

export function buildSandboxAssignments(
  activityId: string,
  pack: ActivityPack,
  realStudentNickname: string | null,
): { groups: SandboxGroup[]; players: SandboxPlayer[] } {
  if (pack.roles.length === 0) {
    return { groups: [], players: [] };
  }

  const chips = buildSandboxWaitingRoster(activityId, realStudentNickname, pack.roles.length);
  shuffleArrayInPlace(chips);

  const roleCount = Math.max(MIN_ROLES_PER_GROUP, pack.roles.length);
  const numGroups = computeSessionGroupCount(chips.length, roleCount);

  const groups: SandboxGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: `sandbox-group-${i}`,
    name: groupLabel(i),
  }));

  const byGroup: SandboxWaitingChip[][] = groups.map(() => []);
  chips.forEach((chip, idx) => {
    byGroup[idx % numGroups]!.push(chip);
  });

  const testQuestions = getTestQuestions(pack);
  const players: SandboxPlayer[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    const groupChips = byGroup[gi]!;
    const groupPlayerIds = groupChips.map((chip) =>
      chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`,
    );
    const roleAssignment = assignRolesToPlayers(pack, groupPlayerIds);
    for (const chip of groupChips) {
      const playerId = chip.isReal ? SANDBOX_REAL_STUDENT_PLAYER_ID : `sandbox-player-${chip.id}`;
      const assigned = roleAssignment.get(playerId);
      const isBot = !chip.isReal;
      const roleId = assigned?.roleId ?? pack.roles[0]?.id ?? "";
      const role = pack.roles.find((r) => r.id === roleId);

      // 50% chance to complete each step
      const expertComplete = isBot && Math.random() < 0.5;
      const homeComplete = isBot && Math.random() < 0.5;
      const quizComplete = isBot && Math.random() < 0.5;

      const practice =
        expertComplete && role ? randomPracticeResults(role.practiceQuestions) : null;

      const baseTime = Date.now() - 10 * 60 * 1000;
      const practiceTime = expertComplete
        ? new Date(baseTime + Math.floor(Math.random() * 2 * 60 * 1000)).toISOString()
        : null;
      const homeCompleteTime = (homeComplete || quizComplete)
        ? new Date(baseTime + 3 * 60 * 1000 + Math.floor(Math.random() * 2 * 60 * 1000)).toISOString()
        : null;
      const quizCompleteTime = quizComplete
        ? new Date(new Date(homeCompleteTime!).getTime() + 30 * 1000 + Math.floor(Math.random() * 3 * 60 * 1000)).toISOString()
        : null;

      players.push({
        id: playerId,
        nickname: chip.nickname.trim() || "참가자",
        groupId: group.id,
        roleId,
        base_score: practice?.baseScore ?? null,
        practice_results: practice?.results ?? [],
        practice_submitted_at: practiceTime,
        home_group_completed_at: homeCompleteTime,
        individual_quiz_answers:
          quizComplete && testQuestions.length > 0
            ? fakeQuizAnswers(testQuestions, randomCorrectRatio())
            : [],
        individual_quiz_submitted_at: quizCompleteTime,
        isReal: chip.isReal ? true : undefined,
      });
    }
  }

  return { groups, players };
}

/** 샌드박스 단계 진행 — 대기→소개 외에는 실제 세션과 동일한 진행 순서를 따른다. */
export function nextSandboxPhase(current: ActivityPhase): ActivityPhase | null {
  if (current === "waiting") return "overview";
  return getNextPhase(current);
}

export function advanceSandboxState(
  state: SandboxState,
  next: ActivityPhase,
  pack: ActivityPack,
): SandboxState {
  let nextPlayers = state.players;
  const testQuestions = getTestQuestions(pack);

  if (next === "results") {
    nextPlayers = nextPlayers.map((p) => {
      const homeGroupTime = p.home_group_completed_at
        ? new Date(p.home_group_completed_at).getTime()
        : Date.now() - 5 * 60 * 1000;

      const submittedAt = new Date(
        homeGroupTime + 30 * 1000 + Math.floor(Math.random() * 3 * 60 * 1000)
      ).toISOString();

      return {
        ...p,
        home_group_completed_at: p.home_group_completed_at || new Date(homeGroupTime).toISOString(),
        individual_quiz_answers:
          p.individual_quiz_answers && p.individual_quiz_answers.length > 0
            ? p.individual_quiz_answers
            : fakeQuizAnswers(testQuestions, randomCorrectRatio()),
        individual_quiz_submitted_at: p.individual_quiz_submitted_at || submittedAt,
      };
    });
  }

  if (next === "individual_quiz") {
    nextPlayers = nextPlayers.map((p) => {
      return {
        ...p,
        home_group_completed_at:
          p.home_group_completed_at ||
          new Date(Date.now() - 10 * 1000 - Math.floor(Math.random() * 60 * 1000)).toISOString(),
      };
    });
  }

  if (next === "home_group") {
    nextPlayers = nextPlayers.map((p) => {
      const role = pack.roles.find((r) => r.id === p.roleId);
      const practice = role ? randomPracticeResults(role.practiceQuestions) : null;
      return {
        ...p,
        base_score:
          p.base_score !== null && p.base_score !== undefined
            ? p.base_score
            : (practice?.baseScore ?? null),
        practice_results:
          p.practice_results && p.practice_results.length > 0
            ? p.practice_results
            : (practice?.results ?? []),
        practice_submitted_at:
          p.practice_submitted_at ||
          new Date(Date.now() - 10 * 1000 - Math.floor(Math.random() * 60 * 1000)).toISOString(),
      };
    });
  }

  return { ...state, phase: next, players: nextPlayers };
}
