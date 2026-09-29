import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Returns the size of the public catalog as a single number, so the home page
// never has to download thousands of full track records just to count them.
//
// Counting pages through the whole collection, which is the most expensive read
// the app performs, so the answer is shared app-wide (not just per browser) and
// re-measured at most once an hour.
const FRESH_MS = 60 * 60 * 1000;
const PAGE = 1000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // The count lives on the app's settings row. Never create one here — a second
    // settings row would shadow the real one for every other settings reader.
    let setting = null;
    try {
      const rows = await base44.asServiceRole.entities.AppSetting.list('-created_date', 1);
      setting = rows?.[0] || null;
    } catch {
      setting = null;
    }

    const cached = Number(setting?.catalog_count);
    const countedAt = setting?.catalog_counted_at
      ? Date.parse(setting.catalog_counted_at)
      : NaN;
    if (
      Number.isFinite(cached) &&
      Number.isFinite(countedAt) &&
      Date.now() - countedAt < FRESH_MS
    ) {
      return Response.json({ published: cached, cached: true });
    }

    let published = 0;
    let complete = true;
    for (let skip = 0; skip < 200000; skip += PAGE) {
      let page = null;
      try {
        page = await base44.asServiceRole.entities.Track.filter(
          { is_published: true },
          '-created_date',
          PAGE,
          skip
        );
      } catch {
        // Rate limited or timed out mid-scan — abort rather than report a
        // partial count as if it were the real one.
        complete = false;
        break;
      }
      if (!page || page.length === 0) break;
      published += page.length;
      if (page.length < PAGE) break;
    }

    if (!complete) {
      return Response.json({
        published: Number.isFinite(cached) ? cached : null,
        cached: true,
      });
    }

    if (setting) {
      await base44.asServiceRole.entities.AppSetting
        .update(setting.id, {
          catalog_count: published,
          catalog_counted_at: new Date().toISOString(),
        })
        .catch(() => {});
    }

    return Response.json({ published, cached: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}