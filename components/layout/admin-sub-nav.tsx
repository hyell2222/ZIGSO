"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; match: (path: string) => boolean }[] = [
  {
    href: ROUTES.admin.cases,
    label: "사건",
    match: (path) => path === ROUTES.admin.cases || path.startsWith(`${ROUTES.admin.cases}/`),
  },
  {
    href: ROUTES.admin.sessions,
    label: "세션 · 보고서",
    match: (path) => path === ROUTES.admin.sessions || path.startsWith(`${ROUTES.admin.sessions}/`),
  },
];

/**
 * /admin 영역(로그인·회원가입 제외) 상단 2탭. 사이드바 대신 가벼운 구분선.
 */
export function AdminSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl gap-1 px-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative -mb-px border-b-2 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
