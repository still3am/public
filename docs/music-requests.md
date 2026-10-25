# Music Requests

## Experience

Signed-in listeners can open Music Requests from the desktop sidebar, mobile More menu, or Search's Request on PUBLIC link. Search prefills the song-title field. The form accepts title and artist, an optional original-platform link, and an optional cover image link from Apple Music or Spotify image hosting. Creating a request follows it automatically. Matching requests are grouped into one board entry with one count per supporter, including duplicate stored records created by separate workers.

The board offers Requested, Following, Available and All views; title/artist search; most-wanted/newest ordering; and incremental rendering. Listeners can follow or unfollow requests and open linked songs. Ordinary listeners cannot upload or fulfill requests.

Admins, approved uploaders and approved artists can review the same board, check available music, open Upload, and link an approved published recording with matching title and artist credits. Admin also has a Music Requests section and close/reopen controls. Closing retains demand but hides the request from ordinary listeners.

## Matching and notifications

The creator-session coordinator checks requests after catalog/publication events and when a creator session starts or reconnects. Creators also have an explicit Check available music action. This is foreground application coordination, not an independently scheduled background worker. Requests can also be fulfilled manually by an approved creator.

Automatic matching preserves live/remix/version titles and avoids automatic selection across clean/explicit editions or substantially different durations. Artist credit order, case, punctuation and accents are normalized. Missing or withdrawn playback links are not offered as available. Fulfillment checks uploader availability, publication, approval and blocks before linking. Availability notifications go to current supporters who can access the song. Retry delivery checks a per-request/per-track notification key. Delivery failure is reported separately from a saved song link; Notify listeners again can retry without re-sending existing deliveries. Database-wide exactly-once delivery under simultaneous independent workers is not claimed.

Availability notices appear in Activity/Music and open the PUBLIC song. No external platform audio is downloaded or transferred by this feature, and playlist importing remains separate.

## Data and permissions

MusicRequest is server-only: native create/read/update/delete rules are false. The music-requests backend authenticates the caller, rechecks the actual User record, validates structured inputs and platform links, and returns public request metadata plus aggregate demand and the caller's own support state. Supporter/account ID arrays are never included in the board response. Support changes use atomic set operations and verify stored results. New requests are limited to 10 distinct songs per account per day. Only current approved creators can fulfill/check matches, and only current admins can close/reopen. No existing upload permissions were changed.

Account cleanup removes the departing member's support and clears requester/resolver identifiers while retaining shared requests for other listeners.

## Verification

- Base44 schema listing confirmed MusicRequest and its server-only access rules. The Notification schema includes music_request_available.
- 82/82 regression suites passed, plus TypeScript, ESLint and production build.
- New backend tests cover validation, source URL restrictions, identity spoofing, duplicate/concurrent requests, unique demand, denied writes, private supporters, creator authorization, publication/version/block checks, notification failure/retry, close/reopen, automatic matching, ambiguity, accented titles, request-key validation and daily limits.
- New page tests exercise the actual component with isolated dependencies: search prefill, form submission, double-submit protection, following toggles, creator controls, linked playback and navigation. Service-notification tests verify the song destination and existing support/suggestion links.
- Existing regression suites cover playback, uploads, library/offline, lyrics, profiles, admin, notifications and security.
- No test requests, uploaded songs or notifications were created in production. Signed-in live browser/device verification has not been completed; the previously saved public URL returned App not found in the audit browser.
