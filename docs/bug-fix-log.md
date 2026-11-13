# PUBLIC bug fix log

Check this log before reopening an issue. If a fixed issue returns, add the app version, device, route, and steps to reproduce to its entry.

## November 13, 2026 — route and regression audit

| Area | Status | Cause | Fix and verification |
| --- | --- | --- | --- |
| Navigation to Home, Search, Library, and Profile | Done in code | The exiting animated outlet could stay mounted after a persistent tab had already rendered. A second copy of the route could appear during the exit window. | Unmount the animated outlet when a persistent tab takes over. Added a regression check for the shared layout guard. |
| Search genre links | Done in code | The genre branch interpreted the initial empty track list as a completed result and bypassed catalog loading and failure states. | Show cached matching tracks if available. Otherwise show loading or a retry before rendering the empty state. Added a regression check. |
| Avatar and profile avatar tests | Done | The tests called the wrapper directly and expected its child to already be rendered. A profile fixture also treated separate error states as a single value. | Render the avatar child in the tests and exercise photo failure, default-image fallback, and initials in order. |
| Moments composer and playback tests | Done | The isolated test harness stripped imports without replacing new dependencies and seeded the older audio state format. | Updated the fixtures for the waveform, slideshow helper, DOM access, and loaded-song state. Playback, scrolling away, backgrounding, and publishing assertions run again. |

All 99 regression suites passed. Lint and production build passed. Static navigation audit found no unmatched destinations across 40 route patterns (including fallback) and 80 literal navigation references.

Live mobile and desktop checks remain open. The Base44 browser preview stayed on “Loading app data” after a reload. The automated results do not cover device-specific spacing, signed-in actions, or production deployment.

## Earlier fixes from this chat

| Area | Status | Cause and fix |
| --- | --- | --- |
| Top offline banner | Done in code | The global status component rendered a fixed banner on connectivity loss. Removed that banner and its connectivity listeners. |
| Search loading indicators | Done in code | Search and pull-to-refresh could each display a spinner. Search uses its own loading indicator, and the desktop field indicator is suppressed during initial result loading. |
| Favorites load popup | Done in code | A failed status read displayed an inline alert at the heart button. Removed the load alert and retained tap-to-retry. |
| Standalone offline page | Done in code | The old service worker responded to failed navigations with a cached standalone page. Its replacement clears that page's cache and stops intercepting navigation. Existing installations receive the change when the replacement worker updates. |
| Checking saved music banner | Done in code | The Offline library shared a banner for background checks and active downloads. Only active downloads show the progress banner. |

## November 13, 2026 — Search catalog follow-up

| Area | Status | Cause | Fix and verification |
| --- | --- | --- | --- |
| Search Browse catalog refresh | Done in code | The kept-mounted Search page fetched the entire catalog on every invalidation, including when hidden or showing people or query results. Its local catalog snapshot also survived the account-clear event. | Clear stale data and invalidate pending responses on either event. Defer the full read until Browse is visible and skip pull-to-refresh on the idle People screen. Lint, build, and all 99 suites passed. |

The Base44 editor preview still stalled at “Loading app data.” Signed-in mobile and desktop checks remain open.

## November 13, 2026 — catalog and refresh follow-up

| Area | Status | Cause | Fix and verification |
| --- | --- | --- | --- |
| Recently Added and Top Charts | Done in code | Page visits and chart-period changes always bypassed the shared music catalog cache, repeating a full paginated catalog read. Refresh failures were hidden when rows remained visible. | Ordinary reads reuse the shared cache. Pull-to-refresh and retry ask for fresh data. Failed refreshes show a retry alongside any retained rows. The navigation regression test checks ordinary and forced chart reads. |
| Top Charts, Rising Songs | Done in code | The no-results message assumed a filter caused the empty list even when the period had no rising songs. | Show “No rising songs yet” and point to the full chart when no search or genre filter is active. |
| Community Preview | Done in code | Retry reran the effect but reused the regular catalog cache policy. | Explicit retry requests a fresh catalog read. |

All 99 suites passed, along with lint and the production build. Device-level verification remains open.

## November 13, 2026 — Upload Studio

| Area | Status | Cause and fix |
| --- | --- | --- |
| Upload availability | Done in code | A settings read failure looked like an admin pause. Approved creators now get a distinct error and Retry button. |
| Upload wizard navigation | Done in code | A trailing slash selected the wrong step, and empty-session and add-more links dropped the song request. Normalize the path and retain the validated request context. |
| Publish summary | Done in code | The page only counted a local cover file toward release readiness. Catalog artwork now counts too, matching the upload queue. |
| Artwork upload retry | Done in code | A storage response without an artwork URL still marked the file as uploaded. Only confirmed cover URLs are cached. A retry can reuse uploaded audio and retry the artwork. Clearing artwork also stops the prior cover from carrying into a retry. |

Upload queue tests, Spotify request handoff tests, lint, and production build passed. Live uploads and mobile and desktop visual checks were not performed.

