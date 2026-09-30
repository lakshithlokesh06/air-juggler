# Air Juggler

A webcam-controlled browser game built with JavaScript, with TensorFlow.js hand tracking planned. The idea: use your hands to keep a virtual ball in the air and beat your personal best.

This initial foundation provides a responsive, portfolio-ready interface and a real webcam preview. **Hand tracking, ball physics, scoring, and gameplay are not implemented yet.**

## Current features

- Responsive play space, scoreboard, setup tips, and modern visual styling
- Start/stop camera and restart preview controls
- Idle, permission/loading, live preview, and actionable error states
- Mirrored video preview; audio is never requested
- Webcam cleanup when stopping or leaving the page
- Keyboard-accessible controls, visible focus states, live status messages, and reduced-motion support
- Defensive loading of a future locally saved high score; current score remains zero
- Reserved canvas for the future game renderer

Restart resets the displayed score and reconnects the camera. It does not start a game. The camera feed remains in the browser; this app does not record or upload it.

## Tech stack

- Semantic HTML5
- Responsive CSS with Grid and Flexbox
- Vanilla JavaScript with native ES modules
- Browser MediaDevices API for webcam access
- Google Fonts (DM Sans and Space Grotesk), with local sans-serif fallbacks
- **Planned:** TensorFlow.js and a hand landmark model

TensorFlow.js is intentionally not downloaded or initialized in this foundation. Select and pin the library and model versions when implementing tracking.

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
│   ├── ui.js           # DOM rendering and state copy
│   └── score.js        # Safe high-score reading and score formatting
├── .gitignore
└── README.md
```

## Planned features

1. Integrate TensorFlow.js hand landmark detection.
2. Map hand positions to the mirrored game coordinate system.
3. Add canvas rendering, ball physics, and hand-to-ball collisions.
4. Add rounds, scoring, game-over states, and high-score persistence.
5. Add model-loading feedback, tracking confidence, and performance tuning.

Keep inference, physics, and rendering in separate modules. The camera module should continue to own media streams, and UI rendering should remain separate from game logic. The unused canvas is hidden until the renderer is implemented. High scores currently read the `air-juggler.high-score` localStorage key but are not written until gameplay exists.

## Manual verification

- Start and allow the camera: verify a mirrored preview and active Restart control.
- Stop: verify the webcam indicator turns off and the idle state returns.
- Restart: verify the preview reconnects and score stays at zero.
- Deny permission: verify a helpful error and working Try again control.
- Test with a disconnected or unavailable webcam.
- Navigate away: verify the camera is released.
- Resize to mobile width and navigate controls with the keyboard.

Google Fonts is the only external page resource. If unavailable, system font fallbacks are used. No analytics, model requests, or camera uploads are included.
