/**
 * 시뮬레이션 대기 화면 — 실제 학생처럼 보이는 가상 접속 닉네임 풀.
 * 사건 id 로 시드를 두어 새로고침해도 같은 사건이면 순서가 유지됩니다.
 */

/** 가상 접속 표시 인원 (10명 초과 요구 반영) */
export const SANDBOX_LOBBY_BOT_COUNT = 12;

/** 풀 크기보다 많이 들어있어야 순서 변경 시 중복 선택이 가능 */
const NICKNAME_POOL = [
  "민서연",
  "김도윤",
  "박재훈",
  "이서준",
  "최유진",
  "한지우",
  "장수아",
  "오은채",
  "윤하람",
  "강도하",
  "신태양",
  "임보라",
  "서가을",
  "노하늘",
  "책벌레17",
  "탐정키트",
  "새벽라떼",
  "회색고양이",
  "무지개버스",
  "은하수정류장",
  "초코파이두개",
  "블루펜슬",
] as const;

function caseIdToSeed(caseId: string): number {
  let h = 2166136261;
  const s = caseId.trim() || "_";
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 0 inclusive, max exclusive */
function nextRand(seed: { s: number }): number {
  seed.s = (Math.imul(seed.s, 1103515245) + 12345) >>> 0;
  return seed.s / 0x100000000;
}

/** 시드 피셔-예이츠 섞기 (풀 순서만 바꿈) */
function shuffleInPlace<T>(arr: T[], seedNum: number): void {
  const seed = { s: seedNum };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(seed) * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

/**
 * `SANDBOX_LOBBY_BOT_COUNT` 명의 닉네임 — 사건 id 마다 순서 고정.
 * 풀보다 카운트가 크면 순환해 채움.
 */
export function pickSandboxLobbyBotNicknames(caseId: string): string[] {
  const pool = NICKNAME_POOL.slice() as string[];
  shuffleInPlace(pool, caseIdToSeed(caseId));

  const out: string[] = [];
  for (let i = 0; i < SANDBOX_LOBBY_BOT_COUNT; i++) {
    out.push(pool[i % pool.length]!);
  }
  return out;
}
