import Link from "next/link";

import { ROUTES } from "@/lib/routes";

/** App Router 글로벌 404 (`notFound()` 호출 또는 존재하지 않는 경로) */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="font-mono text-6xl font-bold tabular-nums text-[var(--accent)] md:text-5xl">404</p>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          주소가 바뀌었거나 삭제된 페이지입니다. 입력한 URL을 다시 확인해 주세요.
        </p>
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href={ROUTES.home}
          className="inline-flex h-10 items-center rounded-md bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:brightness-95"
        >
          홈으로
        </Link>
        <Link
          href={ROUTES.login}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--tint-accent)]"
        >
          로그인
        </Link>
      </nav>
    </main>
  );
}
