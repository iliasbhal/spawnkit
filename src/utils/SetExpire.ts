/**
 * A Set-like data structure that automatically removes entries after a specified time.
 * @template T The type of elements in the set
 */
export class SetExpire<T> {
  private set: Set<T>;
  private timeouts: Map<T, NodeJS.Timeout>;
  private defaultExpiryMs: number;

  /**
   * Creates a new SetExpire instance
   * @param defaultExpiryMs Default expiration time in milliseconds for entries
   */
  constructor(config: { defaultExpiryMs: number } = { defaultExpiryMs: 3600000 }) { // Default 1 hour
    this.set = new Set<T>();
    this.timeouts = new Map<T, NodeJS.Timeout>();
    this.defaultExpiryMs = config.defaultExpiryMs;
  }

  /**
   * Adds a value to the set with optional custom expiration time
   * @param value The value to add
   * @param expiryMs Optional custom expiration time in milliseconds
   * @returns The SetExpire instance for chaining
   */
  add(value: T, expiryMs?: number): SetExpire<T> {
    // Clear any existing timeout for this value
    this.clearTimeout(value);

    // Add to the set
    this.set.add(value);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.delete(value);
    }, expiryMs ?? this.defaultExpiryMs);

    this.timeouts.set(value, timeout);
    return this;
  }

  /**
   * Removes a value from the set
   * @param value The value to remove
   * @returns true if the value was in the set, false otherwise
   */
  delete(value: T): boolean {
    this.clearTimeout(value);
    return this.set.delete(value);
  }

  /**
   * Checks if a value exists in the set
   * @param value The value to check
   * @returns true if the value exists in the set, false otherwise
   */
  has(value: T): boolean {
    return this.set.has(value);
  }

  /**
   * Clears all values from the set
   */
  clear(): void {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.set.clear();
  }

  /**
   * Gets the number of elements in the set
   */
  get size(): number {
    return this.set.size;
  }

  /**
   * Returns an iterator of all values in the set
   */
  values(): IterableIterator<T> {
    return this.set.values();
  }

  /**
   * Returns an iterator of all values in the set
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this.set[Symbol.iterator]();
  }

  /**
   * Clears the timeout for a specific value
   * @param value The value whose timeout should be cleared
   */
  private clearTimeout(value: T): void {
    const timeout = this.timeouts.get(value);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(value);
    }
  }

  /**
   * Updates the expiration time for an existing value
   * @param value The value to update
   * @param expiryMs New expiration time in milliseconds
   * @returns true if the value was updated, false if it doesn't exist
   */
  updateExpiry(value: T, expiryMs: number): boolean {
    if (!this.has(value)) {
      return false;
    }
    this.clearTimeout(value);
    const timeout = setTimeout(() => {
      this.delete(value);
    }, expiryMs);
    this.timeouts.set(value, timeout);
    return true;
  }
}
