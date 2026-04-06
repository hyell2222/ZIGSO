"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminDashboard } from "@/app/admin/components/admin-dashboard";
import { TopNav } from "@/components/layout/top-nav";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    },
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (!sessionQuery.data) router.replace(ROUTES.admin.signIn);
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-40">
        {sessionQuery.data && (
          <AdminDashboard
            onSignOut={async () => {
              await signOutMutation.mutateAsync();
            }}
            isSigningOut={signOutMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}
