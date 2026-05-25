export function normalizeSiteMediaPath(ref: string): string {
  const t = ref.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return t.replace(/^\/+/, "/");
  return t;
}

const VIDEO_FILE_EXT = /\.(mp4|webm|mov|m4v|ogv|mkv|mpg|mpeg|3gp|3g2)(\?|#|$)/i;
const AUDIO_FILE_EXT = /\.(mp3|m4a|wav|ogg|oga|aac|flac|opus)(\?|#|$)/i;

export function isLikelyVideoFile(fileRef: string, formStr: string | null | undefined): boolean {
  const fm = (formStr ?? "").toLowerCase();
  if (fm.includes("video") || fm === "video") return true;
  const f = normalizeSiteMediaPath(fileRef).trim().toLowerCase();
  return VIDEO_FILE_EXT.test(f);
}

export function isLikelyAudioFile(fileRef: string, formStr: string | null | undefined): boolean {
  const fm = (formStr ?? "").toLowerCase().trim();
  if (fm.startsWith("audio/")) return true;
  if (fm.includes("audio")) return true;
  const f = normalizeSiteMediaPath(fileRef).trim().toLowerCase();
  return AUDIO_FILE_EXT.test(f);
}

/** Paths the host app can load in a `<video src>` (same-origin uploads or absolute http(s)). */
export function isPlayableVideoRef(fileRef: string): boolean {
  const t = normalizeSiteMediaPath(fileRef).trim();
  if (!t) return false;
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  return t.startsWith("/uploads/");
}

/** Paths the host app can load in an `<audio src>` (same-origin uploads or absolute http(s)). */
export function isPlayableAudioRef(fileRef: string): boolean {
  return isPlayableVideoRef(fileRef);
}

export function isLikelyRasterImage(fileRef: string, formStr: string, mimeHint: string | null): boolean {
  if (mimeHint && mimeHint.startsWith("image/") && !mimeHint.includes("svg")) return true;
  const f = normalizeSiteMediaPath(fileRef).trim().toLowerCase();
  if (/\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)(\?|$)/i.test(f)) return true;
  const fm = (formStr || "").toLowerCase();
  if (/\b(jpe?g|png|gif|webp|avif|bmp|heic|heif)\b/.test(fm)) return true;
  return false;
}

export function preferNativeRasterImgPreview(fileRef: string, formStr: string | null | undefined): boolean {
  const f = normalizeSiteMediaPath(fileRef).trim().toLowerCase();
  if (/\.(heic|heif)(\?|#|$)/i.test(f)) return true;
  const fm = (formStr ?? "").toLowerCase();
  if (fm.includes("heic") || fm.includes("heif")) return true;
  return false;
}

export function resolveMediaImageSrc(fileRef: string): string | null {
  const t = normalizeSiteMediaPath(fileRef.trim());
  if (!t) return null;
  if (t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://")) return t;
  return null;
}

export function mediaImageUnoptimized(src: string): boolean {
  if (src.startsWith("http://") || src.startsWith("https://")) return true;
  if (src.startsWith("/uploads/")) return true;
  if (src.startsWith("/api/admin/media/thumb/")) return true;
  return false;
}

const ADMIN_MEDIA_URL_PREFIX = "/uploads/gedcom-admin/";
const ADMIN_SITE_MEDIA_URL_PREFIX = "/uploads/site-media/";
const ADMIN_USER_MEDIA_URL_PREFIX = "/uploads/user-media/";
const ADMIN_MEDIA_THUMB_API_PREFIX = "/api/admin/media/thumb/";
const ADMIN_MEDIA_THUMB_API_VERSION = "2";

export function mediaThumbSrc(
  fileRef: string,
  formStr: string | null | undefined,
  width: number,
): string | null {
  const t = normalizeSiteMediaPath(fileRef.trim());
  if (!t) return null;
  if (!isLikelyRasterImage(t, formStr ?? "", null)) return null;
  const wq = Math.max(1, Math.floor(width));
  if (t.startsWith(ADMIN_MEDIA_URL_PREFIX)) {
    const remainder = t.slice(ADMIN_MEDIA_URL_PREFIX.length);
    if (!remainder || remainder.includes("..")) return null;
    return `${ADMIN_MEDIA_THUMB_API_PREFIX}${remainder}?w=${wq}&v=${ADMIN_MEDIA_THUMB_API_VERSION}`;
  }
  if (t.startsWith(ADMIN_SITE_MEDIA_URL_PREFIX)) {
    const remainder = t.slice(ADMIN_SITE_MEDIA_URL_PREFIX.length);
    if (!remainder || remainder.includes("..")) return null;
    return `${ADMIN_MEDIA_THUMB_API_PREFIX}site-media/${remainder}?w=${wq}&v=${ADMIN_MEDIA_THUMB_API_VERSION}`;
  }
  if (t.startsWith(ADMIN_USER_MEDIA_URL_PREFIX)) {
    const remainder = t.slice(ADMIN_USER_MEDIA_URL_PREFIX.length);
    if (!remainder || remainder.includes("..")) return null;
    return `${ADMIN_MEDIA_THUMB_API_PREFIX}user-media/${remainder}?w=${wq}&v=${ADMIN_MEDIA_THUMB_API_VERSION}`;
  }
  return null;
}
