import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { TopNav } from "@/components/layout/top-nav";

export default function AdminPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-40 mx-auto w-full max-w-7xl px-4 py-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
