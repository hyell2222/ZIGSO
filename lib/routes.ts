/**
 * 교사용 UI는 루트 하위 세그먼트로 두고,
 * `trailingSlash: true` 에 맞춰 경로를 `/` 로 끝맺음합니다.
 */
export const ROUTES = {
  home: "/",
  play: "/play/",
  playSession: "/play/session/",
  playJoin: (joinCode: string, nickname?: string) => {
    const code = encodeURIComponent(joinCode.trim().toUpperCase());
    if (nickname?.trim()) {
      return `/play/session/?code=${code}&nickname=${encodeURIComponent(nickname.trim())}`;
    }
    return `/play/?code=${code}`;
  },

  login: "/login/",
  signUp: "/signup/",

  /** 활동 CRUD · 활동 팩 편집 */
  activities: "/activities/",
  activitiesNew: "/activities/new/",
  activitiesEdit: (activityId: string) =>
    `/activities/edit/?activity=${encodeURIComponent(activityId)}`,
  activitiesSandbox: (activityId: string) =>
    `/activities/sandbox/?activity=${encodeURIComponent(activityId)}`,

  sessionHost: (sessionId: string) =>
    `/sessions/?session=${encodeURIComponent(sessionId)}`,

  reports: "/reports/",
  reportsForSession: (sessionId: string) =>
    `/reports/?session=${encodeURIComponent(sessionId)}`,
} as const;
