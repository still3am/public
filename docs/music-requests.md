# Music Requests

## Experience

Signed-in listeners can open Music Requests from the desktop sidebar, mobile More menu, or Search's Request on PUBLIC link. Search prefills the song-title field. The form accepts title and artist, an optional original-platform link, and an optional cover image link from Apple Music or Spotify image hosting. Creating a request follows it automatically. Matching requests are grouped into one board entry with one count per supporter, including duplicate stored records created by separate workers.

The board offers Requested, Following, Available and All views; title/artist search; most-wanted/newest ordering; and incremental rendering. Listeners can follow or unfollow requests and open linked songs. Ordinary listeners cannot upload or fulfill requests.

Admins, approved uploaders and approved artists can review the same board, check available music, open Upload, and link an approved published recording with matching title and artist credits. Admin also has a Music Requests section and close/reopen controls. Closing retains demand but hides the request from ordinary listeners.

## Matching and notifications

The creator-session coordinator checks requests after catalog/publication events and when a creator session starts or reconnects. Creators also have an explicit Check available music action. This is foreground application coordination, not an independently scheduled background worker. Requests can also be fulfilled manually by an approved creator.

Automatic matching preserves live/remix/version titles and avoids automatic selection across clean/explicit editions or substantially different durations. Artist credit order, case, punctuation and accents are normalized. Missing or withdrawn playback links are not offered as available. Fulfillment checks uploader availability, publication, approval and blocks before linking. Availability notifications go to current supporters who can access the song. Retry delivery checks a per-request/per-track notification key. Delivery failure is reported separately from a saved song link; Notify listeners again can retry without re-sending existing deliveries. Database-wide exactly-once delivery under simultaneous independent workers is not claimed.

Availability notices appear in Activity/Music and open the PUBLIC song. No external platform audio is downloaded or transferred by this feature, and no audio or PUBLIC playlist is created from an external link.

## Data and permissions

MusicRequest is server-only: native create/read/update/delete rules are false. The music-requests backend authenticates the caller, rechecks the actual User record, validates structured inputs and platform links, and returns public request metadata plus aggregate demand and the caller's own support state. Supporter/account ID arrays are never included in the board response. Support changes use atomic set operations and verify stored results. New requests are limited to 10 new song or playlist requests per account per day. Only current approved creators can fulfill/check matches, and only current admins can close/reopen. No existing upload permissions were changed.

Account cleanup removes the departing member's support and clears requester/resolver identifiers while retaining shared requests for other listeners.

## Verification

- Base44 schema listing confirmed MusicRequest and its server-only access rules. The Notification schema includes music_request_available.
- 82/82 regression suites passed, plus TypeScript, ESLint and production build.
- New backend tests cover validation, source URL restrictions, identity spoofing, duplicate/concurrent requests, unique demand, denied writes, private supporters, creator authorization, publication/version/block checks, notification failure/retry, close/reopen, automatic matching, ambiguity, accented titles, request-key validation and daily limits.
- New page tests exercise the actual component with isolated dependencies: search prefill, form submission, double-submit protection, following toggles, creator controls, linked playback and navigation. Service-notification tests verify the song destination and existing support/suggestion links.
- Existing regression suites cover playback, uploads, library/offline, lyrics, profiles, admin, notifications and security.
- No test requests, uploaded songs or notifications were created in production. Signed-in live browser/device verification has not been completed; the previously saved public URL returned App not found in the audit browser.

## Apple Music playlist requests

The request form has Song and Playlist modes. Playlist mode accepts a public music.apple.com playlist URL, previews its name, curator and exposed song list, then submits one shared playlist request. The server reads a bounded public HTML response (10-second timeout, 3 MB response limit, 500 visible songs maximum), follows no redirects, uses no account credentials, and parses Apple’s public serialized page data. A five-minute, bounded in-memory cache avoids duplicate fetches during preview/submit. Metadata supplied by the browser cannot replace the server snapshot. Requests are deduplicated by Apple playlist ID across URL titles and tracking parameters. The existing daily request limit applies to playlists too.

