# Air Juggler

A webcam-controlled browser game using JavaScript and TensorFlow.js. Keep one ball in the air by meeting it from below with your tracked index fingertip. Each successful bounce adds one point; missing the ball ends the round.

## Features

- Responsive portfolio-style interface, live mirrored camera preview, and canvas overlay
- Real-time one-hand tracking with 21 landmark dots and an index-fingertip ring
- Gravity, upward bounces, smooth animation, and simple side/top boundaries
- Three-second countdown and six progressive difficulty levels (every five points)
- Pause/Resume, automatic pause when switching tabs, and P keyboard shortcut
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

1. Select **Start**, allow camera access, and wait for the model to load.
2. Raise your index fingertip inside the frame and hold it through the 3–2–1 countdown. The ball starts above its horizontal position.
3. Meet the falling ball from below with the fingertip ring to bounce it upward.
4. If the ball falls completely below the play area, press **Restart** for a new round.
5. **Stop** ends the session and releases the camera. Restart during play resets the round while keeping the camera/model ready.

The round waits for a visible fingertip before starting its 3-second countdown. Losing the hand before launch resets the countdown. Losing hand tracking during a round does **not** pause gravity. Use **Pause / Resume** or **P** to freeze and continue the round, including the countdown. Switching tabs automatically pauses; returning does not automatically resume. Camera access remains active while paused; use Stop to release it.

Camera access requires **localhost or HTTPS**, a webcam, and browser permission. JavaScript modules require a local HTTP server; do not open `index.html` directly. A plain HTTP LAN address is not sufficient for camera access on another device.

## Tech stack

- Semantic HTML5, responsive CSS, native JavaScript modules
- MediaDevices API and Canvas 2D
- TensorFlow.js **4.22.0**, WebGL backend
- `@tensorflow-models/hand-pose-detection` **2.0.1**, MediaPipeHands **lite**, TensorFlow.js runtime, `maxHands: 1`
- Google Fonts: DM Sans and Space Grotesk, with system fallbacks

Pinned libraries download from jsDelivr after camera startup, followed by model assets from the default TensorFlow model host. Internet access and WebGL are required. Video frames and landmarks are processed locally, never recorded or uploaded. High scores use `air-juggler.high-score` in localStorage; blocked storage does not prevent play.

## Structure

```text
index.html                  Semantic UI and controls
css/styles.css              Visual styling and responsive layouts
js/main.js                  Camera/tracker/game orchestration
js/camera.js                Stream ownership and camera errors
js/tracking.js              Model loading and sequential inference
js/overlay.js               Mirrored coordinates and canvas rendering
js/physics.js               Pure ball motion, contacts, and round state
js/game-loop.js             Animation timing and fingertip freshness
js/ui.js                    DOM status and score rendering
js/score.js                 Score formatting and defensive persistence
tests/physics.test.mjs       Physics and game-loop regression tests
tests/tracking.test.mjs      Mapping and tracking lifecycle tests
tests/model-smoke.html       Real model download/inference check
tests/gameplay-smoke.html    Synthetic-hand browser gameplay check
```

## Gameplay implementation

Physics uses a 600-unit-high arena; its width follows the visible canvas aspect ratio. Rendering scales to CSS size and device pixel density. Camera landmarks are mirrored exactly once and use the same centered `object-fit: cover` crop as the video. Cropped-out fingertips cannot hit the ball.

A separate animation loop keeps the ball moving between inference results. Physics integrates elapsed time in steps no larger than 1/120 second and caps catch-up to 50 ms per frame. Gravity accelerates the ball downward. Contact is valid only while descending with the fingertip at or below the ball center. A successful hit applies a level-dependent upward velocity and a small horizontal response based on contact offset. Side/top boundaries keep the ball in play; the bottom is open.

A contact latch requires separation before another hit, and a 200 ms cooldown rejects rapid duplicate scores. Samples older than 250 ms are discarded. Restart clears ball motion, score, contacts, timing, and hand samples. Game-over freezes the round and leaves the camera available for Restart; Stop disposes it and the tracker.

Difficulty increases every five points through level 6: gravity rises by 12% of its base value per level. Bounce speed scales with the square root of that factor, maintaining a similar bounce height with a shorter reaction window. Levels are capped at score 25. A brief ball highlight and expanding ring acknowledge valid hits; reduced-motion preferences disable the ring.

Pause freezes simulation and the countdown, keeping score and motion intact. Resume discards stale hand samples and resets the frame clock. If the hand is missing when a paused countdown resumes, the countdown resets until it is visible again.

## Validation

With a current Node.js version:

```sh
node --test tests/*.test.mjs
```

Automated tests cover gravity at different frame rates, scoring, duplicate-contact prevention, rearming, invalid hits, game-over, reset, frame caps, resizing, loop cancellation, stale tracking, mirrored crop mapping, asynchronous camera/model cleanup, difficulty boundaries, countdown timing, and pause/resume.

With the local server running:

- `/tests/model-smoke.html` downloads the real model, runs blank-frame inference on WebGL, and reports PASS/FAIL without camera permission.
- `/tests/gameplay-smoke.html` uses a synthetic fingertip with the production UI, game loop, and renderer. Select **Start** and verify 3–2–1, Pause/Resume, scoring, and level changes. **Remove test hand** should lead to game-over; **Restart** resets; **Stop** clears the canvas. Test scores are not saved.
- In the main app, test camera allow/deny, Stop during loading, left/right marker alignment, losing a hand, game-over, Restart, Stop, and mobile resizing.

## Limitations and next steps

Live tracking accuracy and frame rate depend on lighting, occlusion, camera latency, and GPU performance. A fast hand movement can be missed between detections; slow inference exceeding the freshness threshold can temporarily remove the control point. Extremely slow rendering intentionally slows simulation rather than allowing a large physics jump. The lite model favors speed, and WebGL is required with no CPU fallback.

Only one hand and one ball are supported. Sound, power-ups, and multiplayer are not included. Future work can tune tracking stability and collision feel using physical webcam testing across devices.

Reference: [TensorFlow hand-pose detection documentation](https://github.com/tensorflow/tfjs-models/blob/master/hand-pose-detection/src/tfjs/README.md).
