import Link from "next/link";
import { Shield } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function TopNav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <Link href={ROUTES.home} className="text-xs uppercase tracking-[0.22em] text-cyan-400/90">
            CODEZERO
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={ROUTES.admin.root}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
          >
            <Shield className="h-4 w-4" />
            Teacher
          </Link>
        </nav>
      </div>
    </header>
  );
}
