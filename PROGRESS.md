# Build and playtest record

## Done

- Inspected and played the current Slow Roads browser edition; recorded observed features and assumptions in [REFERENCE.md](REFERENCE.md).
- Built an original Three.js / TypeScript driving game with a fixed-step simulation, seeded terrain and roads, streamed chunks, one coupe, three views, autodrive, touch/gamepad support, sound, menus, persistent settings, and performance display.
- Tested the model over five 10-minute seed/road-style runs, including fixed-step frame-rate behavior, controls, off-road slowdown, and reset.
- Ran a 10-minute browser autodrive session at 1920 × 1080 before the tree-texture fix: approximately 12.9 km, road maintained, 11 resident terrain chunks, about 8.3 ms average frame time, 8.4 ms sampled p95, and one 133 ms outlier.
- On the corrected visual build, drove for 6 minutes 45 seconds of simulated time: remained on the road, 11 chunks stayed resident, and no browser errors occurred. While actively visible, samples were about 120 FPS with 8.4–8.5 ms p95. Background-tab throttling caused up-to-one-second frame stalls in some readings.
- Rechecked the chase, bonnet, and driver-seat cameras and fixed roof obstruction in the forward views.
- Corrected right/left steering for the +Z camera convention; added symmetric screen-direction regression tests, and reran the five 10-minute autodrive seed/style checks.
- Replaced broadleaf billboard cards with overlapping 3D leaf masses, brought roadside groves closer, smoothed shrub geometry, and added instanced ferns and flower clusters.
- Earlier builds rendered about 1.6M triangles at 1280 × 720. After adding fuller branch geometry, I reduced the spruce mesh cost and added procedural needle/leaf variation plus bark grain. The refined build draws about 2.31M triangles across 349 draw calls at the 358 × 780 in-app viewport. A 60 FPS sample (16.68 ms average, 16.8 ms p95) was captured after the geometry reduction but before the final texture pass. The current browser tab then became background-throttled, so there is no clean frame-rate measurement for the final textured build or at 1080p; browser errors remained at zero.
- Rechecked the live Slow Roads browser at its default Hills setting and compared the road, rear coupe framing, and distant tree silhouettes. Its current changelog also calls out speed-relative steering limits, steering smoothing, and mouse look; this build now eases steering in, limits wheel angle more strongly with speed, caps yaw rate, and supports temporary drag-to-look.
- Dragged the local chase camera to a side view and verified that it eases back to the original view after a pause. Added the behavior to the in-game help.
- Refined the coupe with a metallic finish, cleaner headlight and tail-light shapes, subtle panel gaps, door handles, and wheel hardware.
- Replaced the angular broadleaf silhouettes with three rounded, coherent crowns and surface leaf sprays; left the denser pine boughs intact.
- Corrected the sign of acceleration pitch and cornering roll. Added a low-grip handbrake state with independent travel direction and tire-slide sound. Regression checks cover forward/reverse pitch, left/right roll, slide onset, and grip recovery.
- Cut the painted body shell out of the modeled cockpit, added dashboard, instruments and steering hardware, and moved the driver camera inside the canopy. Checked chase and driver views in the browser at 1280 × 720.
- The latest browser sample draws about 2.40M triangles and 380 calls. It stayed on-road in the short final browser drive with 11 resident chunks and zero console errors; the browser was background-throttled, so that sample is not a useful FPS benchmark.
- Replaced the round broadleaf envelope and pointed leaf cards with crossed, branching alpha-leaf canopies, irregular crown profiles, and occasional pale birch trunks. Increased tree placement and moved the woodland closer to both road edges.
- Reshaped the silver coupe with a longer hood, flatter roof, squared body sections, and a broader front fascia based on the attached classic car image.
- Removed inertial pitch/roll from the driver camera pose and now position it from the vehicle's terrain-aligned frame. The camera stays fixed to the seat as acceleration changes the body lean.
- Rebuilt the production preview and manually inspected the tree line, exterior side view, and cockpit while autodrive was moving. Background throttling limited frame-rate measurement.
- `npm run build` and `npm test` pass.
- Left the local browser preview running at `http://127.0.0.1:5173/`.

## 2026-09-23 off-road, night, and transmission pass