## November 13, 2026 — Suggestions and My Uploads

| Area | Status | Cause and fix |
| --- | --- | --- |
| Suggestions | Done in code | An unconfirmed submission could clear the form. An unconfirmed vote could leave a changed count visible. Require confirmation before clearing the form or keeping a vote. Restore the prior vote and show an error when saving fails. |
| Suggestions and My Uploads refresh | Done in code | A failed refresh was hidden when existing rows were visible. Keep those rows visible and provide a retry. |
| My Uploads account switching | Done in code | The page kept the prior list while loading a new account. Associate results with their owner and render them only for that account. |

All 99 suites, lint, and production build passed. Signed-in mobile and desktop visual checks remain open.

- Notifications — Done in code. Failed reloads were only visible when the inbox was empty. The inbox now shows a retry alongside existing activity. Notification recovery and link tests, lint, and production build passed after this change.

## November 13, 2026 — Library and Public Record

| Area | Status | Cause and fix |
| --- | --- | --- |
| Library song filters | Done in code | Library committed folder and tag metadata before fetching song rows. If a song fetch failed, retained rows could be shown with filters from a different snapshot. Commit metadata and rows together after the full read succeeds. |
| Library and Public Record refresh | Done in code | A failed refresh could be hidden behind existing results. Keep those results visible and show a retry. |

All 99 regression suites passed after lint and the production build. Signed-in mobile and desktop checks remain open.

- Admin Upload Studio — Done in code. Complete admin tracks previously required advancing to the final upload screen. Review now offers Upload to PUBLIC for tracks with artwork, artist, genre, a title, and confirmed rights. The existing upload queue publishes eligible admin tracks immediately. Upload queue and request handoff tests, lint, and build passed.

- Upload audio retry — Done in code. The server rejected the private audio reference, and retry reused it. Retry now requests a new audio upload, the editor replaces the raw error with recovery instructions, and the ready label is suppressed during an error. Upload tests, lint, and build passed. The live storage response that triggered the original rejection remains unverified.

- Upload genre fallback — Done in code. Blank genres could block public release even though the save payload defaulted to Other. Metadata detection now fills Other when no genre is available, and release eligibility uses that same fallback. Upload and request handoff tests and build passed.

- Upload audio verification and genre matching — Done in code. The gateway rejected storage references based on a hard-coded prefix before Base44 could validate them. The gateway now requires successful signing with the uploader’s own storage permissions. Upload genre matching tries ranked MusicBrainz recording and album genres, including supported aliases, before falling back to Other. Upload, gateway, and song matching tests and build passed. Live storage verification remains open.

- Home, From artists you follow — Done in code. The shelf reused notification results, which exclude tracks released before the artist was followed. Home now includes existing releases, while notification counts use post-follow releases. Matching also recognizes full artist credits for names containing separators. Release regression tests, notification tests, and build passed.

- Home mobile overflow — Done in code. The followed-artist shelf was missing horizontal overflow containment. Matched the other Home shelves so swiping stays inside the row. Carousel and release tests and build passed. iPhone visual verification remains open.

- Home mobile shelf sizing — Done in code. A broad mobile rule set shelf cards to 90% of the row, overriding their intended widths. Scope sizing to music cards and align Home section headings and See all links. Home carousel and release tests and build passed. iPhone visual check remains open.

- Upload batch rate limits — Done in code. Base44 throttling during duplicate checks or track saves previously failed the song immediately. These requests now wait and retry with a shared cooldown, retaining uploaded files and the original request ID. If retries run out, the song remains queued. Upload tests, lint, and build passed. A live rate-limited batch remains unverified.

- Synced lyrics pink line — Removed per-line blur from the masked lyrics scroller as a likely rendering artifact. The active lyric still uses full opacity. Lyrics UI and clock tests and build passed. Visual confirmation remains open.

## November 13, 2026 — page load and refresh follow-up

- Track details — Done in code. Missing or inaccessible tracks returned a generic retry screen. They now show “Track unavailable.” Temporary read failures still offer Retry.
- Home, Profile, and artist details — Done in code. Refresh errors could be hidden behind loaded content. These pages now show Retry alongside the last loaded content, and artist details retain content while refreshing.

All 99 test suites, lint, and production build passed. Signed-in mobile and desktop visual checks remain open.

- Profile QR palette — Done in code. Removed the three-color cap so the QR card uses the same palette as the profile. Lint and production build passed.

- Onboarding names and mood swatches — Done in code. Find your people now falls back to the public full name and skips nameless suggestions. The swatch row reserves space for all five colors so it cannot overlap the label. Onboarding tests and build passed.

- Profile QR five-color follow-up — Done in code. The QR card accepted the full palette, but Profile still supplied only three artwork colors in Automatic mode. Automatic mode and the static profile gradient now support five colors. Profile regression tests, lint, and build passed. Visual verification remains open.

- QR card palette visibility — Added a strip above the QR code showing each available profile color in order. Gradient blending and shading could make individual colors hard to distinguish. Lint and build passed.
