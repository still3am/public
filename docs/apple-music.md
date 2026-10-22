# Apple Music / MusicKit setup

Deezer, JioSaavn, iTunes lookup and Internet Archive discovery/import additions have been removed. Public's ordinary search, uploads, duplicate checks and approvals are restored.

The Search page now has a MusicKit section. It loads only Apple's hosted MusicKit v3 after Public has a valid developer JWT. Until then, it clearly shows that Apple Music is not available yet. Each listener authorizes their own Apple Music account and needs their own eligible subscription for full-song playback. The developer's account/subscription is not shared.

## Activation required

In Apple Developer, create a Media ID for Public with MusicKit enabled, then a Media Services key associated with that ID. This is separate from the App Store Connect API key. Keep the .p8 signing key outside this repository and outside frontend code.

Use scripts/create-apple-music-token.mjs in a trusted environment with the Media Services .p8 path, Apple Team ID, Key ID and Public's exact HTTPS origins. The script creates an ES256 developer JWT, restricts its origin, and writes only the signed public developer token to public/apple-music-config.json. Default expiry is 30 days; renew before expiry. Supply additional deployed/preview origins explicitly if needed.

Example:
node scripts/create-apple-music-token.mjs --key-file /secure/AuthKey_MUSICKIT.p8 --team-id TEAMID1234 --key-id KEYID12345 --origins https://publicnet.base44.app --days 30

Do not store the .p8 key or Apple Music user tokens in git. Apple's SDK owns user authorization; this app does not send user tokens to Base44, share them among Public users, or copy Apple audio into Public storage.

Signing can also be automated on a separate secure server. The current static developer-token delivery does not invoke a Base44 function, avoiding the app's known exhausted integration-credit gate for MusicKit startup. It requires scheduled developer-token renewal rather than a permanently valid token.

## Behavior and limits

Users can search Apple's catalog, connect/disconnect their own subscription and play/pause supported songs through Apple's SDK. Search obeys Public's explicit-content preferences. Starting MusicKit pauses Public playback; starting Public playback pauses MusicKit. Leaving the Search section or switching Public accounts stops MusicKit and removes its authorization in this initial integration.

Apple playback uses its own streaming and entitlement checks. Public's PURE/equalizer/offline/upload features do not apply to Apple's protected audio. Subscription, regional catalog availability, browser DRM and the app wrapper still require live verification.

## Validation

Token tests use temporary generated test keys, never real credentials. Tests cover ES256 signatures, origin/expiry validation, explicit filtering, metadata restrictions and MusicKit call contracts. Production typecheck, lint, full tests and build must pass. Actual Apple sign-in, subscription entitlement and playback cannot be verified until Public's real MusicKit credentials are configured. The blank default config is intentional; it is not a working Apple account connection.