- Expanded terrain streaming from a road corridor to a bounded 2D grid around the car. The car can leave the road at full speed; off-road grip and tire audio still change without an artificial speed penalty.
- Added deterministic off-road groves, grass, shrubs, ponds, water ripples, pond reeds, and bank-aware terrain. Pond placement and terrain are seeded from the world hash.
- Added a moonlit night preset with stars, cloud variation, reduced ambient light, fog, and functional headlight spotlights. `H` toggles headlights; night preset enables them automatically.
- Added Automatic and Manual · auto clutch modes. Manual uses Q/E or the Vehicle panel to select reverse, neutral, and gears 1–6; the HUD shows gear and RPM. Gamepad bumpers shift in manual mode.
- Fixed chase-camera distance so it stays constant at speed instead of moving farther away. Added extra camera/world telemetry for verification.
- Replaced the earlier conifer canopy with smaller, layered needle cards and twig volume while retaining the procedural trunk and seeded placement. Increased 2D ground vegetation density.
- Added deterministic streaming tests covering terrain across multiple kilometres, pond banks, bounded tile counts, and disposal of old world geometry. Simulation tests now also cover unrestricted off-road speed and manual gear behavior.
- Browser checks reached 108 km/h across off-road terrain, verified headlights at night, and showed manual neutral/reverse state. Final browser timing remains background-throttled; no 1080p/60 FPS claim is made.

## Known gaps

- Only the highland environment and one vehicle are implemented.
- Vegetation silhouettes, terrain composition, lighting, materials, road details, and car polish remain visibly simpler than the reference.
- New broadleaf crowns use outward leaf sprays and the spruce uses denser, textured boughs, though these procedural models remain stylized rather than photorealistic.
- Latest active frame timing and 1080p performance remain unverified. The scene is substantially more detailed than earlier builds and needs a full-resolution performance pass.
- The 10-minute endurance measurement predates this turn's drift and body-motion changes. The latest model passed five simulated 10-minute seed/style runs and focused slip tests, but a new continuous 10-minute browser drive is still outstanding.
- Endurance driving used autodrive; it does not verify every manual input across all terrain types.
- No gamepad was connected. Reference steering and acceleration were not instrumented, so the handling is an informed approximation.
- The 133 ms outlier shows an occasional frame hitch despite average and sampled p95 frame times meeting the 60 FPS target.

## Useful next iteration

Prioritize a detailed exterior/interior vehicle pass and richer canopy and terrain shading, then directly compare the result against Slow Roads screenshots at matched viewpoints. Add other reference vehicles and environments only after improving the default highland drive. Retest frame pacing after any visual increase.

The last test left the local app on the default `OPEN-ROAD` / flowing highland setup with autodrive running. Reopen the preview at `http://127.0.0.1:5173/`; source and launch instructions are in this directory.

## 2026-09-23 replacement pass (supersedes earlier coupe/crown/camera claims)

- Rebuilt vehicle from scratch as the supplied compact three-door hatchback, retaining paint preference. Short hood, tall flat roof, upright hatch, rectangular lamps, plastic bumpers, wheel cutouts, hubcaps, enclosed cockpit and instruments. Wheels are now outside the sprung body group.
- Replaced four full-crown crossed planes with 336 small textured foliage patches per tree, distributed through branch volumes. Added matching branching skeletons, narrower birch geometry, darker varied leaf shading, and dense textured shrubs. Existing pine mesh retained.
- Fixed geometry merging that previously discarded indexed triangle connectivity, malformed trunks, mismatched crown/trunk transforms, and birch instance count holes.
- Driver camera is attached to the same cabin transform as the seat, with no world-position lag. Measured cameraSeatError stayed exactly 0 at rest and at 21.38 m/s (77 km/h). Preserved temporary mouse look. Roof remains present in cabin view.
- Compared supplied screenshots and live Slow Roads. Browser checked rear/side exterior and moving interior. Build and simulation regression suite pass, including five simulated 10-minute drives. No browser errors observed in the short check.
- Full-crown panels and spherical shrubs removed. Trees now cast shadows. Corrected cockpit self-shadow artifacts and mirrored instrument texture after screenshot review.
- Current build is still an approximation: bark, foliage variation, interior instruments (static dial faces), terrain and lighting are simpler than Slow Roads. This pass does not establish 1:1 fidelity or a new 10-minute browser endurance result.
- Browser was background-throttled near one update/second in portions of verification. Reported frame times are not valid active performance measurements; 1080p/60 FPS remains unverified for this build.
- Preview remains at http://127.0.0.1:5173/. Next work: active-window frame-time/streaming test, more natural branch curvature/species variation, functioning dashboard needles, terrain understory shading.

## 2026-09-23 brake, wildlife, and road-edge pass

