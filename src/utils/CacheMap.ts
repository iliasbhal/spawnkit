export class CacheMap extends Map {
  get(key: any) {
    this.scheduleCleanup(key);
    return super.get(key);
  }

  set(key: any, value: any) {
    super.set(key, value);
    this.scheduleCleanup(key);
    return this;
  }

  timeouts: Record<any, any> = {};
  private scheduleCleanup(key: any) {
    const timeoutId = setTimeout(() => {
      this.delete(key);
    }, 10_000);

    this.timeouts[key] = timeoutId;
  }
}
