# PUBLIC feature upgrades and audit — October 21, 2026

## Delivered

1. Home: Continue Listening moved above the spotlight; followed-artist release feed; account-owned recommendation hiding with persistence, confirmation, undo, retries, and account isolation.
2. Search: fuzzy username matching, better canonical/alias ranking including legacy alias strings, account-scoped recent searches and clearing, five-minute in-memory result reuse, and preserved query/results while the kept-mounted page is hidden behind a song. Existing route scroll restoration is retained.
3. Charts: all-time plus rolling 7/30-day recorded-play charts, prior-period positions, new entries, and rising songs ranked by absolute play growth. Unknown/failed analytics never become fabricated results.
4. Artists: Library view only includes artists credited on the listener's saved songs; Followed view uses ArtistSubscription. Canonical aliases collapse together; accessible saved private tracks are included. Mobile alphabet drag uses immediate scrolling and respects reduced motion.
5. Artist dashboard: 7/30/90-day and all-recorded-history analytics for the authenticated uploader only. Unique signed-in listeners, retained library saves added in the selected range, and completion over measured sessions with at least 90% of known duration. Historical totals remain separately labeled.
6. Suggestions: planned/in-progress/completed filters, admin status management, and deduplicated completion notifications for author/supporters.
7. Support: notifications for signed-in ticket owners; account-based request listing/recovery across devices; guest private receipts retained; owner/token authorization and protected access hashes; automatic reply checks while open. Notification previews exclude private reply content.
8. Password recovery: email retained in tab session storage, clearer expired/used-link recovery, stronger-password feedback, and retry links. Passwords/tokens are not stored by this change.
9. Missing page: existing Home/Search/back links retained; back action only offered for app history entries.
10. Layout: shared control spacing and loading semantics; clearance based on actual player/navigation geometry; editing keyboard protection; reduced-motion handling retained.
11. Recaps: 1080×1350 PNG cards, preview dialog, native file sharing where available, and image-download fallback. Cards include only the displayed music/totals, never account identifiers or listening-session records.

## Audit fixes

- Search no longer consumes another route's query string while its tab remains mounted.
- Offline sync and profile-playlist errors are visible with retry controls.
- Block-list refreshes use native participant-scoped RLS and reject stale responses after account switches.
- Artist analytics and personal directory data do not carry across account changes.
- Account deletion cleans RecommendationDismissal records.
- Explicit-label policy wording matches catalog behavior.
- A brittle whitespace-dependent regression-test extractor was corrected without changing its request-isolation assertions.

## Validation

- Production build: passed (exit 0).
- Type check: passed.
- Lint: passed.
- Regression suites: 62/62 passed.
- Backend security cases include ticket ownership/token validation, administrator-only status/replies, aggregate-only artist metrics, blocked artist filtering, and notification retry deduplication.
- New functional cases cover date boundaries/movement, unique listeners, session deduplication, unknown-duration completion, library-only/followed artists, persistent hides/undo/lost responses, recap image composition, expired-link recovery, and measured content clearance.

## Page inventory

All 32 page components below are included in the application build and route/source review. This is not a claim that each page was exercised in a signed-in browser.

- Admin
- AlbumDetail
- ArtistByName
- ArtistDashboard
- Downloads
- ForgotPassword
- Home
- Library
- Login
- Lounge
- Moments
- MyUploads
- Notifications
- OAuthConsent
- PersonalMix
- PlaylistDetail
- Policies
- Profile
- PublicRecords
- PublicRecordsIndex
- RecapPlaylist
- RecentlyAdded
- Register
- ResetPassword
- Search
- SongTransitions
- Suggestions
- Support
- TopCharts
- TrackDetail
- UnfinishedUploads
- Upload

## Verification limits

The live browser was signed out. Public Home and chart navigation were inspected; the browser was on the published build, so this does not verify unpublished frontend changes. No signed-in iPhone end-to-end test or native iOS share-sheet test was completed. Charts, artist analytics, support operations, and suggestion status/notifications require functioning Base44 backend service/credits. Completion measurements depend on recorded sessions with known duration; missing historical data is shown as unavailable rather than estimated. The changes have not been explicitly published from the builder.
