# Air Juggler

A webcam-controlled browser game built with JavaScript, with TensorFlow.js hand tracking. The idea: use your hands to keep a virtual ball in the air and beat your personal best.

This build provides a responsive interface, live webcam preview, and real-time tracking of one hand. All 21 landmarks are displayed, with a bright ring marking the index fingertip. **Ball physics, scoring, and gameplay are not implemented yet.**

## Current features

- Responsive play space, scoreboard, setup tips, and modern visual styling
- Start/stop camera and restart preview controls
- Camera permission, model loading, tracker ready, no-hand, hand-tracked, and actionable error states
- One-hand inference with a mirrored, crop-aware fingertip marker
- Mirrored video preview; audio is never requested
- Webcam cleanup when stopping or leaving the page
- Keyboard-accessible controls, visible focus states, live status messages, and reduced-motion support
- Defensive loading of a future locally saved high score; current score remains zero
- Responsive canvas overlay for landmarks and the fingertip marker

Restart resets the displayed score, reconnects the camera, and creates a fresh detector. It does not start a game. The camera feed remains in the browser; this app does not record or upload it.

## Tech stack

- Semantic HTML5
- Responsive CSS with Grid and Flexbox
- Vanilla JavaScript with native ES modules
- Browser MediaDevices API for webcam access
- Google Fonts (DM Sans and Space Grotesk), with local sans-serif fallbacks
- TensorFlow.js **4.22.0** (WebGL backend)
- `@tensorflow-models/hand-pose-detection` **2.0.1**, MediaPipeHands lite model with the **TensorFlow.js runtime**, limited to one hand

Pinned scripts load from jsDelivr after camera startup. The detector downloads its model assets from the default TensorFlow model host. Internet access and WebGL are required; the first startup can take longer while assets download. No separate MediaPipe runtime is used.

## Run locally

No package installation or build step is needed. From this directory, run either:

```sh
# Python 3
python3 -m http.server 8000 --bind 127.0.0.1
```

Or, with Node.js installed:

```sh
npx serve . -l 8000
```

Open **http://localhost:8000**, select **Start camera**, and allow camera access. Stop the server with `Ctrl+C`. The Node command downloads `serve` if it is not already available.

Use a local HTTP server instead of opening `index.html` directly: JavaScript modules need to be served. Camera access requires **localhost or HTTPS**. A plain HTTP LAN address does not qualify; use HTTPS for testing on another device. A physical webcam and browser permission are required for a live preview. If camera access is denied, change the site’s camera permission in the browser and retry.

## Project structure

```text
.
├── index.html          # Semantic page and game shell
├── css/
│   └── styles.css      # Tokens, components, responsive layouts
├── js/
│   ├── main.js         # App state, events, and lifecycle
│   ├── camera.js       # Stream ownership and friendly camera errors
│   ├── tracking.js     # Model loading, inference loop, and detector cleanup
│   ├── overlay.js      # Mirrored cover-crop mapping and landmark rendering
│   ├── ui.js           # DOM rendering and state copy
│   └── score.js        # Safe high-score reading and score formatting
├── tests/
│   ├── tracking.test.mjs # Coordinate and lifecycle regression tests
│   └── model-smoke.html  # Real model download and blank-frame inference check
├── .gitignore
└── README.md
```

## Planned features

1. Add ball physics and hand-to-ball collisions.
2. Add rounds, scoring, game-over states, and high-score persistence.
3. Improve tracking stability and tune performance across devices.

Keep inference, physics, and rendering in separate modules. The camera module should continue to own media streams, and UI rendering should remain separate from game logic. The canvas displays hand landmarks only. High scores currently read the `air-juggler.high-score` localStorage key but are not written until gameplay exists.

## Manual verification

- Start and allow the camera: verify model-loading feedback, then a mirrored preview and active Restart control.
- Raise one hand: verify landmark dots and a bright ring on the index fingertip. Move left/right and resize the window; the marker should follow the mirrored fingertip.
- Remove your hand: verify the no-hand message and cleared overlay.
- Block the CDN/model host or disable WebGL: verify an actionable error and retry control.
- Stop during loading: verify no late preview or landmarks appear.
- Stop: verify the webcam indicator turns off and the idle state returns.
- Restart: verify tracking reconnects and score stays at zero.
- Deny permission: verify a helpful error and working Try again control.
- Test with a disconnected or unavailable webcam.
- Navigate away: verify the camera is released.
- Resize to mobile width and navigate controls with the keyboard.

Google Fonts, jsDelivr libraries, and TensorFlow model downloads are external resources. All frame processing runs locally; camera frames and landmarks are not uploaded or recorded. Font failures fall back to system fonts.

## Tracking details and limitations

Inference runs sequentially through `requestAnimationFrame`, skipping unchanged video frames. Stopping cancels future frames and disposes the detector after any in-flight inference completes. Late model loads and camera permission results are cleaned up. Model loading has a 60-second timeout with a retry path.

The video is mirrored with CSS. Inference uses `flipHorizontal: false`; `overlay.js` mirrors coordinates exactly once and applies the same centered `object-fit: cover` crop as the preview. The overlay adapts to layout changes and device pixel density.

The lite model favors speed. Tracking accuracy and frame rate depend on lighting, occlusion, hand position, and GPU/device performance. Only one hand is tracked; there is no gesture classification or gameplay. WebGL is required; there is no CPU fallback.

Run automated coordinate and lifecycle checks with a current Node.js version:

```sh
node --test tests/*.test.mjs
```

To verify real library/model loading without camera permission, open `http://localhost:8000/tests/model-smoke.html` while the server is running. It runs a blank-frame inference and reports PASS or FAIL.

The Node tests use a stub detector to test lifecycle edge cases. Real webcam accuracy and performance still need manual validation on target devices.

API reference: [TensorFlow hand-pose detection, TFJS runtime](https://github.com/tensorflow/tfjs-models/blob/master/hand-pose-detection/src/tfjs/README.md).
