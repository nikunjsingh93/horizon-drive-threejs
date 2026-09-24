import assert from "node:assert/strict";
import { Driving, Landscape } from "../src/simulation";
import type { Input } from "../src/simulation";
import {renderPixelRatio,renderResolution} from '../src/quality';

assert.equal(renderResolution('bogus'),'auto');
assert.equal(renderPixelRatio(720,2,'low','auto'),.55);
assert.equal(renderPixelRatio(720,2,'low','1080'),1.5);
assert.equal(renderPixelRatio(720,1,'high','2160'),3);

const neutral: Input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const tick = 1 / 60;

function assertFiniteState(car: Driving, label: string): void {
  for (const [key, value] of Object.entries({
    x: car.x, z: car.z, y: car.y, heading: car.heading, speed: car.speed,
    steer: car.steer, travelHeading: car.travelHeading, slip: car.slip,
    distance: car.distance, roll: car.roll, pitch: car.pitch,
    acceleration: car.acceleration,
  })) assert.ok(Number.isFinite(value), `${label}: ${key} must remain finite (got ${value})`);
}

function runAuto(seed: string, style: string, seconds: number): { car: Driving; maxLateral: number } {
  const world = new Landscape(seed, style);
  const car = new Driving(world);
  car.auto = true;
  let maxLateral = Math.abs(world.lateral(car.x, car.z));
  const steps = Math.round(seconds / tick);
  for (let i = 0; i < steps; i += 1) {
    car.step(tick, neutral);
    maxLateral = Math.max(maxLateral, Math.abs(world.lateral(car.x, car.z)));
    assertFiniteState(car, `${seed}/${style} at step ${i}`);
  }
  return { car, maxLateral };
}

// Autodrive should remain on the paved road and numerically stable during a long drive.
for (const [seed, style] of [
  ["north-coast", "flowing"],
  ["pine-pass", "winding"],
  ["open-meadow", "gentle"],
  ["blue-hour", "flowing"],
  ["cedar-run", "winding"],
] as const) {
  const { car, maxLateral } = runAuto(seed, style, 10 * 60);
  assert.ok(maxLateral < 4, `${seed}/${style}: lateral offset peaked at ${maxLateral.toFixed(2)} m`);
  assert.ok(car.distance > 1000, `${seed}/${style}: autodrive should make progress`);
}

// Render rates feed the same fixed simulation step through an accumulator.
function runAtRenderRate(fps: number): Driving {
  const car = new Driving(new Landscape("frame-rate", "flowing"));
  car.auto = true;
  let accumulator = 0;
  const fixed = 1 / 120;
  const frameCount = fps * 8;
  const frameDuration = 8 / frameCount;
  for (let frame = 0; frame < frameCount; frame += 1) {
    accumulator += frameDuration;
    while (accumulator + 1e-12 >= fixed) {
      car.step(fixed, neutral);
      accumulator -= fixed;
    }
  }
  return car;
}
const frameResults = [30, 60, 144].map(runAtRenderRate);
for (const car of frameResults) assertFiniteState(car, "render-rate comparison");
for (const other of frameResults.slice(1)) {
  assert.ok(Math.abs(other.z - frameResults[0].z) < 0.03, "fixed-step travel should be equivalent at 30/60/144 fps");
  assert.ok(Math.abs(other.x - frameResults[0].x) < 0.03, "fixed-step lateral position should be equivalent at 30/60/144 fps");
  assert.ok(Math.abs(other.speed - frameResults[0].speed) < 0.01, "fixed-step speed should be equivalent at 30/60/144 fps");
}

