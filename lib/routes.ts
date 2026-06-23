/**
 * 교사용 UI는 루트 하위 세그먼트로 두고,
 * `trailingSlash: true` 에 맞춰 경로를 `/` 로 끝맺음합니다.
 */
export const ROUTES = {
  home: "/",
  play: "/play/",
  playSession: "/play/session/",
  playSessionJoin: (joinCode: string, nickname?: string) => {
    const code = encodeURIComponent(joinCode.trim().toUpperCase());
    const params = new URLSearchParams({ code });
    if (nickname?.trim()) {
      params.set("nickname", nickname.trim());
    }
    return `/play/session/?${params.toString()}`;
  },
  /** QR·공유용 — 코드만 있으면 입장 페이지, 닉네임까지 있으면 세션으로 */
  playJoin: (joinCode: string, nickname?: string) => {
    if (nickname?.trim()) {
      return ROUTES.playSessionJoin(joinCode, nickname);
    }
    const code = encodeURIComponent(joinCode.trim().toUpperCase());
    return `/play/?code=${code}`;
  },

  login: "/login/",

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
