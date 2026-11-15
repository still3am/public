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

- Shared with You desktop — Done in code. The shelf stacked three messages per column. Desktop now uses a horizontal cover-card row with sender and message below the artwork. Desktop Activity test and build passed. Visual verification remains open.

- Shared with You desktop covers now open the song page. Removed the play overlay from the desktop cards. Production build passed.

- Moments desktop GIF picker — Done in code. The mobile sheet floated over the desktop discussion. Desktop now embeds the picker above the comment field with scrollable results. Build passed.

- Moments GIF picker — Added reaction categories, search retry, and a compact toggle. Scoped the comment form styles so they do not affect GIF search. Fixed suspended authors appearing in the feed. Also fixed an AvatarPicker JSX error that blocked the build. Moments tests, lint, and build passed. Live GIPHY and device layout checks remain open.

- Moments feed regression — The unsupported bulk User lookup broke the live feed. The feed uses PublicProfile visibility set by the suspension workflow. Tests now reject bulk User lookups and verify hidden authors are excluded from feed and direct links. Moments tests, lint and build passed.

- Moments replies and GIF close — Comments now show View replies only for visible replies. Removing the last reply hides the control. The GIF picker uses its dedicated header close button with the shared dialog close disabled. Moments tests and build passed.
- Moments comment delete control — Done in code. CSS-only hiding made the X unreliable on touch. Render it only for the selected comment, reveal it on keyboard focus, stop the delete tap from bubbling to the row, and clear selection after deletion. Production build passed. Visual device verification remains open.
- Moments comments and GIPHY exit X — Done in code. Both close controls now share the same smaller 36px button, 18px icon, transparent background, and no border or circle. Comments only overrides the button position. Production build passed; device visual verification remains open.
- Marketplace GIPHY search — Done in code. The Marketplace looked for a separate `GIPHY_MARKETPLACE_API_KEY`, while Moments and GIF comments use `GIPHY_API_KEY`. Marketplace search and add-to-marketplace now use the existing key. Production build passed.
- PUBLIC Marketplace and GIPHY picker — Done in code. Avatar and banner libraries opened as separate dialogs, and Marketplace GIPHY only supported the gallery it was opened from. Added one shared Marketplace dialog with Avatars/Banners tabs; GIPHY now has Moments-style categories, search, scroll pagination, and an Avatar/Banner destination switch. The backend reuses the existing GIPHY key and returns paginated search results. Production build passed; visual device verification remains open.

- Marketplace layout — Done in code. The embedded avatar and banner panels inherited viewport widths from their old standalone dialogs, clipping the right edge of the banner cards and footer. Both panels now fit the dialog’s content width. The banner grid adapts to the space available, and short windows use one scroll area. Production build passed. Device visual verification remains open.

- New Playlist sheet — Done in code. The form lacked its own responsive sizing, leaving the artwork, name, visibility control, and submit button oversized and loosely spaced on mobile. Added a narrower desktop modal and a compact mobile bottom sheet with adjusted cover sizing, input spacing, and safe-area padding. Production build passed. Device visual verification remains open.

