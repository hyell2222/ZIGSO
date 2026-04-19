export const ROUTES = {
  home: "/",
  play: "/play",
  admin: {
    root: "/admin",
    scenarios: "/admin/scenarios",
    /** Static export: use query param, not a dynamic segment. */
    scenariosSession: (sessionId: string) =>
      `/admin/scenarios/session/?id=${encodeURIComponent(sessionId)}`,
    scenariosCreate: "/admin/scenarios/create",
    /** Static export: edit 페이지도 query param 으로 시나리오 ID 전달. */
    scenariosEdit: (scenarioId: string) =>
      `/admin/scenarios/edit/?id=${encodeURIComponent(scenarioId)}`,
    signIn: "/admin/sign-in",
    signUp: "/admin/sign-up",
  },
} as const;
