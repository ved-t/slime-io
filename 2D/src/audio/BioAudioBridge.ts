export class BioAudioBridge {
  private static instance: BioAudioBridge;
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive: boolean = false;

  private constructor() {
    // Lazily initialized on first user gesture
  }

  public static getInstance(): BioAudioBridge {
    if (!BioAudioBridge.instance) {
      BioAudioBridge.instance = new BioAudioBridge();
    }
    return BioAudioBridge.instance;
  }

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.startAmbientHum();
      }
    } catch (e) {
      console.warn("BioAudioBridge: Web Audio API init error", e);
    }
  }

  private startAmbientHum(): void {
    if (!this.ctx || this.humOsc) return;
    try {
      this.humOsc = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();

      this.humOsc.type = 'sine';
      this.humOsc.frequency.setValueAtTime(54, this.ctx.currentTime); // Deep resonant G1

      // Tremolo LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.28, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(5, this.ctx.currentTime);
      lfo.connect(this.humOsc.frequency);
      lfo.start();

      this.humGain.gain.setValueAtTime(this.enabled ? 0.04 : 0.0, this.ctx.currentTime);
      this.humOsc.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);
      this.humOsc.start();
    } catch {
      // Ignored
    }
  }

  public toggle(): boolean {
    this.init();
    this.enabled = !this.enabled;
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(this.enabled ? 0.04 : 0.0, this.ctx.currentTime, 0.2);
    }
    if (!this.enabled && this.sirenGain && this.ctx) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    return this.enabled;
  }

  public playEatSound(pitchModifier = 1.0): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 160 * pitchModifier;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.8, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
      filter.Q.value = 5.0;

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio errors safely caught
    }
  }

  public playLungeSound(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.42);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch {}
  }

  public playMitosisSound(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = i * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(260 + i * 140, now + delay);
        osc.frequency.exponentialRampToValueAtTime(680 + i * 200, now + delay + 0.12);

        gain.gain.setValueAtTime(0.24, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.19);
      }
    } catch {}
  }

  public playLaserZap(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playTurretCharge(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.7);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.7);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.76);
    } catch {}
  }

  public playTurretShot(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  public playCryoHit(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.value = 8;

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  public playPadActive(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playDoorUnlocked(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const delay = idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    } catch {}
  }

  public playAlertSiren(active: boolean): void {
    if (!this.enabled || !this.ctx) return;
    if (active && !this.isSirenActive) {
      try {
        this.isSirenActive = true;
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();

        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(450, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(1.2, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(150, this.ctx.currentTime);
        lfo.connect(this.sirenOsc.frequency);
        lfo.start();

        this.sirenGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
      } catch {}
    } else if (!active && this.isSirenActive) {
      this.isSirenActive = false;
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        setTimeout(() => {
          try {
            this.sirenOsc?.stop();
            this.sirenOsc?.disconnect();
            this.sirenOsc = null;
          } catch {}
        }, 150);
      }
    }
  }

  public playUIClick(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playCytoplasmBurst(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Sub-bass thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);

      // Squishy splash noise
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);
      filter.Q.value = 3.5;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      whiteNoise.start(now);
    } catch {}
  }

  public playPunctureStrike(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playToxicDissolve(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.25);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  public playBoostJet(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }
}
