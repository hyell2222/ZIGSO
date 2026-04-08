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
    signIn: "/admin/sign-in",
    signUp: "/admin/sign-up",
  },
} as const;
