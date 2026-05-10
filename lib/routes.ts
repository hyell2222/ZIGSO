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
  /**
   * 시뮬레이션 모드 — 실제 DB 세션 없이 사건 흐름을 혼자 시연/검수.
   * `case` 쿼리로 사건 id 를 받습니다.
   */
  casesSandbox: (caseId: string) => `/cases/sandbox/?case=${encodeURIComponent(caseId)}`,

  /** 수사 진행 화면 — static export: `session` 쿼리 */
  sessionHost: (sessionId: string) =>
    `/sessions/?session=${encodeURIComponent(sessionId)}`,

  /** 활동 리포트 (학생) — static export: `session` 쿼리 */
  reports: "/reports/",
  reportsForSession: (sessionId: string) =>
    `/reports/?session=${encodeURIComponent(sessionId)}`,
} as const;