- Moments admin badges and profile GIFs — Fixed the stale badge source by resolving current User role and profile appearance after the visible PublicProfile gate, with bounded fallback lookups when bulk User lookup is unavailable. Admin badges now receive the saved profile colors/motion in reels and comments. Uploaded profile GIFs now animate wherever avatars render even when callers omit the motion flag; video avatars still respect it. Production build checked; live Moments and device verification remain open.
- PUBLIC P GIF persistence — Fixed in code. The GIF URL was saved on PublicProfile, but the built-in User record omitted the GIF field. Profile synchronization treated that missing field like a clear, and Moments read the User field first. Sync now preserves saved GIF/video media when the poster still matches, and both Moments and the owner profile read the saved animation as a fallback. An explicit empty User field still clears the animation. The Ads profile image remains in its saved record. Production build and diff checks passed; live signed-in visual verification remains open.
- Admin track approvals — Fixed in code. The admin helper tried to write `published_at` directly even though the Track schema reserves that field for the server; the approval UI hid the API error behind a generic toast. Route moderation through the existing server function, which writes the publication timestamp with server permissions, and show the underlying failure in the toast. The pending “Sober (Unreleased)” record has artist, genre, artwork, and rights confirmed, so missing review metadata was not the blocker. Production build passed; live approval verification is pending.
- Queue add and player options — Fixed in code. The queue picker only marked tracks added during its current session, so songs already in the queue could still show a plus; the small target was also hard to tap. It now syncs with the current queue, prevents duplicate additions, and uses a 44px target. The player options touch trigger could bubble into the full-screen player’s swipe handler, making the menu feel glitchy; pointer and touch events are now isolated. Production build and diff checks passed; live device verification remains open.
- Send a song to a friend — Fixed in code. The picker only searched after typing and relied on a capped global people search, so it didn’t show the listener’s existing follow list and could omit followed accounts from search results. It now loads every followed account with paginated Follow reads, shows that list immediately, merges followed matches into name searches, and offers retry while preserving followed matches if global search fails. Production build and diff checks passed; live send and device checks remain open.

- Moments author names — Fixed in code. The author lookup preferred the account name over the public profile name. Moments now uses the public display name, then the public username or full name. Live Ads verification remains open.

- Profile picture badges — Reused the Moments comment badge across shared avatars. Search, discovery, and onboarding now pass public badge fields, and profile comments load visible authors in batches. The full profile header keeps its existing badge. Production build passed. Live layout verification remains open.

- Profile comments section — Removed the conversation panel from the main profile page. The profile media viewer still opens its own comment thread. Production build and diff checks passed.

## November 14, 2026 — PUBLIC route and regression audit

- Moments — The outside tap handler could skip registration before the feed loaded. It now reads the current feed at tap time. Automatic pagination checks that IntersectionObserver exists so the manual load button can work in older browsers.
- Artist Dashboard — A failed upload and totals refresh was hidden after the first successful load. Retained rows now appear alongside a retry.
- Policies — The Privacy route matched trailing slashes and mixed case, but the page chose its content using an exact pathname. It now normalizes the path.
- Marketplace — Removal retries validated the item against the gallery after it was already hidden. Avatar and banner removals now recognize an existing removal before checking gallery membership. Avatar removal also confirms the admin session before writing.

All 99 automated suites passed, including repaired fixtures for current admin moderation, public Moments access, and profile media. Lint and production build passed. Static navigation checked 39 route patterns and 24 literal links, with no unmatched links. Live signed-in workflows and mobile and desktop layouts still need verification.

- Playlist detail and saving — Fixed in code. Playlist details and save status could carry across account switches. Both now belong to the current account and playlist, and save or removal reports success only after a read confirms the change. Playlist UI regression checks, lint, and production build passed.
- Send to a friend — Fixed in code. The mobile keyboard opened over the initial follow list, remote search could delay local matches, and filtering blocked results could leave a blank screen. The list now opens without autofocus, followed matches remain available during remote search, and the empty state uses eligible results. The send action rechecks recipient eligibility. Lint and production build passed. Live sharing and device layout checks remain open.

- Messages avatars and chat state — Fixed in code. Inbox and conversation reads omitted the recipient’s public profile, so the UI always rendered initials. The API now supplies public avatar and badge fields and the UI uses the shared Avatar component in inbox, requests, search, and the chat header. Chat state is scoped to the signed-in account and selected conversation. A synchronous guard prevents repeated submits, and send/accept responses cannot replace a different conversation. Lint and production build passed. Live delivery and device layouts remain unverified.

- Messages refresh recovery — Inbox and conversation reads now have separate retry states that clear on a successful refresh. Polls no longer stack when a read is slow, and the latest chat read wins after sending or switching threads. Lint and production build passed during the audit. Signed-in verification remains open.

