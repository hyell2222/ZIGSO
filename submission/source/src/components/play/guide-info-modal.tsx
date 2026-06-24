"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { useGuideModalScope } from "@/components/play/guide-modal-scope";
import { Modal } from "@/components/ui/modal";
import { Z } from "@/lib/ui/z-index";

/** 점수·단계 안내 모달 공통 너비 */
export const GUIDE_INFO_MODAL_MAX_WIDTH = "w-full max-w-[min(100%,24rem)]";

/** 안내 모달 본문 타이포 — 모든 ? 안내에 동일 적용 */
export const guideInfoModalBodyClass = "text-sm font-medium text-[var(--muted-foreground)] break-keep";

const GUIDE_INFO_MODAL_CONTENT_CLASS = "space-y-4 px-5 py-4";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
};

/** 점수·단계 ? 안내 — 현재 화면(스코프) 중앙 모달 */
export function GuideInfoModal({ open, onClose, title, titleId, children }: Props) {
  const scopeRoot = useGuideModalScope();

  if (!open) return null;

  const useScope = Boolean(scopeRoot);
  const modal = (
    <Modal
      open
      onClose={onClose}
      variant={useScope ? "contained" : "viewport"}
      title={title}
      titleId={titleId}
      zIndexClassName={useScope ? Z.containedOverlay : Z.hostTool}
      maxWidthClassName={GUIDE_INFO_MODAL_MAX_WIDTH}
      contentClassName={GUIDE_INFO_MODAL_CONTENT_CLASS}
    >
      {children}
    </Modal>
  );

  const target =
    scopeRoot ?? (typeof document !== "undefined" ? document.body : null);

  if (!target) return null;

  return createPortal(modal, target);
}
