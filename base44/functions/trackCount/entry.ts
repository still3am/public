import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns the size of the public catalog as a single number, so the home page
// never has to download thousands of full track records just to count them.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const PAGE = 1000;
    let published = 0;
    let total = 0;
    // Page through every track so the count is never truncated by a query
    // limit, however large the catalog gets.
    for (let skip = 0; skip < 200000; skip += PAGE) {
      const page = await base44.asServiceRole.entities.Track.filter(
        {},
        '-created_date',
        PAGE,
        skip
      );
      if (!page || page.length === 0) break;
      total += page.length;
      published += page.filter((t) => t.is_published === true).length;
      if (page.length < PAGE) break;
    }

    return Response.json({ published, total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}