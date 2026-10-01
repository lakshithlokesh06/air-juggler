# Air Juggler

A webcam-controlled browser game using JavaScript and TensorFlow.js. Keep one ball in the air by meeting it from below with your tracked index fingertip. Each successful bounce adds one point; misses cost a life in Easy, Normal, and Hard. The timed challenge gives you 60 seconds with unlimited attempts.

## Features

- Responsive portfolio-style interface, live mirrored camera preview, and canvas overlay
- Real-time one-hand tracking with 21 landmark dots and an index-fingertip ring
- Gravity, upward bounces, smooth animation, and simple side/top boundaries
- Easy, Normal, Hard, and a 60-second challenge with separate best scores
- Mode selection before starting, with keyboard-accessible radio cards
- Mode-specific lives, recovery, and a fresh countdown between attempts
- Slow-motion and wider-touch rewards, with duration/frequency balanced per mode
- Three-second countdown and six progressive difficulty levels (every five points)
- Pause/Resume, automatic pause when switching tabs, and P keyboard shortcut
- Optional synthesized bounce, countdown, launch, level-up, life-loss, and game-over sounds
- Sound on/off control (muted by default), score highlights, level-up notices, and compact controls/help
- Subtle bounce feedback and an in-stage final score, level, and personal-best summary
- One point per valid bounce, final score, and locally saved personal best
- Start, Restart, Stop, Pause/Resume, loading, no-hand, error, and game-over states
- Camera and detector cleanup, keyboard-accessible controls, reduced-motion styling

## Play locally

No build step or package installation is required. From the project directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Alternatively, with Node.js installed, run `npx serve . -l 8000` (downloads `serve` if necessary). Open **http://localhost:8000**. Stop the server with `Ctrl+C`.

1. Choose a mode, select **Start**, allow camera access, and wait for the model to load.
2. Raise your index fingertip inside the frame and hold it through the 3–2–1 countdown. The ball starts above its horizontal position.
3. Meet the falling ball from below with the fingertip ring to bounce it upward.
4. A ball falling completely below the play area costs one life in the standard modes; timed mode records a miss. After a short reset, hold your fingertip in frame for a new countdown. When you run out of lives or time, press **Restart** for a new round in the same mode. **Stop** returns to mode selection.
5. **Stop** ends the session and releases the camera. Restart during play resets the round while keeping the camera/model ready.

The round waits for a visible fingertip before starting its 3-second countdown. Losing the hand before launch resets the countdown. Losing hand tracking during a round does **not** pause gravity. Use **Pause / Resume** or **P** to freeze and continue the round, including the countdown. Switching tabs automatically pauses; returning does not automatically resume. Camera access remains active while paused; use Stop to release it.

Camera access requires **localhost or HTTPS**, a webcam, and browser permission. JavaScript modules require a local HTTP server; do not open `index.html` directly. A plain HTTP LAN address is not sufficient for camera access on another device.

## Tech stack

- Semantic HTML5, responsive CSS, native JavaScript modules
- MediaDevices API and Canvas 2D
- TensorFlow.js **4.22.0**, WebGL backend
- `@tensorflow-models/hand-pose-detection` **2.0.1**, MediaPipeHands **lite**, TensorFlow.js runtime, `maxHands: 1`
- Google Fonts: DM Sans and Space Grotesk, with system fallbacks

Pinned libraries download from jsDelivr after camera startup, followed by model assets from the default TensorFlow model host. Internet access and WebGL are required. Video frames and landmarks are processed locally, never recorded or uploaded. High scores use separate `air-juggler.high-score.<mode>` localStorage keys. The legacy `air-juggler.high-score` is read only as a Normal-mode fallback. Blocked storage uses separate in-memory session bests and does not prevent play.

## Structure

