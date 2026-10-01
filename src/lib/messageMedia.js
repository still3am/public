import { base44 } from "@/api/base44Client";

// Message attachments are private, so each one is signed on demand. The same
// file can appear several times in a thread (and again on re-render), so signed
// URLs are cached for the session and identical requests share one in-flight call.
const cache = new Map();
const inflight = new Map();
const TTL = 55 * 60 * 1000;

export async function signedMediaUrl(fileUri) {
  if (!fileUri) return "";

  const hit = cache.get(fileUri);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  if (inflight.has(fileUri)) return inflight.get(fileUri);

  const req = base44.functions
    .invoke("messageMediaUrl", { file_uri: fileUri })
    .then((res) => {
      const url = res?.data?.signed_url || "";
      if (url) cache.set(fileUri, { url, expiresAt: Date.now() + TTL });
      return url;
    })
    .catch(() => "")
    .finally(() => inflight.delete(fileUri));

  inflight.set(fileUri, req);
  return req;
}