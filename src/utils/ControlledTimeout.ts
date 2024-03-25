export class ControlledTimeout {
  callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  running = false;
  prevRemaining: number | null = null;
  startedAt: number | null = null;
  timeoutId: ReturnType<typeof setTimeout> | null = null;
  start(remaining: number) {
    const timeRemainig = remaining;
    if (!timeRemainig) {
      throw new Error("Need a Timeout");
    }

    this.timeoutId = setTimeout(() => {
      this.reset();
      this.callback();
    }, timeRemainig);
    this.startedAt = Date.now();
    this.running = true;
  }

  stop() {
    if (!this.running) return;

    this.running = false;
    this.prevRemaining = Date.now() - this.startedAt!;
    this.startedAt = null;
    clearTimeout(this.timeoutId!);
  }

  resume() {
    if (!this.prevRemaining) {
      throw new Error("UH OH");
    }

    this.timeoutId = setTimeout(this.callback, this.prevRemaining);
    this.startedAt = Date.now();
    this.running = true;
    this.prevRemaining = null;
  }

  reset() {
    this.stop();
    this.prevRemaining = null;
  }

  restart(timeout: number) {
    this.reset();
    this.start(timeout);
  }
}
