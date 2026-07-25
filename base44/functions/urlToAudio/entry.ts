import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const MAX_BYTES = 80 * 1024 * 1024; // 80 MB hard cap to keep things reasonable
const ALLOWED_EXT = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg', 'oga', 'flac', 'aac', 'mpeg', 'mpga'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const url = (body?.url || '').trim();
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    let parsed;
    try { parsed = new URL(url); }
    catch { return Response.json({ error: 'Invalid URL' }, { status: 400 }); }

    if (!/^https?:$/.test(parsed.protocol))
      return Response.json({ error: 'Only http(s) URLs are supported' }, { status: 400 });

    const isPrivateHost = (h) =>
      h === 'localhost' || h.endsWith('.localhost') ||
      h === 'metadata.google.internal' ||
      /^(169\.254\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1|fe80:|fc00:|fd)/.test(h);

    function assertSafeUrl(u) {
      let p;
      try { p = new URL(u); } catch { throw new Error('Invalid redirect URL'); }
      if (!/^https?:$/.test(p.protocol)) throw new Error('Only http(s) URLs are supported');
      if (isPrivateHost(p.hostname.toLowerCase())) throw new Error('Private addresses are not allowed');
      return p;
    }

    assertSafeUrl(parsed);

    const fetchInit = { method: 'GET', redirect: 'manual' };

    let upstream;
    let current = parsed;
    const MAX_REDIRECTS = 5;
    try {
      for (let i = 0; i <= MAX_REDIRECTS; i++) {
        upstream = await fetch(current.toString(), fetchInit);
        if (upstream.status >= 300 && upstream.status < 400) {
          const loc = upstream.headers.get('location');
          if (!loc || i === MAX_REDIRECTS) {
            return Response.json({ error: 'Too many redirects or missing redirect target' }, { status: 502 });
          }
          let next;
          try {
            next = assertSafeUrl(new URL(loc, current));
          } catch (e) {
            return Response.json({ error: e.message }, { status: 400 });
          }
          current = next;
          continue;
        }
        break;
      }
    } catch (_e) {
      return Response.json({ error: 'Could not reach the URL. It may block cross-origin requests or require authentication.' }, { status: 502 });
    }
    if (!upstream.ok)
      return Response.json({ error: `Download failed (HTTP ${upstream.status})` }, { status: 502 });

    const contentType = (upstream.headers.get('content-type') || 'audio/mpeg').split(';')[0].trim();
    let contentLength = parseInt(upstream.headers.get('content-length') || '0', 10) || 0;

    // Read the body in memory. Cap at MAX_BYTES to avoid runaway memory use.
    const readers = upstream.body ? upstream.body.getReader() : null;
    let buf = new Uint8Array(Math.min(contentLength || 1024 * 1024, MAX_BYTES));
    let len = 0;
    if (readers) {
      try {
        while (true) {
          const { value, done } = await readers.read();
          if (done) break;
          if (len + value.length > MAX_BYTES) {
            return Response.json({ error: `File exceeds the ${Math.round(MAX_BYTES / 1024 / 1024)} MB limit` }, { status: 413 });
          }
          if (len + value.length > buf.length) {
            const grown = new Uint8Array(Math.min(buf.length * 2 + value.length, MAX_BYTES));
            grown.set(buf.subarray(0, len));
            buf = grown;
          }
          buf.set(value, len);
          len += value.length;
        }
      } finally {
        try { readers.releaseLock(); } catch {}
      }
    } else {
      const ab = await upstream.arrayBuffer();
      if (ab.byteLength > MAX_BYTES)
        return Response.json({ error: `File exceeds the ${Math.round(MAX_BYTES / 1024 / 1024)} MB limit` }, { status: 413 });
      buf = new Uint8Array(ab);
      len = ab.byteLength;
    }

    if (len < 1024)
      return Response.json({ error: 'File too small or empty' }, { status: 422 });

    let filename = (parsed.pathname.split('/').pop() || 'audio').split('?')[0] || 'audio';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (!ext || !ALLOWED_EXT.includes(ext)) filename = `${filename}.mp3`;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buf.subarray(0, len));
        controller.close();
      }
    });

    const file = new File([stream], filename, { type: contentType });

    const uploaded = await base44.integrations.Core.UploadFile({ file });
    return Response.json({
      file_url: uploaded.file_url,
      filename,
      content_type: contentType,
      size: len,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});