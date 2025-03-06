/**
 * AsyncQueue provides a mechanism to queue async operations and execute them sequentially.
 */
export class AsyncQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;

  /**
   * Adds a task to the queue and starts processing if needed
   * @param task The async function to be executed
   * @returns A promise that resolves when the task completes
   */
  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Wrap the task to handle resolution and rejection
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Start processing the queue if it's not already being processed
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processes the queue sequentially
   */
  private async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const nextTask = this.queue[0];
        await nextTask();
        this.queue.shift(); // Remove the completed task
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Returns the current length of the queue
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * Returns the number of tasks waiting to be processed
   * If a task is currently being processed, it returns (length - 1)
   * Otherwise, it returns the full length
   */
  public get waitingCount(): number {
    if (this.isProcessing && this.queue.length > 0) {
      return this.queue.length - 1; // Subtract the currently running task
    }
    return this.queue.length;
  }

  /**
   * Checks if the queue is currently processing tasks
   */
  public get processing(): boolean {
    return this.isProcessing;
  }
} 