// Throttle accelerates, brake reduces forward speed, and sustained throttle can reverse.
const manual = new Driving(new Landscape("controls", "gentle"));
const throttle: Input = { ...neutral, throttle: 1 };
for (let i = 0; i < 5 * 60; i += 1) manual.step(tick, throttle);
assert.ok(manual.speed > 5, "throttle should accelerate the car");
const forwardSpeed = manual.speed;
const braking: Input = { ...neutral, brake: 1 };
for (let i = 0; i < 2 * 60; i += 1) manual.step(tick, braking);
assert.ok(manual.speed < forwardSpeed, "brake should reduce forward speed");
for (let i = 0; i < 8 * 60; i += 1) manual.step(tick, braking);
assert.ok(manual.speed < 0, "holding brake through a stop should engage reverse");
assert.ok(manual.speed >= -7, "reverse speed should remain bounded");

// Positive steering is screen-right for a car whose local forward axis is +Z.
const rightTurn = new Driving(new Landscape("arrow-direction", "gentle"));
const rightLane = rightTurn.world.lateral(rightTurn.x, rightTurn.z);
for (let i = 0; i < 4 * 60; i += 1) rightTurn.step(tick, { ...neutral, throttle: 1, steer: 0.75 });
assert.ok(rightTurn.world.lateral(rightTurn.x, rightTurn.z) < rightLane - 0.5, "right steering should move toward screen-right (negative world X)");
const leftTurn = new Driving(new Landscape("arrow-direction", "gentle"));
const leftLane = leftTurn.world.lateral(leftTurn.x, leftTurn.z);
for (let i = 0; i < 4 * 60; i += 1) leftTurn.step(tick, { ...neutral, throttle: 1, steer: -0.75 });
assert.ok(leftTurn.world.lateral(leftTurn.x, leftTurn.z) > leftLane + 0.5, "left steering should move toward screen-left (positive world X)");

// A digital steering tap should build gradually and stay calm at cruising speed.
const smoothTurn = new Driving(new Landscape("smooth-steering", "gentle"));
for (let i = 0; i < 6 * 60; i += 1) smoothTurn.step(tick, throttle);
const cruiseMaxSteer = smoothTurn.maxSteer();
const oldHeading = smoothTurn.heading;
for (let i = 0; i < 12; i += 1) smoothTurn.step(tick, { ...neutral, throttle: 1, steer: 1 });
assert.ok(smoothTurn.steer < smoothTurn.maxSteer() * 0.66, "digital steering should ease in rather than snap to full lock");
assert.ok(Math.abs(smoothTurn.heading - oldHeading) < 0.14, "a short high-speed steering input should not whip the car around");

// Body movement follows inertia: acceleration lifts the nose, braking dives it,
// and the car leans toward the outside of a corner.
class FlatLandscape extends Landscape {
  roadX(_z: number) { return 0; }
  roadY(_z: number) { return 0; }
  slope(_z: number) { return 0; }
  stretch(_z: number) { return 1; }
  lateral(x: number, _z: number) { return x; }
  height(_x: number, _z: number) { return 0; }
  surface(_x: number, _z: number) { return 0; }
}
const weight = new Driving(new FlatLandscape("body-weight", "gentle"));
for (let i = 0; i < 2 * 60; i += 1) weight.step(tick, throttle);
assert.ok(weight.pitch < -0.01, "forward acceleration should lift the front and lower the rear");
for (let i = 0; i < 20; i += 1) weight.step(tick, braking);
assert.ok(weight.pitch > 0.01, "forward braking should lower the front and lift the rear");
const reverseWeight = new Driving(new FlatLandscape("reverse-weight", "gentle"));
reverseWeight.speed = -3;
for (let i = 0; i < 20; i += 1) reverseWeight.step(tick, braking);
assert.ok(reverseWeight.pitch > 0, "reverse acceleration should lower the nose and lift the rear");

