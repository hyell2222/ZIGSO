export const ROUTES = {
  home: "/",
  play: "/play",
  admin: {
    root: "/admin",
    scenarios: "/admin/scenarios",
    scenariosCreate: "/admin/scenarios/create",
    signIn: "/admin/sign-in",
    signUp: "/admin/sign-up",
  },
} as const;