```text
index.html                  Semantic UI and controls
css/styles.css              Visual styling and responsive layouts
js/main.js                  Camera/tracker/game orchestration
js/camera.js                Stream ownership and camera errors
js/tracking.js              Model loading and sequential inference
js/overlay.js               Mirrored coordinates and canvas rendering
js/audio.js                 Lazy Web Audio synthesis and voice cleanup
js/feedback.js              One-shot sound and visual event coordination
js/power-ups.js             Reward milestones, active timers, and effect modifiers
js/modes.js                 Central mode settings and descriptions
js/physics.js               Pure ball motion, contacts, and round state
js/game-loop.js             Animation timing and fingertip freshness
js/ui.js                    DOM status and score rendering
js/score.js                 Score formatting and defensive persistence
tests/audio.test.mjs         Audio fallback, mute races, and event deduplication
tests/power-ups.test.mjs     Rewards, expiry, non-stacking, and collision modifiers
tests/modes.test.mjs         Mode balance, timer lifecycle, and isolated score storage
tests/physics.test.mjs       Physics and game-loop regression tests
tests/tracking.test.mjs      Mapping and tracking lifecycle tests
tests/model-smoke.html       Real model download/inference check
tests/gameplay-smoke.html    Synthetic-hand browser gameplay check
```

## Gameplay implementation

Physics uses a 600-unit-high arena; its width follows the visible canvas aspect ratio. Rendering scales to CSS size and device pixel density. Camera landmarks are mirrored exactly once and use the same centered `object-fit: cover` crop as the video. Cropped-out fingertips cannot hit the ball.

A separate animation loop keeps the ball moving between inference results. Physics integrates elapsed time in steps no larger than 1/120 second and caps catch-up to 50 ms per frame. Gravity accelerates the ball downward. Contact is valid only while descending with the fingertip at or below the ball center. A successful hit applies a level-dependent upward velocity and a small horizontal response based on contact offset. Side/top boundaries keep the ball in play; the bottom is open. A miss removes exactly one life and clears active boosts. Score, difficulty, and the next boost milestone persist; after a one-second recovery, the next attempt requires a fresh three-second countdown. Standard-mode game-over occurs when lives reach zero; timed-mode game-over occurs when its clock reaches zero.

A contact latch requires separation before another hit, and a 200 ms cooldown rejects rapid duplicate scores. Samples older than 250 ms are discarded. Restart restores the selected mode’s lives and clock and clears ball motion, score, contacts, timing, hand samples, and power-up milestones. Game-over freezes the round and leaves the camera available for Restart; Stop disposes it and the tracker.

Difficulty increases every five points through level 6: gravity rises by 12% of its base value per level. Bounce speed scales with the square root of that factor, maintaining a similar bounce height with a shorter reaction window. Levels are capped at score 25. A brief ball highlight and expanding ring acknowledge valid hits; reduced-motion preferences disable the ring.

Pause freezes simulation and the countdown, keeping score and motion intact. Resume discards stale hand samples and resets the frame clock. If the hand is missing when a paused countdown resumes, the countdown resets until it is visible again.

## Challenge modes

| Mode | Lives | Base gravity | Boost frequency | Boost duration | Time limit |
| --- | --- | --- | --- | --- | --- |
| Easy | 5 | 80% | Every 6 points | 8 seconds | None |
| Normal | 3 | 100% | Every 8 points | 6 seconds | None |
| Hard | 2 | 125% | Every 12 points | 4 seconds | None |
| 60-second challenge | Unlimited | 100% | Every 8 points | 4 seconds | 60 seconds |

Launch speed and horizontal response scale with the square root of the gravity factor, preserving a similar bounce height while changing reaction time. All modes retain the six-level progression cap. Mode choice is locked during a session; Stop releases the camera and returns to the chooser. Restart keeps the selected mode. Each mode has an independent personal best displayed on its selection card and during play.

The challenge clock begins when the ball first launches, excluding camera/model loading and the initial countdown. It then counts real elapsed time through slow motion, missing-hand states, recovery, and later countdowns. Pause and background-tab auto-pause freeze it. At zero, scoring stops immediately and the final panel explains that time expired. A slow rendering frame cannot extend the challenge by using the physics catch-up cap. The timer remains readable without a screen-reader announcement every frame.

## Lives and power-ups

Easy starts with five lives, Normal with three, and Hard with two. Timed mode has unlimited attempts. The scoreboard announces remaining lives; the recovery panel explains a miss. Pause freezes recovery, countdown, physics, and boost duration. Stop clears active boosts and releases the webcam. Restart resets the entire round, while personal best remains saved.

Boosts activate automatically at mode-specific score milestones (every eight points in Normal), alternating:

- **Slow motion:** runs ball physics at 65% speed for the mode’s boost duration.
- **Wide touch:** doubles the fingertip collision radius from 15 to 30 arena units for the mode’s boost duration. The visible ring matches that collision area.

