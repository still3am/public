import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const svc = base44.asServiceRole;

    // 1) Soft-clean the user's contributed content. Failures are tolerated;
    //    we still attempt to remove the user record at the end.
    const cleanup = [
      svc.entities.Track
        .updateMany({ uploader_id: userId }, { $set: { is_published: false } })
        .catch(() => {}),
      svc.entities.Follow.deleteMany({ follower_id: userId }).catch(() => {}),
      svc.entities.Follow.deleteMany({ following_id: userId }).catch(() => {}),
      svc.entities.Notification.deleteMany({ user_id: userId }).catch(() => {}),
      svc.entities.Notification.deleteMany({ actor_id: userId }).catch(() => {}),
      svc.entities.Report.deleteMany({ reporter_id: userId }).catch(() => {}),
    ];
    await Promise.all(cleanup);

    // 2) Attempt to permanently delete the user record itself. If the platform
    //    refuses, fall back to anonymizing it so the user no longer has an
    //    identifiable presence in the app.
    let deleted = false;
    try {
      await svc.entities.User.delete(userId);
      deleted = true;
    } catch (_e) {
      // Service role may not be permitted to delete built-in User records.
      try {
        await svc.entities.User.deleteMany({ id: userId });
        deleted = true;
      } catch (_e2) {
        await svc.entities.User
          .updateMany(
            { id: userId },
            {
              $set: {
                display_name: '[deleted]',
                bio: '',
                avatar_url: '',
                banner_url: '',
                pronouns: '',
                location: '',
                website: '',
                instagram: '',
                twitter: '',
                soundcloud: '',
                status_message: '',
                featured_track_id: '',
                top_track_ids: [],
              },
            }
          )
          .catch(() => {});
      }
    }

    return Response.json({ success: true, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});