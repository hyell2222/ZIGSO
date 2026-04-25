export const SESSION_ROOM_CHANNEL_PREFIX = "room:";

export function getSessionRoomChannelName(sessionId: string) {
  return `${SESSION_ROOM_CHANNEL_PREFIX}${sessionId}`;
}

export type SessionPresenceRole = "host" | "player";

export type SessionPresencePayload = {
  role: SessionPresenceRole;
  player_id?: string;
  nickname?: string;
  patrol_location_id?: string;
  zone_name?: string;
};

export type SessionPresenceRow = {
  presenceKey: string;
  payload: SessionPresencePayload;
};

/** Supabase `presenceState()` → flat list (one row per presence metadata object). */
export function flattenPresenceState(state: Record<string, unknown[]> | undefined): SessionPresenceRow[] {
  if (!state) return [];
  const out: SessionPresenceRow[] = [];
  for (const [presenceKey, entries] of Object.entries(state)) {
    if (!Array.isArray(entries)) continue;
    for (const raw of entries) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      if (o.role === "host" || o.role === "player") {
        out.push({
          presenceKey,
          payload: {
            role: o.role,
            player_id: typeof o.player_id === "string" ? o.player_id : undefined,
            nickname: typeof o.nickname === "string" ? o.nickname : undefined,
            patrol_location_id:
              typeof o.patrol_location_id === "string" ? o.patrol_location_id : undefined,
            zone_name: typeof o.zone_name === "string" ? o.zone_name : undefined,
          },
        });
      }
    }
  }
  return out;
}
