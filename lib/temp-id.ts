/** 폼/에디터 임시 엔티티 id (DB 저장 전 클라이언트 전용) */
export function makeTempId(): string {
  return Math.random().toString(36).slice(2, 10);
}
