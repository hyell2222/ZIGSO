import { ReactNode } from "react";

import { TopNav } from "@/components/layout/top-nav";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex items-center justify-center py-40">{children}</main>
    </div>
  );
}
