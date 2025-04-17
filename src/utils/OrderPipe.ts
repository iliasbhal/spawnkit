interface Message {
  order: number;
  id: string;
}

type MessageListener = (message: Message) => void;

export class OrderPipe {
  private nextExpectedOrder: number = 0;
  private pendingMessages: Map<number, Message> = new Map();
  private messageListeners: Set<MessageListener> = new Set();

  constructor(initialOrder: number = 0) {
    this.nextExpectedOrder = initialOrder;
  }

  /**
   * Add a listener for in-order messages
   * @param listener Callback function that will be called when a message is in order
   */
  onMessage(listener: MessageListener): void {
    this.messageListeners.add(listener);
  }

  /**
   * Remove a message listener
   * @param listener The listener to remove
   */
  removeListener(listener: MessageListener): void {
    this.messageListeners.delete(listener);
  }

  private notifyListeners(message: Message): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Process a message, returning it if it's in order or null if it needs to wait
   * @param message The message to process
   * @returns The message if it's ready to be processed, null if it needs to wait
   */
  process(message: Message): Message | null {
    // If this is the next expected message, return it immediately
    if (message.order === this.nextExpectedOrder) {
      this.nextExpectedOrder++;
      this.notifyListeners(message);
      return message;
    }

    // If the message is from the past, ignore it
    const shouldIgnore = message.order < this.nextExpectedOrder;
    if (shouldIgnore) return null;

    // Store the message for later
    this.pendingMessages.set(message.order, message);
    return null;
  }

  /**
   * Check if there are any messages that can now be processed
   * @returns The next message in order if available, null otherwise
   */
  checkPending(): Message | null {
    const nextMessage = this.pendingMessages.get(this.nextExpectedOrder);
    if (nextMessage) {
      this.pendingMessages.delete(this.nextExpectedOrder);
      this.nextExpectedOrder++;
      this.notifyListeners(nextMessage);
      return nextMessage;
    }
    return null;
  }

  /**
   * Get the current number of pending messages
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }

  /**
   * Get the next expected order number
   */
  getNextExpectedOrder(): number {
    return this.nextExpectedOrder;
  }
}