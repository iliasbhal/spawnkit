/**
 * Type definition for event handlers
 */
type EventHandler<T = any> = (message: T) => void;

/**
 * EventBus class - Implements the publisher-subscriber pattern
 * Allows components to communicate without direct coupling
 */
export class EventBus<T extends Record<string, any>> {
  private eventHandlersByEvent: Map<keyof T, Set<EventHandler>>;

  constructor() {
    this.eventHandlersByEvent = new Map<keyof T, Set<EventHandler>>();
  }

  /**
   * Subscribe to an event
   * @param eventName - The name of the event to subscribe to
   * @param handler - The callback function to execute when the event is published
   * @returns A function to unsubscribe the handler
   */
  public on<E extends keyof T>(eventName: E, handler: EventHandler<T[E]>): () => void {
    if (!this.eventHandlersByEvent.has(eventName)) {
      this.eventHandlersByEvent.set(eventName, new Set<EventHandler>());
    }

    const handlers = this.eventHandlersByEvent.get(eventName)!;
    handlers.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe to an event and auto-unsubscribe after it fires once
   * @param eventName - The name of the event to subscribe to
   * @param handler - The callback function to execute when the event is published
   * @returns A function to unsubscribe the handler
   */
  public once<E extends keyof T>(eventName: E, handler: EventHandler<T[E]>): () => void {
    const unsubscribe = this.on<E>(eventName, (data) => {
      unsubscribe();
      handler(data);
    });

    return unsubscribe;
  }

  /**
   * Unsubscribe from an event
   * @param eventName - The name of the event to unsubscribe from
   * @param handler - The handler to remove
   */
  public off<E extends keyof T>(eventName: E, handler: EventHandler<T[E]>): void {
    if (!this.eventHandlersByEvent.has(eventName)) {
      return;
    }

    const handlers = this.eventHandlersByEvent.get(eventName)!;
    handlers.delete(handler as EventHandler);

    // Clean up empty handler sets
    if (handlers.size === 0) {
      this.eventHandlersByEvent.delete(eventName);
    }
  }

  /**
   * Publish an event
   * @param eventName - The name of the event to publish
   * @param data - The data to pass to handlers
   */
  public emit<E extends keyof T>(eventName: E, data?: T[E]): void {
    if (!this.eventHandlersByEvent.has(eventName)) {
      return;
    }

    const handlers = this.eventHandlersByEvent.get(eventName)!;
    handlers.forEach(handler => {
      try {
        handler(data as any);
      } catch (error) {
        console.error(`Error in event handler for ${eventName as any}:`, error);
      }
    });
  }

  /**
   * Clear all event handlers for a specific event
   * @param eventName - The name of the event to clear
   */
  public clear<E extends keyof T>(eventName: E): void {
    this.eventHandlersByEvent.delete(eventName);
  }

  /**
   * Clear all event handlers
   */
  public clearAll(): void {
    this.eventHandlersByEvent.clear();
  }

  /**
   * List all registered event names
   * @returns Array of event names
   */
  public listEvents(): (keyof T)[] {
    return Array.from(this.eventHandlersByEvent.keys());
  }

  /**
   * Check if an event has subscribers
   * @param eventName - The name of the event to check
   * @returns True if the event has subscribers
   */
  public hasSubscribers(eventName: string): boolean {
    return this.eventHandlersByEvent.has(eventName) && this.eventHandlersByEvent.get(eventName)!.size > 0;
  }
}