The compact status strip shows the effect name, seconds remaining, and paused state; when inactive it shows the next milestone. Screen readers announce effect changes without hearing a timer update every frame. No pickups obscure the video. Effects never stack or refresh; an already-active boost consumes/skips that milestone. Boost timers use the bounded active-frame time, not slowed simulation time. They stop during pause, recovery, and countdown, and clear on a miss, Stop, or Restart. Expiry restores normal speed/reach without resetting velocity or score.

Difficulty remains capped at six levels, increasing every five points. Life resets preserve that level and offer setup time rather than increasing difficulty further. Boosts provide occasional relief without permanent stat changes.

## Sound and feedback

Sound is **off by default on every page load**. Select **Sound off** to enable effects; select **Sound on** to mute immediately. All cues are synthesized with short sine tones at a modest fixed gain. There are no sound files, network requests, or music. An accented cue marks the end of the countdown. At a level boundary, the level-up chime replaces the ordinary bounce sound to avoid clutter.

The AudioContext is created/resumed only from user interaction. Unsupported, suspended, or blocked audio never blocks play; cues are skipped rather than replayed later. Pause, Stop, tab hiding, and restart silence pending tones. Mute stops active and scheduled voices. Every oscillator has a short envelope and is disconnected after finishing. Audio preferences are session-only.

Scoring briefly highlights the score; level changes display a readable notice and a persistent level indicator. Reduced-motion mode removes score scaling and expanding bounce rings while preserving text and color feedback. Native buttons and the expandable **Controls & quick help** panel work with the keyboard; the sound toggle exposes its state and status text to assistive technology.

## Validation

With a current Node.js version:

```sh
node --test tests/*.test.mjs
```

Automated tests cover gravity at different frame rates, scoring, duplicate-contact prevention, rearming, invalid hits, game-over, reset, frame caps, resizing, loop cancellation, stale tracking, mirrored crop mapping, asynchronous camera/model cleanup, difficulty boundaries, countdown timing, pause/resume, lazy audio initialization, blocked-audio fallback, mute during resume, voice cleanup, one-shot event deduplication, three-life depletion, recovery, reward thresholds, boost expiration/non-stacking, widened collisions, mode-specific settings, independent best scores, legacy-score fallback, and challenge timing/expiry.

With the local server running:

- `/tests/model-smoke.html` downloads the real model, runs blank-frame inference on WebGL, and reports PASS/FAIL without camera permission.
- `/tests/gameplay-smoke.html` uses a synthetic fingertip with the production UI, game loop, and renderer. Select **Start** and verify 3–2–1, Pause/Resume, scoring, and level changes. **Remove test hand** should cost one life; **Restore test hand** permits the next countdown. **Drop test ball** forces a miss during play to verify the selected mode’s life limit; in timed mode, verify the clock keeps running after a miss and ends at zero; **Restart** resets; **Stop** clears the canvas. Test scores are not saved. Enable sound to check countdown/bounce/level/game-over cues, mute during play, and expand the controls/help panel.
- In the main app, test camera allow/deny, Stop during loading, left/right marker alignment, losing a hand, game-over, Restart, Stop, and mobile resizing.

## Limitations and next steps

Live tracking accuracy and frame rate depend on lighting, occlusion, camera latency, and GPU performance. A fast hand movement can be missed between detections; slow inference exceeding the freshness threshold can temporarily remove the control point. Extremely slow rendering intentionally slows simulation rather than allowing a large physics jump. The lite model favors speed, and WebGL is required with no CPU fallback.

Only one hand and one ball are supported. One ball remains in play at a time; multiplayer is not included. Boosts are automatic milestone rewards, not collectible objects. Mode balance and boost durations need physical-hand playtesting across devices. Best scores are local to this browser/profile, not an online leaderboard, and cannot persist if storage is blocked. Audible quality and loudness need listening checks on target devices; browser/OS audio restrictions can still silence effects. Future work can tune tracking stability and collision feel using physical webcam testing across devices.

Tip: Normal mode is recommended for first-time players.
Tip: Use Easy mode to get familiar with hand tracking before trying Hard mode.

Audio reference: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

Reference: [TensorFlow hand-pose detection documentation](https://github.com/tensorflow/tfjs-models/blob/master/hand-pose-detection/src/tfjs/README.md).
