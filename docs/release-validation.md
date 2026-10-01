# Release validation

Checked 2026-10-01. Gameplay balance is unchanged: physics constants, mode settings, lives, reward thresholds/durations, difficulty, and scoring rules were not edited.

## Automated checks

- `node --test tests/*.test.mjs`: **52 passed, 0 failed**.
- Coverage includes all four modes, scoring/contact debounce, frame-rate consistency, lives, countdown/recovery, replay, timed expiry, pause, power-ups, best-score isolation, storage fallback, audio lifecycle, camera/model races, coordinate mapping, and stale hand samples.
- Added coverage for inference rate limiting, duplicate video-frame skipping, suspended inference results, camera error classification, deduplicated UI updates, all-mode replay, and release markup.
- All production JavaScript passed `node --check`; `git diff --check` passed.

## Browser checks

Used the Codex in-app Chromium browser and the local HTTP server.

- Main UI loaded; desktop 1280px, tablet 768px, and mobile 390px/320px layouts checked for horizontal overflow.
- Found and fixed mobile stage clipping caused by the minimum height/aspect ratio interaction. Stage width now fits the card and its guidance wraps visibly.
- Skip navigation moves focus to the game workspace. Mode radios and controls have accessible names; the P shortcut can be disabled and its ARIA shortcut metadata is removed.
- Synthetic-hand harness: countdown, scoring through level 6, pause/resume, disabled P shortcut, and no-hand feedback verified with production game/rendering modules.
- Setup preview controls exercised camera loading, model loading, permission-denied, no-camera, and generic-error UI with their retry/cancel controls.
- Restart followed by Stop reset the score to 00 and restored the mode chooser.
- Real-model smoke test passed: pinned model loaded and blank-frame inference returned no hands on WebGL.
- No console errors in the main page or synthetic gameplay harness during checks.
- Reduced-motion CSS and canvas behavior reviewed: decorative animation, score scaling and expanding bounce rings are suppressed; essential ball movement remains.
- Screenshots are real UI captures without webcam images.

## Remaining manual validation

- Physical webcam permissions, revocation/disconnection, fingertip alignment and sustained tracking in varied lighting.
- Actual phones/tablets, orientation changes, thermal behavior, and long-session performance.
- Cross-browser testing in Chrome, Edge, Firefox and Safari; viewport checks alone do not certify those browsers/devices.
- Screen-reader announcement quality, high zoom/contrast, and OS reduced-motion preferences with assistive technology.
- Audio loudness and quality through speakers/headphones. Audio behavior is covered by automated tests, not a listening assessment.

The synthetic harness does not access a camera or save test scores. Playing still requires a visible hand. No WCAG conformance or hardware FPS improvement is claimed. Nothing was committed or pushed.
