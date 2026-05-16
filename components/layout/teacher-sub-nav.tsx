"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LucideIcon, UtensilsCrossed } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS: { 
  href: string; 
  label: string; 
  icon: LucideIcon;
  match: (path: string) => boolean 
}[] = [
  {
    href: ROUTES.cases,
    label: "내 수업",
    icon: UtensilsCrossed,
    match: (path) => path === ROUTES.cases || path.startsWith(`${ROUTES.cases}/`),
  },
  {
    href: ROUTES.reports,
    label: "활동 리포트",
    icon: FileText,
    match: (path) => path === ROUTES.reports || path.startsWith(`${ROUTES.reports}/`),
  },
];

export function TeacherSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group relative -mb-px flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors",
                active
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon 
                size={18} 
                className={cn(
                  "transition-colors",
                  active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )} 
              />
              
              <span className="relative z-10">{tab.label}</span>
              
              {!active && (
                <div className="absolute inset-x-1 inset-y-2 rounded-md bg-transparent transition-colors group-hover:bg-[var(--muted)]/60" />
              )}
              
              {active && (
                <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--primary)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}