/**
 * Case create wizard 의 공용 도메인 타입.
 */

export type DraftInvestigationZone = {
  tempId: string;
  zoneName: string;
};

export type DraftClue = {
  tempId: string;
  assignmentTempId: string;
  asset: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  content: string;
};

export { MAP_EDITOR_SPACE as MAP_EDITOR_WORLD } from "@/lib/assets/map-props";

export const PROP_DEFAULT_DROP_SIZE = { w: 80, h: 80 } as const;

export const DRAG_TYPE_PROP = "application/x-hiddenschool-prop-asset";
