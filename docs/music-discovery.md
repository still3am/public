# External music discovery

Search displays Public results first, followed by Discover more. Upload has a Find music field. Every signed-in, unsuspended account can select a result and attach a full audio file in the existing upload queue. Upload pause settings remain effective.

The musicDiscovery backend searches fixed Apple iTunes and JioSaavn metadata endpoints in parallel, ranks by query-word matches, removes repeated title/artist/explicit combinations, and looks up selected songs by provider ID. One provider failing does not erase the other provider’s results. It normalizes only public metadata and source links, caches up to 100 searches for five minutes, applies the caller's explicit/adult preferences on every response, and uses caller-scoped Track reads for existing published or own pending matches. No external audio URLs, encrypted media data, cookies or credentials are exposed.

Selection is re-fetched server-side by provider ID. Metadata and available artwork prefill the ordinary upload review. Rights confirmation, exact-file verification, recording-match review, private audio storage and server-side publication permissions remain in the existing upload path. Selected metadata skips automatic AI detection; users can edit it and optionally request lyrics as before.

## Current limitation

BhariyaMusic's documented bhindi1.ddns.net host did not resolve during implementation. saavn.dev did not resolve; saavn.sumit.co returned HTTP 403. Direct JioSaavn metadata search returned HTTP 200 but had weak matches for US catalog examples. Apple iTunes search returned correct Pop Smoke/Dior results, so it supplements discovery. No working full-audio import provider was verified. This version therefore explicitly asks for an audio file; it does not advertise automatic downloads or convert previews to full songs. It does not implement YouTube extraction or DRM decryption. Provider infrastructure remains unofficial and may change.

The backend function uses Base44's normal authenticated invocation. Existing upload storage/integration usage still applies. No additional paid API or AI metadata lookup is introduced for discovery selections.

## Verification

Run music-discovery.test.mjs for auth, privacy, content settings, response normalization and upstream errors; upload-queue.test.mjs for upload retries, duplicate safety and seeded metadata; the full test suite, typecheck, lint and production build. Actual signed-in browser upload/approval playback still requires verification with a permitted audio file.
