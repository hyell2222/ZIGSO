export const ROUTES = {
  home: "/",
  /** 학생 플레이 (`?code=` · `nickname=` 쿼리) */
  play: "/play",
  playJoin: (joinCode: string, nickname?: string) => {
    const code = encodeURIComponent(joinCode.trim().toUpperCase());
    if (nickname?.trim()) {
      return `/play?code=${code}&nickname=${encodeURIComponent(nickname.trim())}`;
    }
    return `/play?code=${code}`;
  },
  admin: {
    /** 내가 연 세션 목록 */
    sessions: "/admin/sessions",
    /** 호스트 수사 운영 (플레이어·QR·단계) — static export: `session` 쿼리 */
    sessionHost: (sessionId: string) =>
      `/admin/sessions/host/?session=${encodeURIComponent(sessionId)}`,
    /** 세션별 팀·보고서 — static export: `session` 쿼리 */
    sessionReport: (sessionId: string) =>
      `/admin/sessions/report/?session=${encodeURIComponent(sessionId)}`,
    cases: "/admin/cases",
    casesNew: "/admin/cases/new",
    /** static export: `case` 쿼리 */
    casesEdit: (caseId: string) => `/admin/cases/edit/?case=${encodeURIComponent(caseId)}`,
    login: "/admin/login",
    signUp: "/admin/sign-up",
  },
} as const;
