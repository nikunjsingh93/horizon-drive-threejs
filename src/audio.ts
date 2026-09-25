/** Procedural, low-key driving ambience built entirely with the Web Audio API. */
export class DriveAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: Array<{ oscillator: OscillatorNode; gain: GainNode }> = [];
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;
  private skidBuffer: AudioBuffer | null = null;
  private skidSource: AudioBufferSourceNode | null = null;
  private skidPlaying = false;
  private skidLatched = false;
  private skidLoadStarted = false;
  private engineFilter: BiquadFilterNode | null = null;
  private volume = 0.35;
  private muted = false;
  private started = false;
  private smoothedSpeed = 0;
  private smoothedThrottle = 0;
  private smoothedOffroad = 0;
  private smoothedSlide = 0;

  /** Call from a user gesture (for example, the Start button). Safe to call again after resume. */
  async start(): Promise<void> {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    try {
      if (!this.context) this.initialize(AudioContextClass);
      if (this.context?.state === "suspended") await this.context.resume();
      void this.loadSkidSample();
    } catch {
      // Audio is an enhancement; browser policy or device limitations should not break driving.
    }
  }

  update(speed: number, throttle: number, offroad: boolean, slide: number, dt: number, rpm = 850, skid = 0): void {
    const context = this.context;
    if (!context || !this.started || context.state !== "running") return;

    const elapsed = Number.isFinite(dt) ? Math.min(0.25, Math.max(0, dt)) : 0;
    const smoothing = 1 - Math.exp(-elapsed / 0.22);
    const targetSpeed = Number.isFinite(speed) ? Math.min(55, Math.max(-55, speed)) : 0;
    const targetThrottle = Number.isFinite(throttle) ? Math.min(1, Math.max(0, throttle)) : 0;
    this.smoothedSpeed += (targetSpeed - this.smoothedSpeed) * smoothing;
    this.smoothedThrottle += (targetThrottle - this.smoothedThrottle) * smoothing;
    this.smoothedOffroad += ((offroad ? 1 : 0) - this.smoothedOffroad) * smoothing;
    this.smoothedSlide += (Math.min(1, Math.max(0, Math.abs(slide) * 2.8)) - this.smoothedSlide) * smoothing;

    const now = context.currentTime;
    const velocity = Math.abs(this.smoothedSpeed);
    const motion = Math.min(1, velocity / 32);
    const load = this.smoothedThrottle;

    // A few quiet, soft harmonics suggest an electric motor without a sharp engine whine.
    const baseHz = 25 + rpm / 60 + load * 8;
    this.engine.forEach(({ oscillator }, index) => {
      this.ramp(oscillator.frequency, baseHz * (index + 1), now, 0.16);
    });
    this.engine.forEach(({ gain }, index) => {
      const level = (0.016 + load * 0.021) / (index + 1);
      this.ramp(gain.gain, level, now, 0.2);
    });
    if (this.engineFilter) this.ramp(this.engineFilter.frequency, 260 + velocity * 13, now, 0.24);

    // Filtered broadband air rises gently with road speed.
    if (this.windGain) this.ramp(this.windGain.gain, 0.004 + motion * 0.052, now, 0.32);
    if (this.windFilter) this.ramp(this.windFilter.frequency, 320 + motion * 1650, now, 0.32);

    // Tire texture stays understated on pavement and warms slightly on loose ground.
    const roughness = this.smoothedOffroad;
    if (this.tireGain) this.ramp(this.tireGain.gain, 0.003 + motion * (0.014 + roughness * 0.02 + this.smoothedSlide * 0.025), now, 0.2);
    if (this.tireFilter) {
      this.ramp(this.tireFilter.frequency, 520 + motion * 620 + roughness * 420 + this.smoothedSlide * 1150, now, 0.2);
      this.ramp(this.tireFilter.Q, 0.55 + roughness * 0.25, now, 0.3);
    }
    // A recorded tire chirp plays once per loss-of-grip event; holding the
    // handbrake cannot loop it into a continuous artificial whistle.
    const squeal = Math.min(1, Math.max(0, skid));
    if (squeal < 0.12) this.skidLatched = false;
    if (squeal > 0.2 && !this.skidLatched && !this.skidPlaying && this.skidBuffer) {
      this.skidLatched = true;
      this.playSkidSample(context);
    }
    if (this.skidPlaying && this.skidGain && squeal < 0.12) {
      this.ramp(this.skidGain.gain, 0, now, 0.07);
      this.skidSource?.stop(now + 0.22);
      this.skidPlaying = false;
      this.skidSource = null;
    }
  }

  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return;
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyMasterGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  private initialize(AudioContextClass: typeof AudioContext): void {
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    this.context = context;
    this.master = master;

    const engineFilter = context.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 420;
    engineFilter.Q.value = 0.45;
    engineFilter.connect(master);
    this.engineFilter = engineFilter;
    [1, 2, 3].forEach((harmonic) => {
      const oscillator = context.createOscillator();
      oscillator.type = harmonic === 1 ? "sine" : "triangle";
      oscillator.frequency.value = 42 * harmonic;
      const gain = context.createGain();
      gain.gain.value = harmonic === 1 ? 0.012 : 0.006 / harmonic;
      oscillator.connect(gain);
      gain.connect(engineFilter);
      oscillator.start();
      this.engine.push({ oscillator, gain });
    });

    const wind = this.createNoise(context, 2);
    const windFilter = context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 320;
    const windGain = context.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    this.windFilter = windFilter;
    this.windGain = windGain;

    const tire = this.createNoise(context, 2);
    const tireFilter = context.createBiquadFilter();
    tireFilter.type = "bandpass";
    tireFilter.frequency.value = 520;
    tireFilter.Q.value = 0.55;
    const tireGain = context.createGain();
    tireGain.gain.value = 0;
    tire.connect(tireFilter);
    tireFilter.connect(tireGain);
    tireGain.connect(master);
    this.tireFilter = tireFilter;
    this.tireGain = tireGain;
    const skidGain = context.createGain();
    skidGain.gain.value = 0;
    skidGain.connect(master);
    this.skidGain = skidGain;
    this.started = true;
    this.applyMasterGain();
  }

  private async loadSkidSample(): Promise<void> {
    if (this.skidLoadStarted || !this.context) return;
    this.skidLoadStarted = true;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/tire-squeal-cc0.mp3`);
      if (!response.ok) throw new Error(`Tire audio: ${response.status}`);
      this.skidBuffer = await this.context.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      this.skidLoadStarted = false;
      console.warn('Tire audio unavailable.', error);
    }
  }

  private playSkidSample(context: AudioContext): void {
    if (!this.skidBuffer || !this.skidGain) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.skidBuffer;
    source.connect(this.skidGain);
    this.skidSource = source;
    this.skidPlaying = true;
    this.skidGain.gain.cancelScheduledValues(now);
    this.skidGain.gain.setValueAtTime(0, now);
    this.skidGain.gain.setTargetAtTime(0.15, now, 0.025);
    source.onended = () => {
      if (this.skidSource === source) {
        this.skidSource = null;
        this.skidPlaying = false;
        this.skidGain?.gain.setValueAtTime(0, context.currentTime);
      }
    };
    source.start(now);
  }

  private createNoise(context: AudioContext, seconds: number): AudioBufferSourceNode {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    // A gently softened random bed avoids clicks and per-loop tonal artifacts.
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.18 + white * 0.82;
      samples[i] = previous * 0.7;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    return source;
  }

  private applyMasterGain(): void {
    if (!this.master || !this.context) return;
    this.ramp(this.master.gain, this.muted ? 0 : this.volume, this.context.currentTime, 0.12);
  }

  private ramp(param: AudioParam, value: number, now: number, seconds: number): void {
    try {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, seconds);
    } catch {
      // Ignore parameters that become unavailable during page teardown.
    }
  }
}
