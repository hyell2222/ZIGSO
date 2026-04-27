import type { NextRequest } from "next/server";
import { POST as postHandler } from "../generate-scenario/route";

// 세그먼트 설정은 이 파일에 직접 두어야 하며(정적 파싱), re-export 는 불가.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return postHandler(req);
}
