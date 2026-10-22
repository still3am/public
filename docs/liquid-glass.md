# Optional Liquid Glass appearance

Settings → Listening & appearance → Liquid Glass. Off by default. Saved on the signed-in User record, shared across devices; never mirrored onto public profiles. Native own-account boolean writes are re-read and confirmed, with existing account/suspension checks.

Uses [simple-liquid-glass](https://github.com/lucaperullo/simple-liquid-glass), pinned to 5.4.0 (MIT, React 18 compatible). License is preserved at public/licenses/simple-liquid-glass.txt. No external API/key or integration service is used. Only the open settings panel loads the lazy optics component; other selected UI surfaces use CSS backdrop filtering. Geometry and navigation behavior are unchanged.

Browsers with no backdrop filtering retain solid controls. Mobile defaults to a CSS glass treatment; the settings optics can use the paused, visible profile gradient as an explicit refraction source where supported. Missing sources and rendering errors retain CSS glass. Reduced transparency, increased contrast and forced colors use opaque surfaces; reduced motion disables the optics overlay. Content is never cloned into the interactive/accessibility tree; the library layer is decorative and pointer-transparent.

Validation: account preference route covers enable/disable, invalid values, silently ignored writes and account switches. Typecheck/build plus existing settings/account tests. Verify on actual iPhone/Safari and desktop before claiming browser optics parity.
