"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopNav } from "@/components/layout/top-nav";
import { ROUTES } from "@/lib/routes";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      if (!hasSupabaseEnv) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
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
    router.replace(ROUTES.admin.projects);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-20">
        <p className="text-sm text-slate-400">Redirecting...</p>
      </main>
    </div>
  );
}
