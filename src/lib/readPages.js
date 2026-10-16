// The app never wants half a list: every catalogue read follows the server's
// cursor until the collection is exhausted, so nothing is silently cut off at
// one page. Callers pass a page fetcher that receives the per-request options.
export const PAGE_SIZE = 2000;
const MAX_PAGES = 40; // safety stop, far above the current catalogue size

export async function readAllPages(fetchPage) {
  const out = [];
  let cursor;
  const seenCursors = new Set();
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchPage(
      cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE }
    );
    // A page object carries { items, has_more, next_cursor }; anything else
    // (a plain array) is already the whole answer.
    if (Array.isArray(res)) {
      out.push(...res);
      return out;
    }
    if (!res || !Array.isArray(res.items) || (res.has_more !== undefined && typeof res.has_more !== "boolean")) throw new Error("This list returned an invalid response. Please refresh and try again.");
    out.push(...res.items);
    if (!res?.has_more) return out;
    if (typeof res.next_cursor !== "string" || !res.next_cursor || seenCursors.has(res.next_cursor)) throw new Error("This list could not finish loading. Please refresh and try again.");
    seenCursors.add(res.next_cursor);
    cursor = res.next_cursor;
  }
  throw new Error("The collection exceeds this request limit. Narrow your search or contact support.");
}