"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { HomeLanding } from "@/components/marketing/home-landing";
import { getCurrentSession } from "@/lib/api/auth";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session-query";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      return getCurrentSession();
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isFetching && !sessionQuery.data) return;
    if (sessionQuery.data) router.replace(ROUTES.admin.cases);
  }, [router, sessionQuery.data, sessionQuery.isLoading, sessionQuery.isFetching]);

  return (
    <>
      <TopNav />
      <main className="min-h-[calc(100dvh-3.75rem)]">
        <HomeLanding />
      </main>
    </>
  );
}
