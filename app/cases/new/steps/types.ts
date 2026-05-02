/**
 * 사건 만들기/수정 화면에서 쓰는 공용 타입 (단계별 편집).
 */

import { mapDefaultPropPixelSize } from "@/lib/map-prop-pixel-size";

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

export const PROP_DEFAULT_DROP_SIZE = mapDefaultPropPixelSize();

export const DRAG_TYPE_PROP = "application/x-hiddenschool-prop-asset";
