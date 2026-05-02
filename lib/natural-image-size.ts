/**
 * 원격/로컬 이미지 URL 의 자연 크기(naturalWidth/Height)를 한 번 읽는다.
 * 실패 시 1×1 대신 호출부에서 폴백하도록 `{ w: 0, h: 0 }` 을 돌릴 수 있게 한다.
 */
export function loadImageNaturalSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      resolve({
        w: Number.isFinite(w) && w > 0 ? w : 0,
        h: Number.isFinite(h) && h > 0 ? h : 0,
      });
    };
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}
