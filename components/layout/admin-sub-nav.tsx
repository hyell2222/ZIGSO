"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, FileText, LucideIcon } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS: { 
  href: string; 
  label: string; 
  icon: LucideIcon;
  match: (path: string) => boolean 
}[] = [
  {
    href: ROUTES.admin.cases,
    label: "사건 목록",
    icon: Briefcase,
    match: (path) => path === ROUTES.admin.cases || path.startsWith(`${ROUTES.admin.cases}/`),
  },
  {
    href: ROUTES.admin.sessions,
    label: "세션 보고서",
    icon: FileText,
    match: (path) => path === ROUTES.admin.sessions || path.startsWith(`${ROUTES.admin.sessions}/`),
  },
];

export function AdminSubNav() {
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