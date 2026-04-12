"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getCurrentSession } from "@/lib/api/auth";
import { TopNav } from "@/components/layout/top-nav";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (!hasSupabaseEnv) {
      router.replace(ROUTES.admin.signIn);
      return;
    }
    if (!sessionQuery.data) {
      router.replace(ROUTES.admin.signIn);
      return;
    }
    router.replace(ROUTES.admin.scenarios);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-20">
        <p className="text-sm text-[var(--muted-foreground)]">Redirecting...</p>
      </main>
    </div>
  );
}
