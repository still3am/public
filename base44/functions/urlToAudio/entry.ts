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

    // ---- SSRF protection: validate hostname by RESOLVING it to an IP and ----
    // checking the resolved address, not just the hostname string. This blocks
    // decimal/hex/octal IP tricks and DNS names that resolve to private ranges.
    function isPrivateIPv4(ip) {
      const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (!m) return true; // reject malformed
      const [a, b] = [Number(m[1]), Number(m[2])];
      if ([m[1], m[2], m[3], m[4]].some((o) => Number(o) > 255)) return true;
      if (a === 0) return true;                  // 0.0.0.0/8
      if (a === 10) return true;                  // 10.0.0.0/8
      if (a === 127) return true;                 // 127.0.0.0/8
      if (a === 169 && b === 254) return true;    // 169.254.0.0/16 (link-local / metadata)
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true;    // 192.168.0.0/16
      if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
      if (a >= 224) return true;                  // multicast / reserved
      return false;
    }

    function isPrivateIPv6(ip) {
      const h = ip.toLowerCase();
      if (h === '::1' || h === '::') return true;            // loopback / unspecified
      if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10
      if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 ULA
      const mapped = h.match(/:(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
      if (mapped && isPrivateIPv4(mapped[1])) return true;
      return false;
    }

    function isAmbiguousLiteral(host) {
      // Reject encoded IPv4 forms: pure decimal (e.g. 2130706433), hex (0x7f000001),
      // octal (0177.0.0.1), or any part with non-dotted ambiguous notation.
      if (/^0x[0-9a-f]+$/i.test(host)) return true;
      if (/^[0-9]+$/.test(host) && !host.includes('.')) return true;
      if (/^[0-9.]+$/.test(host)) {
        const parts = host.split('.');
        if (parts.some((p) => /^0[0-9]+$/.test(p))) return true; // octal segment
        if (parts.some((p) => /^0x[0-9a-f]+$/i.test(p))) return true; // hex segment
      }
      return false;
    }

    async function assertSafeHost(host) {
      const h = host.replace(/^\[|\]$/g, '').toLowerCase();
      if (!h) throw new Error('Invalid hostname');
      if (h.endsWith('.localhost') || h === 'localhost') throw new Error('Private addresses are not allowed');

      if (h.includes(':')) {
        // IPv6 literal — only accept standard colon form, reject odd encodings.
        if (isPrivateIPv6(h)) throw new Error('Private addresses are not allowed');
        return;
      }

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        if (isPrivateIPv4(h)) throw new Error('Private addresses are not allowed');
        return;
      }

      if (isAmbiguousLiteral(h)) throw new Error('Private addresses are not allowed');

      // Domain name — resolve via DNS and reject if any record is private.
      let records = [];
      try {
        const a = await Deno.resolveDns(h, 'A');
        if (Array.isArray(a)) records = records.concat(a);
      } catch { /* try AAAA next */ }
      try {
        const aaaa = await Deno.resolveDns(h, 'AAAA');
        if (Array.isArray(aaaa)) records = records.concat(aaaa);
      } catch { /* ignore */ }
      if (!records.length) throw new Error('Could not resolve host');
      for (const r of records) {
        if (r.includes(':')) {
          if (isPrivateIPv6(r)) throw new Error('Private addresses are not allowed');
        } else if (isPrivateIPv4(r)) {
          throw new Error('Private addresses are not allowed');
        }
      }
    }

    async function assertSafeUrl(u) {
      let p;
      try { p = new URL(u); } catch { throw new Error('Invalid redirect URL'); }
      if (!/^https?:$/.test(p.protocol)) throw new Error('Only http(s) URLs are supported');
      await assertSafeHost(p.hostname);
      return p;
    }

    await assertSafeUrl(parsed);

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
            next = await assertSafeUrl(new URL(loc, current));
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