type JsonRecord = Record<string, unknown>;

export type CharacterAlibiEntry = {
  time: string | null;
  behavior: string | null;
  location: string | null;
};

export type CharacterAlibi = {
  timeline: CharacterAlibiEntry[];
  fake_alibi: CharacterAlibiEntry[];
};

export type CharacterAlibiSection = {
  key: "timeline" | "fake_alibi";
  label: string;
  entries: CharacterAlibiEntry[];
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asDisplayText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseEntries(value: unknown): CharacterAlibiEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const entry = asRecord(item);
      if (!entry) return null;

      return {
        time: asDisplayText(entry.time),
        behavior: asDisplayText(entry.behavior),
        location: asDisplayText(entry.location),
      } satisfies CharacterAlibiEntry;
    })
    .filter((entry): entry is CharacterAlibiEntry => entry !== null);
}

export function parseCharacterAlibi(value: unknown): CharacterAlibi | null {
  const alibi = asRecord(value);
  if (!alibi) return null;

  const timeline = parseEntries(alibi.timeline);
  const fakeAlibi = parseEntries(alibi.fake_alibi);

  if (timeline.length === 0 && fakeAlibi.length === 0) {
    return null;
  }

  return {
    timeline,
    fake_alibi: fakeAlibi,
  };
}

export function getCharacterAlibiSections(alibi: CharacterAlibi): CharacterAlibiSection[] {
  const sections: CharacterAlibiSection[] = [];

  if (alibi.timeline.length > 0) {
    sections.push({
      key: "timeline",
      label: alibi.fake_alibi.length > 0 ? "실제 동선" : "알리바이",
      entries: alibi.timeline,
    });
  }

  if (alibi.fake_alibi.length > 0) {
    sections.push({
      key: "fake_alibi",
      label: "가짜 알리바이",
      entries: alibi.fake_alibi,
    });
  }

  return sections;
}