Each playlist card exposes a scrollable song list and available/total count. Only exact, unambiguous, approved, published and accessible PUBLIC recordings receive playback links; missing songs remain visible for creators. Complete public snapshots become available when every listed song is playable. Partial or unknown totals stay open and are clearly labeled. Creators can refresh the source snapshot explicitly when a playlist changes. This is a request board and recording lookup, not full playlist transfer, audio downloading or automatic PUBLIC playlist creation. Public Apple page formats can change; unreadable/private pages produce a retryable error rather than fabricated songs. Spotify and other playlist providers are not implemented in this update.

The creator coordinator and Check available music action reconcile playlist completion. Completion notices link back to Following on the request board, with song-list snapshot fingerprints for retry deduplication. Each supporter’s access is checked separately before a notice is sent. A changed playlist snapshot can receive a new completion notice when its new song list becomes available. Existing song requests and their manual fulfillment are retained.

Verification for this extension: the production parser and normal public HTTP fetch both read all 25 of 25 songs from the supplied New Music Apple Music URL. Mock-only tests cover preview without writes, invalid/private/oversized pages, server-trusted snapshots, URL deduplication, partial progress, per-user blocks, creator-only refresh, completion notification retries, partial snapshots and the actual playlist-mode page controls. No live listener requests or notifications were generated for testing.

## Simpler link flow and song autofill

The form now starts with one optional song-or-playlist link field. Apple Music link type is detected automatically; no Song/Playlist switch is needed. A 650 ms debounce reads supported links, with an explicit Check link/Try again fallback. Song metadata uses Apple’s official iTunes ID lookup endpoint, not full-track streaming. Storefront and exact track ID are validated, the fetch is limited to eight seconds and 500 KB, and a bounded five-minute in-memory cache and per-instance 18-new-lookups/minute guard reduce upstream traffic. Apple’s documented approximate API limit is 20 calls/minute; this guard is not a distributed quota across independent backend instances.

Playlist previews now include per-viewer availability before submission. The full list starts collapsed; available/missing counts remain visible on previews and submitted cards. Users explicitly submit Request song or Request playlist after reviewing. Failure to resolve a song does not block manual title/artist entry. Changing the link clears autofilled details and invalidates pending responses; lookup failures retain the draft. Preview no longer reloads the whole request board. Lookup results never create requests or notify users.

Official Apple Music API is a future option for structured playlist retrieval; it requires a developer token and is not connected by this update. The public playlist reader continues to operate as documented above. The iTunes lookup endpoint was verified with a normal public HTTP request returning a real song. New tests exercise auto detection/debouncing, song autofill, source changes during in-flight lookup, manual fallback, exact ID verification, cache reuse, lookup budgets and playlist progress before submission.

## Spotify requests for approved uploaders

The same link field recognizes HTTPS open.spotify.com track links, including intl-xx paths. Spotify’s documented public oEmbed endpoint supplies the title and optional cover with an eight-second/100 KB limit, a bounded five-minute cache and a per-instance 20-lookups/minute guard. Only title/thumbnail are used; embedded HTML is never rendered. oEmbed has no artist credit field, so the listener confirms the artist before sending. Unavailable previews allow manual title/artist entry. Spotify playlist and short-link expansion are not part of this update.

Submitting a Spotify song stores a canonical Spotify URL on the server-only MusicRequest, preserving any earlier Apple/original link when requests combine. The backend sends music_request_new notifications to active current admins, uploaders and approved artists, excluding the actor, original requester and either-party blocked accounts. A per-recipient/per-request notification key avoids repeated alerts on duplicate requests and retries (no cross-worker exactly-once claim). The confirmed request is retained if delivery fails, and requester/approved-creator Notify uploaders retries delivery without duplicating successful notices. Requests close/reopen and creator fulfillment still use the existing permission checks. No live notifications were generated during development or testing.

Uploader notices open the specific request; Activity’s Music view includes them. The request card exposes Open Spotify and Start upload. The upload handoff shows the requested title/artist, a copy-details action, the source link and a return link, carrying this context across upload steps. It does not alter the selected file’s tags or existing upload/rights/approval checks. Publishing an approved exact match uses the existing request fulfillment and listener availability notification flow. This feature sends requests and metadata references; it does not fetch audio from Spotify.
