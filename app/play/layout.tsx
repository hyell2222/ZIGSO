import type { ReactNode } from "react";

/** play 라우트 — 뷰포트에 고정, 스크롤은 패널 내부 full-bleed 영역만 */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden overscroll-none">
      {children}
    </div>
  );
}
