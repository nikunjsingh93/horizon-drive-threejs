# Reference observations — 22 September 2026

Reference: https://slowroads.io/ browser edition 2.4.2, observed at 1280 × 720. No source or assets were extracted.

## Observed directly
- Full-screen scenic countryside, compact bottom navigation and white speed/distance readouts.
- White coupe, low following camera, asphalt grain, continuous edge lines and alternating center markings.
- Rolling grassy hills, many distant wooded layers, close broadleaf trees, dry stone walls and metal guardrails.
- Quiet endless road and automatic driving. Reference autodrive observed at roughly 70–72 km/h across hills, changes in road curvature and road-side scenery.
- World controls expose location, road style, seed and regeneration. Reference changelog describes seasons, interior views, gamepad control and electric motor audio.
- Screenshots captured in the conversation show stationary and moving reference scenes at several road positions.

## Assumptions / not measured
- No reliable instrumented acceleration, braking-distance, traction or suspension data from the reference. Our dynamics are independently tuned approximations.
- Reference control keys differ; the C key did not visibly change its camera during the brief inspection. Our game documents its own bindings.
- No physical controller available yet. Reference audio and controller feel were not measured.
- No claim of exact geometry, shader, physics or feature parity.

## Comparison checklist
- [x] Real 3D scene, continuous seeded roads, hills and streaming environment.
- [x] Asphalt texture, edges/center markings, roadside rails and stone walls.
- [x] Coupe with rotating wheels, steering, body motion and cabin.
- [x] Chase, interior and bonnet camera choices.
- [x] Manual driving, brake/reverse, handbrake, autodrive, pause and reset.
- [x] Functional world seed, road character, season, light, sound and graphics controls.
- [x] Procedural electric motor, wind and tire sound; local preference persistence.
- [ ] Match fine botanical detail, terrain composition and car finish of the reference.
- [ ] Match all reference vehicles and locations (currently one coupe / highlands).
- [ ] Validate physical gamepad control on hardware.
- [ ] Demonstrate visual/handling equivalence through human comparative playtesting.

## Iteration log
1. Initial integrated render: terrain too steep/enclosing; tree and grass silhouettes coarse; coupe rear too rounded with exposed wheels.
2. Broadened terrain transitions, added asymmetric hillside contours, corrected color-space handling, added dry stone walls, lowered chase distance, revised coupe shell and fenders, finer grass.
3. Ongoing: detailed tree silhouettes, rear vehicle materials, long-run performance and browser controls.
