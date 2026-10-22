# Direct music discovery

## Active path
Search and Upload use src/lib/musicDiscovery.js to call Deezer's public search and track lookup endpoints directly using provider-supported JSONP. No Base44 function, AI integration, secret, or paid API key is used for these metadata requests. Existing itunes: selections remain supported via direct iTunes lookup; old bare JioSaavn IDs ask the user to select a song again.

This replaces the original musicDiscovery function dependency. A real request to Public's hosted function endpoint returned HTTP 402 with reason integration_credits_limit_reached, even though upstream metadata searches worked from the sandbox. Thus changing only the server-side source would not fix discovery. The old function remains for compatibility but is no longer invoked by discovery UI.

Both search and selection filter explicit content against the active account's show_explicit and adult_confirmed preferences. Public metadata cache entries contain no user data; results are filtered separately for every caller. Requests are debounced, stale UI responses ignored, callbacks time out and clean up, and only fixed provider endpoints and normalized source/artwork hosts are accepted.

Every signed-in, unsuspended account can select a result and attach an audio file in the existing upload queue. Metadata and available artwork prefill the ordinary review. Rights confirmation, exact-file verification, private storage, upload pause settings and server-side publication permissions remain in the existing path. Selected metadata skips AI detection.

## Limits
Deezer's public API returns metadata and previews, so its results still require an attached audio file. The Full tracks tab adds Internet Archive netlabel collections, which expose complete downloadable MP3s. Search and metadata are direct CORS-enabled browser requests, with no API key or Base44 discovery function.

An Archive selection is re-resolved against item metadata before download. Restricted, private, preview-length and oversized files are excluded. Original MP3s are preferred over duplicate derivatives. Download verifies status, media type, MP3 signature, maximum bytes and expected total bytes; truncated/partial responses fail. Cancellation and a 60-second deadline apply. After the user reviews source/license permissions, the complete File enters the existing review queue; source attribution, source URL and available license link are retained in the saved song description. The upload rights checkbox remains unchecked so the actual submission still requires review.

Archive is mainly independent and archive music, not a full mainstream music catalog. Unknown content ratings are labeled unverified and must be reviewed in the upload form. Availability or a license URL is not treated as a grant for every use.

The app's monthly integration credits are currently exhausted. This change removes the function gateway from discovery and lookup only. Existing audio storage, duplicate verification and publication operations may still be blocked by Base44's exhausted limit. These protections are not bypassed.

## Verification
Deezer search and track lookup returned HTTP 200 with the correct Pop Smoke/Dior metadata. Unit tests exercise actual request construction, JSONP callbacks and cleanup, preference isolation, caching, lookup validation, provider failures and the normal upload review. Production typecheck, lint, build and the full suite are also required. Live Archive search, selection and complete 4,559,733-byte MP3 download were verified for a 155.79-second recording. The new archive-music tests verify file validation, size limits, cancellation, private-item exclusion and provenance; upload-queue tests verify preparation and attribution. A signed-in browser upload has not been verified.
