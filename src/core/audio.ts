/**
 * Plays what the delay sounds like at the focal point: the time source's click on
 * every beat, and a second, lower click from a player who plays with what they hear.
 * The gap between the two is the delay.
 */
export class DelayDemo {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private nextBeat = 0;
  private tempo = 120;
  private delay = 0;

  get playing(): boolean {
    return this.timer !== null;
  }

  update(tempo: number, delaySeconds: number): void {
    this.tempo = tempo;
    this.delay = delaySeconds;
  }

  async start(tempo: number, delaySeconds: number): Promise<void> {
    this.stop();
    this.update(tempo, delaySeconds);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx ??= new Ctx();
    await this.ctx.resume();
    this.nextBeat = this.ctx.currentTime + 0.1;
    const schedule = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      while (this.nextBeat < ctx.currentTime + 0.25) {
        this.click(this.nextBeat, 1760, 0.35);
        this.click(this.nextBeat + this.delay, 660, 0.35);
        this.nextBeat += 60 / this.tempo;
      }
    };
    schedule();
    this.timer = window.setInterval(schedule, 40);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private click(at: number, freq: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
    osc.connect(amp).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.04);
  }
}