- Messages send retries — A send could save the message and then lose the response or fail while updating the inbox preview. The composer reuses the same request ID when retrying the same text, and the server checks for the saved message before creating another. Retries can repair the conversation preview. Lint and frontend build passed. Live network interruption and schema verification remain open.

- Messages layout — Added conversation search, clearer active and keyboard focus states, larger tab targets, a multiline composer, and a New message action on the desktop empty screen. Lint and frontend build passed. Live device layout verification remains open.

- Messages replies and song playback — Fixed in code. Reply now focuses the attached composer ref. Desktop Enter submits song-only messages, and playback accepts published tracks served through private audio storage. Lint and frontend build passed. Live playback and touch checks remain open.

- Messages render crash — The inbox search icon was referenced without an import after the song and reply controls were added. Restored the import so an inbox with conversations can render. Lint and build passed.

- Messages action menu — Added touch hold, right-click and an options button. Supports replies, copying text, opening and playing shared songs, and confirmed deletion of messages you sent. The server checks conversation and sender and refreshes the inbox preview. Production build passed. Live touch and deletion checks remain open.

- Messages emoji reactions — Added a reaction strip, selected-message preview, and separate action panel. Each participant can set, replace, or remove their own reaction. Build passed. Live reaction sync and layout remain unverified.

- Messages menu clipping — Position the reaction strip and actions using the measured panel and visible viewport, including resize and zoom. Production build passed. Live iPad check pending.

- Messages narrow layout — Position the reaction menu after its portal mounts and constrain the emoji grid, chat, and composer to their available space. Production build passed. Live iPad verification remains open.

- GIF picker pagination — Use GIPHY’s returned offset rather than counting visible results, and ignore stale pagination cleanup after changing searches. Build passed.

- Profile Discover People — Removed the opaque shelf background and border from the carousel, including the dark theme card override. Build passed.

- Discover People avatar alignment — Size the portrait inside its badge wrapper so it stays centered in the ring. Inset the badge at the lower-right edge of the portrait. Live iPad verification remains open.

- Discover People mobile card follow-up — Removed the light and dark mobile overrides that still forced an opaque carousel background. Production build passed. Windowed iPad navigation positioning remains unverified.

- Discover People mobile photo centering — Anchor the image and badge wrapper to equal insets inside the gradient ring, independent of media dimensions. Live iPad verification remains open.

- Discover People mobile badge — Moved the checkmark from inside the photo to overlap the lower-right ring. The ring and its inset no longer clip the badge.

- Profile Playlists — Removed the outer carousel background and border in light and dark themes.

- Message reaction persistence — Store selections in the existing reactions field, verify the saved record, and apply the confirmed result to the open chat. Reloads normalize saved and legacy reactions. Production build passed. Live two-account verification remains open.

- Message reaction write follow-up — Switched to the scoped partial update used by message read receipts and re-read the saved value. Concurrent changes retry against the latest record. Live persistence remains unverified.

- Message reaction crash — The request parser omitted emoji, so the handler threw before saving. Read emoji from the request payload. Exercised add, second participant, removal, and invalid requests against the real handler with a stubbed database.

- Message reaction feedback — Distinguish your reaction, group matching emoji with a count, and show when a selection is saving. Production build passed.

- Messages — Removed the three-dot buttons beneath messages. Touch hold, right-click, and keyboard context-menu access remain available.

- Message reaction placement — Removed the circular chip and placed emoji at the top corner of each message.

- Message reaction placement follow-up — Matched the Notes style with an unframed emoji overlapping the upper-left corner on both sides of the chat.

- Messages drafts — Preserve unsent text separately for each conversation while Messages is open. A confirmed send clears only the matching draft, even after switching chats. Build passed.

- Messages photo and video attachments — Added local previews, private uploads, and temporary attachment links after conversation access is checked. Build and backend syntax checks passed. Live sending and playback remain unverified.

- Messages composer — Combined music, GIF, and photo or video attachments under one plus button.
