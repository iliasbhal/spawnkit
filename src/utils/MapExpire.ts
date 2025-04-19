/**
 * A Map-like data structure that automatically removes entries after a specified time.
 * @template K The type of keys in the map
 * @template V The type of values in the map
 */
export class MapExpire<K, V> {
  private map: Map<K, V>;
  private timeouts: Map<K, NodeJS.Timeout>;
  private defaultExpiryMs: number;

  /**
   * Creates a new MapExpire instance
   * @param defaultExpiryMs Default expiration time in milliseconds for entries
   */
  constructor(config: { defaultExpiryMs: number } = { defaultExpiryMs: 3600000 }) { // Default 1 hour
    this.map = new Map<K, V>();
    this.timeouts = new Map<K, NodeJS.Timeout>();
    this.defaultExpiryMs = config.defaultExpiryMs;
  }

  /**
   * Sets a key-value pair in the map with optional custom expiration time
   * @param key The key to set
   * @param value The value to set
   * @param expiryMs Optional custom expiration time in milliseconds
   * @returns The MapExpire instance for chaining
   */
  set(key: K, value: V, expiryMs?: number): MapExpire<K, V> {
    // Clear any existing timeout for this key
    this.clearTimeout(key);

    // Add to the map
    this.map.set(key, value);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.delete(key);
    }, expiryMs ?? this.defaultExpiryMs);

    this.timeouts.set(key, timeout);
    return this;
  }

  /**
   * Removes a key-value pair from the map
   * @param key The key to remove
   * @returns true if the key was in the map, false otherwise
   */
  delete(key: K): boolean {
    this.clearTimeout(key);
    return this.map.delete(key);
  }

  /**
   * Gets a value from the map
   * @param key The key to get
   * @returns The value associated with the key, or undefined if not found
   */
  get(key: K): V | undefined {
    return this.map.get(key);
  }

  /**
   * Checks if a key exists in the map
   * @param key The key to check
   * @returns true if the key exists in the map, false otherwise
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * Clears all entries from the map
   */
  clear(): void {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.map.clear();
  }

  /**
   * Gets the number of entries in the map
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Returns an iterator of all entries in the map
   */
  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  /**
   * Returns an iterator of all keys in the map
   */
  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  /**
   * Returns an iterator of all values in the map
   */
  values(): IterableIterator<V> {
    return this.map.values();
  }

  /**
   * Returns an iterator of all entries in the map
   */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.map[Symbol.iterator]();
  }

  /**
   * Clears the timeout for a specific key
   * @param key The key whose timeout should be cleared
   */
  private clearTimeout(key: K): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  /**
   * Updates the expiration time for an existing entry
   * @param key The key to update
   * @param expiryMs New expiration time in milliseconds
   * @returns true if the entry was updated, false if it doesn't exist
   */
  updateExpiry(key: K, expiryMs: number): boolean {
    if (!this.has(key)) {
      return false;
    }
    this.clearTimeout(key);
    const timeout = setTimeout(() => {
      this.delete(key);
    }, expiryMs);
    this.timeouts.set(key, timeout);
    return true;
  }
}
