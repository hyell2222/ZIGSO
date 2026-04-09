export const SESSION_ROOM_CHANNEL_PREFIX = "room:";

export function getSessionRoomChannelName(sessionId: string) {
  return `${SESSION_ROOM_CHANNEL_PREFIX}${sessionId}`;
}

export type SessionPresenceRole = "host" | "player";

export type SessionPresencePayload = {
  role: SessionPresenceRole;
  player_id?: string;
  nickname?: string;
  character_id?: string;
  character_name?: string;
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
            character_id: typeof o.character_id === "string" ? o.character_id : undefined,
            character_name: typeof o.character_name === "string" ? o.character_name : undefined,
          },
        });
      }
    }
  }
  return out;
}
