# Horizon Drive

**Play the game:** <https://nikunjsingh93.github.io/horizon-drive-threejs/>

A quiet browser driving game built with Three.js and TypeScript. It uses original procedural scenery, a hand-built vehicle, generated road and terrain, Web Audio, and one CC0 tire-squeal recording. It is an independent interpretation of the Slow Roads experience; it does not use Slow Roads code or assets.

The tire-squeal recording in `public/audio/tire-squeal-cc0.mp3` is [“Screeching Tires #1” by Dorian Clair](https://bigsoundbank.com/crissement-de-pneus-1-s2368.html), published under CC0. It is played as a short, non-looping effect when the tires lose grip.

## Try the running preview

The local preview is at <http://127.0.0.1:5173/>. It is currently running in the Codex browser tab. To start it later, double-click `Open-Horizon.cmd`. That serves the already-built game on your machine; keep the terminal window open while playing.

To develop the game, install Node.js 20 or newer, run `npm install`, then `npm run dev` and open the address Vite prints. Use `npm run build` to create a production build and `npm test` to run the driving model checks.

## Play on a phone with GitHub Pages

In the GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Push the `main` branch; the Pages workflow installs dependencies, builds the game with the repository URL prefix, and publishes it. Open <https://nikunjsingh93.github.io/horizon-drive-threejs/> in a phone browser after the workflow succeeds. The on-screen buttons provide touch controls. GitHub Pages is public, so anyone with the link can play.

To install it as an app, open that URL in **Chrome on Android** and choose **Install** from the browser menu. On **iPhone**, open it in **Safari**, tap **Share**, then **Add to Home Screen** and enable **Open as Web App** if shown. The installed app requests fullscreen launch where supported; browser and operating-system controls may still appear on some devices. In a regular browser tab, use **Settings → Enter fullscreen**. Launch the installed icon once while online to cache the game for later offline play. Updates are fetched when you reopen the app while online.

## Controls

- **W / Up:** accelerate
- **S / Down:** brake, then reverse
- **A / D or Left / Right:** steer
- **Space:** handbrake
- **F:** toggle autodrive
- **C:** cycle chase, driver-seat, and bonnet cameras
- **Mouse drag:** look around briefly; the camera eases back after a short pause
- **R:** reset to the road
- **M:** mute or unmute sound
- **Esc:** pause

Gamepad input uses the left stick and triggers. A connected controller was not available for a physical hardware check. On touch screens, use the on-screen steering and pedal controls.

The bottom controls open the world, atmosphere, vehicle, camera, sound, and graphics panels. World settings include a reproducible seed and road character. Sound and graphics preferences persist in this browser.

Graphics has **Ultra**, **High**, **Medium**, and **Low** presets. Low reduces render resolution, terrain range and detail, vegetation, and shadows for slower mobile hardware. New touch devices start on Low; existing saved preferences remain in effect until changed in Settings. Drag directly on the road view to look around; touch controls remain available for driving.

## What is included

The default world is a seeded highland road with rolling terrain, streamed world chunks, fuller conifer boughs, crossed leaf canopies with visible branching and birch bark, ferns, meadow flowers, shrubs, roadside rails, and stone walls. Roadside trees now form denser rows on both verges. It includes an angular silver coupe with an open modeled cockpit, three camera views, local settings, and procedural motor, wind, tire, and sliding-tire audio. Driving runs on a fixed-step simulation with softened, speed-limited steering and automatic cruise. The handbrake reduces rear grip so the vehicle can yaw while momentum carries it forward. Arrow keys and A/D use the same screen-direction steering convention.

## Verification and limits

On 22 September 2026, a continuous 10-minute autodrive session at 1920 × 1080 reached about 12.9 km without leaving the road or crashing. Later visual changes left the driving simulation unchanged. A 6 minute 45 second simulated drive stayed on the road with 11 resident chunks and no browser errors. An earlier actively visible build sampled around 120 FPS (8.3 ms average, 8.4–8.5 ms p95), before the final increase in vegetation density. The latest in-app timing sample was background-throttled at over one second per frame and cannot establish active-play performance for the current visuals. Perfectly steady frame pacing is not established.

Earlier simulation checks covered five 10-minute combinations of seeds and road styles, steering direction, body pitch and roll signs, and handbrake slip and recovery. The latest production build compiles. Manual browser review covered the denser trees, coupe profile, and driver view. During autodrive in the driver view, the car reached about 3.2 m/s while the seat camera remained steady. The browser was background-throttled, so those readings do not establish an active-play frame rate. Gamepad hardware, exhaustive manual steering/braking, and long-run drives on every generated seed remain unverified.

This is a playable prototype and a visual approximation, not a 1:1 recreation. It currently has one highland landscape and one car. Its terrain, tree detail, cockpit, lighting, and vehicle finish remain simpler than Slow Roads. Handling is still an independent approximation; no instrumented physics comparison was available.
