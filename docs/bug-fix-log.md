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
