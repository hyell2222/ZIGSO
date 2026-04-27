import type { NextConfig } from "next";

/**
 * `output: "export"`(정적 `out/`)이면 App Router **API 라우트가 빌드에 없음** → `/api/*` 404.
 * Vercel·Node 호스팅: 이 플래그를 끄고 기본 `next build`로 `/api/ai/...` 등이 동작함.
 * 제출용 정적 사이트: `npm run export`(STATIC_EXPORT=1)만 사용.
 */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