function corner(steer: number, handbrake: boolean) {
  const car = new Driving(new FlatLandscape("corner-weight", "gentle"));
  for (let i = 0; i < 3 * 60; i += 1) car.step(tick, throttle);
  const entrySpeed = car.speed;
  for (let i = 0; i < 45; i += 1) car.step(tick, { ...neutral, throttle: 1, steer, handbrake });
  return { car, entrySpeed };
}
const regularRight = corner(1, false).car;
const regularLeft = corner(-1, false).car;
assert.ok(regularRight.roll < -0.01, "right turn should lower the outside left side");
assert.ok(regularLeft.roll > 0.01, "left turn should lower the outside right side");
const drifting = corner(1, true);
assert.ok(drifting.car.speed > drifting.entrySpeed * 0.45, "handbrake should preserve momentum long enough for a slide");
assert.ok(Math.abs(drifting.car.slip) > 0.15, "handbrake corner should create a visible angle between nose and travel");
assert.ok(Math.abs(drifting.car.slip) > Math.abs(regularRight.slip) * 3, "locked rear wheels should slide more than a normal turn");
for (let i = 0; i < 90; i += 1) drifting.car.step(tick, neutral);
assert.ok(Math.abs(drifting.car.slip) < 0.03, "tires should regain grip after handbrake release");
// Equal flat surfaces must retain equal speed, even several kilometres off road.
const paved = new Driving(new FlatLandscape('surface','flowing'));
const loose = new Driving(new FlatLandscape('surface','flowing'));loose.x=2500;
for(let i=0;i<30*60;i++){paved.step(tick,throttle);loose.step(tick,throttle);}
assert.equal(loose.offroad,true);assert.ok(Math.abs(loose.speed-paved.speed)<1e-8);assert.ok(loose.speed>25);
const gears=new Driving(new FlatLandscape('gears'));gears.transmission='manual';
for(let i=0;i<20*60;i++)gears.step(tick,throttle);
assert.ok(gears.speed<12.1&&gears.rpm>6000,'first gear rev limiter');gears.shift(1);
for(let i=0;i<15*60;i++)gears.step(tick,throttle);
assert.ok(gears.speed>18&&gears.speed<20.1,'second gear extends speed range');
for(let i=0;i<6*60;i++)gears.step(tick,braking);
assert.ok(Math.abs(gears.speed)<.02,'manual brake stops without selecting reverse');
gears.shift(-1);gears.shift(-1);assert.equal(gears.gear,0);
for(let i=0;i<60;i++)gears.step(tick,throttle);assert.ok(Math.abs(gears.speed)<.01,'neutral disengages drive');
gears.shift(-1);for(let i=0;i<3*60;i++)gears.step(tick,throttle);assert.ok(gears.speed<-2,'reverse uses throttle');
const pondWorld=new Landscape('OPEN-ROAD');let ponds=0;
for(let tx=-4;tx<=4;tx++)for(let tz=-4;tz<=4;tz++){const p=pondWorld.pond(tx,tz);if(!p)continue;ponds++;assert.ok(pondWorld.height(p.x,p.z)<p.level);for(let k=0;k<16;k++){const a=k*Math.PI/8;assert.ok(pondWorld.height(p.x+Math.cos(a)*p.rx*1.6,p.z+Math.sin(a)*p.rz*1.6)>p.level-.01,'pond surrounded by banks');}}
assert.ok(ponds>4);assert.equal(new Landscape('OPEN-ROAD').height(2500,-2100),pondWorld.height(2500,-2100),'far terrain deterministic');

// Reset should restore car dynamics and surface flags while preserving the trip odometer and autodrive route.
manual.auto = true;
manual.offroad = true;
manual.step(tick, throttle);
manual.reset();
assert.ok(Math.abs(manual.speed) < 1e-9, "reset should clear speed");
assert.ok(manual.distance > 0, "reset should preserve accumulated trip distance");
assert.equal(manual.auto, true, "reset should preserve autodrive mode");
assert.equal(manual.offroad, false, "reset should clear the off-road flag");
assert.equal(manual.throttle, 0, "reset should clear throttle");
assert.ok(Math.abs(manual.world.lateral(manual.x, manual.z) + 1.85) < 0.02, "reset should place the car in its lane");
assertFiniteState(manual, "after reset");

console.log("simulation tests passed: long autodrive, fixed-step frame rates, controls, unrestricted off-road speed, manual gears, ponds, and reset");


