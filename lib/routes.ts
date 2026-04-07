export const ROUTES = {
  home: "/",
  play: "/play",
  admin: {
    root: "/admin",
    projects: "/admin/projects",
    projectsCreate: "/admin/projects/create",
    signIn: "/admin/sign-in",
    signUp: "/admin/sign-up",
  },
} as const;
