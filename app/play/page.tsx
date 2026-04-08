import { TopNav } from "@/components/layout/top-nav";
import { PlayPageClient } from "@/app/play/play-page-client";

export default function PlayPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-100">Player Session Room</h2>
          <p className="text-sm text-slate-400">
            Join a session with join code, set your nickname, get a random team assignment, and submit your vote.
          </p>
        </div>
        <PlayPageClient />
      </main>
    </div>
  );
}
