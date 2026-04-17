type JsonRecord = Record<string, unknown>;

export type ScenarioIncidentVictim = {
  name: string | null;
  age: number | string | null;
  gender: string | null;
  occupation: string | null;
};

export type ScenarioIncidentDiscovery = {
  time: string | null;
  location: string | null;
  appearance: string | null;
};

export type ScenarioIncident = {
  victim: ScenarioIncidentVictim | null;
  discovery: ScenarioIncidentDiscovery | null;
  estimated_death_time: string | null;
  summary: string | null;
};

export type ScenarioIncidentField = {
  key: string;
  label: string;
  value: string | null;
};

export type ScenarioIncidentSection = {
  key: string;
  label: string;
  fields: ScenarioIncidentField[];
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asDisplayText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function asAgeValue(value: unknown): number | string | null {
  if (typeof value === "number") return value;
  return asDisplayText(value);
}

export function parseScenarioIncident(value: unknown): ScenarioIncident | null {
  const incident = asRecord(value);
  if (!incident) return null;

  const victim = asRecord(incident.victim);
  const discovery = asRecord(incident.discovery);

  return {
    victim: victim
      ? {
          name: asDisplayText(victim.name),
          age: asAgeValue(victim.age),
          gender: asDisplayText(victim.gender),
          occupation: asDisplayText(victim.occupation),
        }
      : null,
    discovery: discovery
      ? {
          time: asDisplayText(discovery.time),
          location: asDisplayText(discovery.location),
          appearance: asDisplayText(discovery.appearance),
        }
      : null,
    estimated_death_time: asDisplayText(incident.estimated_death_time),
    summary: asDisplayText(incident.summary),
  };
}

export function getScenarioIncidentSections(incident: ScenarioIncident): ScenarioIncidentSection[] {
  const sections: ScenarioIncidentSection[] = [];

  if (incident.victim) {
    sections.push({
      key: "victim",
      label: "피해자 정보",
      fields: [
        { key: "name", label: "이름", value: incident.victim.name },
        { key: "age", label: "나이", value: incident.victim.age == null ? null : String(incident.victim.age) },
        { key: "gender", label: "성별", value: incident.victim.gender },
        { key: "occupation", label: "직업", value: incident.victim.occupation },
      ],
    });
  }

  if (incident.discovery) {
    sections.push({
      key: "discovery",
      label: "발견 정황",
      fields: [
        { key: "time", label: "발견 시각", value: incident.discovery.time },
        { key: "location", label: "발견 장소", value: incident.discovery.location },
        { key: "appearance", label: "발견 상태", value: incident.discovery.appearance },
      ],
    });
  }

  const overviewFields: ScenarioIncidentField[] = [
    { key: "estimated_death_time", label: "추정 사망 시각", value: incident.estimated_death_time },
    { key: "summary", label: "사건 개요", value: incident.summary },
  ].filter((field) => field.value);

  if (overviewFields.length > 0) {
    sections.push({
      key: "overview",
      label: "사건 요약",
      fields: overviewFields,
    });
  }

  return sections;
}
