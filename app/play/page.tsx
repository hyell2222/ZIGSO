import { TopNav } from "@/components/layout/top-nav";
import { PlayRoom } from "@/components/play/play-room";

export default function PlayPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-100">Student Play Room</h2>
          <p className="text-sm text-slate-400">
            Join with classroom and team code. Collaborate, investigate, and submit your final deduction.
          </p>
        </div>
        <PlayRoom />
      </main>
    </div>
  );
}
