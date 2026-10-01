import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Signed URL for one message attachment.
 *
 * Attachments live in private storage, so the file_uri alone can't be rendered.
 * Only the two members of the conversation carrying that attachment may sign it
 * — the media itself is never public.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = body?.file_uri;
    if (!fileUri) return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const rows = await base44.asServiceRole.entities.Message.filter({ media_url: fileUri });
    const allowed = (rows || []).some(
      (m) => m.sender_id === user.id || m.recipient_id === user.id
    );
    if (!allowed) return Response.json({ error: 'Not allowed' }, { status: 403 });

    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 3600,
    });

    return Response.json({ signed_url: signed?.signed_url || signed?.data?.signed_url || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}