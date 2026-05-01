/**
 * 교사용 UI는 루트 하위 세그먼트로 두고,
 * `trailingSlash: true` 에 맞춰 경로를 `/` 로 끝맺음합니다.
 */
export const ROUTES = {
  home: "/",
  /** 학생 플레이 (`?code=` · `nickname=` 쿼리) */
  play: "/play/",
  playJoin: (joinCode: string, nickname?: string) => {
    const code = encodeURIComponent(joinCode.trim().toUpperCase());
    if (nickname?.trim()) {
      return `/play/?code=${code}&nickname=${encodeURIComponent(nickname.trim())}`;
    }
    return `/play/?code=${code}`;
  },

  login: "/login/",
  signUp: "/signup/",

  /** 사건 CRUD · 단계별 편집 */
  cases: "/cases/",
  casesNew: "/cases/new/",
  /** static export: `case` 쿼리 */
  casesEdit: (caseId: string) => `/cases/edit/?case=${encodeURIComponent(caseId)}`,

  /** 수사 진행 화면 — static export: `session` 쿼리 */
  sessionHost: (sessionId: string) =>
    `/sessions/?session=${encodeURIComponent(sessionId)}`,

  /** 세션 보고서 — static export: `session` 쿼리 */
  reports: "/reports/",
  reportsForSession: (sessionId: string) =>
    `/reports/?session=${encodeURIComponent(sessionId)}`,
} as const;