- Added shared rear tail lamps with a bright red brake state. Brake and handbrake input now drive the emissive intensity, so the lamps visibly flare during deceleration and return to dim tail-light glow when released.
- Added deterministic low-poly rabbits and occasional foxes to streamed field tiles. Each animal has a body, head, ears, and tail, uses seeded placement away from the road and ponds, and is disposed with its terrain tile.
- Added irregular dirt shoulder strips and small mud patches beside both road edges. Shoulder width and patch placement vary continuously with the road instead of forming a perfectly straight asphalt boundary.
- `npm run build` and `npm test` pass after the changes. The browser visual smoke check was blocked by the local browser auto-review usage limit, so this pass has no new active-window FPS or screenshot measurement.

## 2026-09-23 rear-light correction

- Night mode now keeps the rear markers visibly illuminated through the same lighting state that enables the headlights.
- Recolored the lower rear marker from amber to red and made brake activation use saturated red material and emissive output, preventing an orange brake appearance.
- `npm run build` and `npm test` pass after the correction.
- Added a separate direct-red brake-lamp overlay so braking is visibly brighter and cannot shift toward orange under tone mapping.

## 2026-09-23 third-person camera drag correction

- Reversed the chase-orbit sign so dragging right moves the camera to the right and dragging left moves it left.
- Increased horizontal orbit range and retained damped return to center after release. Vertical look is now clamped to a shallower, more comfortable GTA-style pitch range.
- `npm run build` and `npm test` pass after the camera change.

## 2026-09-23 countryside grove pass

- Added seeded distant tree clusters in the streamed wilderness tiles. Each grove uses compact spacing, varied scale and color, and low-detail faceted crowns so the horizon reads as wooded countryside without using full near-camera tree meshes everywhere.
- Groves avoid the road corridor and pond interiors, and their instanced geometry is disposed with the field tile.
- `npm run build` and `npm test` pass after the vegetation increase.
- Moved the low-detail grove band beyond roughly 110 m from the road and increased full-detail field tree capacity around the drivable area, so leaving the road no longer exposes low-poly trees nearby.

## 2026-09-23 low-poly removal

- Removed the distant faceted grove meshes entirely at the user's request. The world now uses the existing full-detail procedural tree models for roadside and wilderness trees only.
- Retained the increased full-detail wilderness tree capacity so the countryside remains populated without the low-poly silhouettes.
- `npm run build` and `npm test` pass after removing the LOD grove layer.

## 2026-09-23 touch-driving controls

- Added mobile touch buttons for Handbrake, Gear −, and Gear + alongside the existing steering, brake, and drive controls.
- Gear buttons use the same manual-transmission checks and toast feedback as the keyboard and vehicle-panel controls. Handbrake is held through the existing space-key input path.
- `npm run build` and `npm test` pass after the touch UI update.
- Reorganized the touch controls into a two-column layout: gear down/up above left/right steering, with Drive above the bottom-right Brake button and Handbrake immediately to its left.
- Anchored the touch clusters to the lower corners with compact widths so they no longer stretch toward the center of the screen.
- Touch Gear − / Gear + controls now hide in Automatic transmission and reappear when Manual is selected.

## 2026-09-23 countryside realism pass

- Reduced steering yaw response and max wheel angle so normal turns follow a wider, more relaxed arc.
- Added small seeded road-surface flecks, expanded roadside shrub capacity, and placed larger wildlife closer to the open roadside meadows.
- Reworked animal proportions and added legs, eyes, and noses; added identifiable deer with legs and antlers.
- Added flocks of small dark birds with animated wing flaps and gentle flight paths, tied to streamed road scenery chunks.
- Added warped multi-scale cloud layers with softer edges, varying cloud heights, and subtle sunlit cloud edges. Compared the setting with the current [Slow Roads reference](https://slowroads.io/).
- `npm run build` passes. Reviewed the updated sky and roadside scene in the local browser; no new simulation test suite was run for this visual pass.

## 2026-09-23 animal and steering correction

- Rebuilt the deer from overlapping body, shoulder, neck, head, leg, ear, muzzle, hoof, and antler parts. Corrected the old neck transform that left its head and antlers visibly separated.
- Added part-specific deer colors and removed the dark material tint that multiplied the animal instance colors. Rabbits now have joined rounded ears and lighter fur; foxes have shorter ears and a fuller tail.
- Shortened manual steering radius by increasing the allowed wheel angle and yaw response while keeping the same eased input rate. The estimated steady-turn radius at 10 m/s falls from roughly 30 m to roughly 21 m.
- Production build and the existing driving/streaming checks pass. Refreshed the local browser preview.
