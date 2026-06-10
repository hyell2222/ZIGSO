"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LucideIcon, Puzzle } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS: { 
  href: string; 
  label: string; 
  icon: LucideIcon;
  match: (path: string) => boolean 
}[] = [
  {
    href: ROUTES.activities,
    label: "내 활동",
    icon: Puzzle,
    match: (path) => path === ROUTES.activities || path.startsWith(`${ROUTES.activities}/`),
  },
  {
    href: ROUTES.reports,
    label: "활동 기록",
    icon: FileText,
    match: (path) => path === ROUTES.reports || path.startsWith(`${ROUTES.reports}/`),
  },
];

export function TeacherSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_5%,transparent)]">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group relative -mb-px flex items-center gap-2 px-4 py-4 text-base font-medium transition-colors",
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