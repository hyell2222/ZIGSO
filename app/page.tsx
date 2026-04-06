import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="flex justify-center items-center py-40">
        <section className="rounded-xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top,#0f3650_0%,#020617_45%,#020617_100%)] p-8">
          <div className="text-slate-300 flex flex-col gap-8 max-w-md mx-auto">
            <input type="text" placeholder="code number" className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none" />
            <Button className="w-full">Enter</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
