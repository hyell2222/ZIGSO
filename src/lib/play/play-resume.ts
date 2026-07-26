/**
 * 학생이 탭을 닫았다 다시 들어왔을 때 동일 플레이어로 이어 들어갈 수 있도록
 * join_code 별로 마지막 입장 정보를 localStorage 에 보관한다.
 *
 * 저장 위치: localStorage["ZIGSO:play-resume"] = { [joinCode]: ResumeRecord }
 */

const STORAGE_KEY = "ZIGSO:play-resume";

export type ResumeRecord = {
  joinCode: string;
  sessionId: string;
  playerId: string;
  nickname: string;
  /** 저장 시각 (ms). 너무 오래된 아이템은 무시한다. */
  savedAt: number;
};

/** 7일 지나면 만료 처리 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function readMap(): Record<string, ResumeRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, ResumeRecord>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, ResumeRecord>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 무시 (할당량 초과 / 시크릿 모드 등)
  }
}

function normalizeJoinCode(joinCode: string) {
  return joinCode.trim().toUpperCase();
}

export function getResumeRecord(joinCode: string): ResumeRecord | null {
  const key = normalizeJoinCode(joinCode);
  if (!key) return null;
  const map = readMap();
  const rec = map[key];
  if (!rec) return null;

  const fresh =
    typeof rec.savedAt === "number" && Date.now() - rec.savedAt < MAX_AGE_MS;
  if (!fresh || !rec.playerId || !rec.sessionId) {
    clearResumeRecord(key);
    return null;
  }
  return rec;
}

export function saveResumeRecord(rec: Omit<ResumeRecord, "savedAt">) {
  const key = normalizeJoinCode(rec.joinCode);
  if (!key) return;
  const map = readMap();
  map[key] = { ...rec, joinCode: key, savedAt: Date.now() };
  writeMap(map);
}

export function clearResumeRecord(joinCode: string) {
  const key = normalizeJoinCode(joinCode);
  if (!key) return;
  const map = readMap();
  if (key in map) {
    delete map[key];
    writeMap(map);
  }
}
