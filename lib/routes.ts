export const ROUTES = {
  home: "/",
  play: "/play",
  admin: {
    cases: "/admin/cases",
    /** Static export: use query param, not a dynamic segment. */
    casesSession: (sessionId: string) =>
      `/admin/cases/session/?id=${encodeURIComponent(sessionId)}`,
    casesCreate: "/admin/cases/create",
    /** Static export: edit 페이지도 query param 으로 사건 ID 전달. */
    casesEdit: (caseId: string) =>
      `/admin/cases/edit/?id=${encodeURIComponent(caseId)}`,
    signIn: "/admin/sign-in",
    signUp: "/admin/sign-up",
  },
} as const;
