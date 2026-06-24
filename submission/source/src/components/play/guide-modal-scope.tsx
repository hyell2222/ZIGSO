"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const GuideModalScopeContext = createContext<HTMLElement | null>(null);

/** 현재 화면(교사·학생 패널)의 모달 portal 대상 */
export function useGuideModalScope() {
  return useContext(GuideModalScopeContext);
}

type Props = {
  children: ReactNode;
  className?: string;
};

/** 교사·학생 화면마다 하나 — 안내 모달을 해당 화면 중앙에 띄움 */
export function GuideModalScope({ children, className }: Props) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    setRoot(node);
  }, []);

  return (
    <GuideModalScopeContext.Provider value={root}>
      <div ref={setRef} className={cn("relative isolate flex min-h-0 flex-1 flex-col", className)}>
        {children}
      </div>
    </GuideModalScopeContext.Provider>
  );
}
