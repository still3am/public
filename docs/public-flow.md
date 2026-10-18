# PUBLIC Flow

PUBLIC Flow is the shared signature motion in MotionGradient: two interwoven, gently turning ribbon fields. It mixes only the three palette colors, with no brightness multiplier, gray scrim or white overlay. The default is black, white and dark gray. Existing custom, weather and artwork palettes continue to work without stored preference changes.

The shared component reaches brand authentication backgrounds, onboarding, profile backgrounds and previews, Home features, Made for You cards and detail pages, full-screen playback and Atmospheres. Content remains outside the canvas so text, artwork and controls do not move or inherit fading. Profile movement controls label the existing `flow` setting as PUBLIC Flow; Still and speed settings remain supported.

Rendering retains the 30fps cap and 1100px resolution bound. It pauses for reduced motion, inactive pages, hidden documents, offscreen surfaces and covered backgrounds when requested. A static palette gradient remains available if WebGL cannot initialize or loses context.

Validation: public-flow lifecycle tests and onboarding rendering tests, ESLint and production build pass. The actual vertex and fragment shaders were also compiled, linked and rendered in a local Mesa OpenGL ES context; distinct-time monochrome and vivid frames were visually inspected. This is a shader render check, not a live authenticated browser review of every page.
