import { AsyncQueue } from "./AsyncQueue";

describe("AsyncQueue", () => {
  let queue: AsyncQueue;

  beforeEach(() => {
    queue = new AsyncQueue();
  });

  it("should process tasks sequentially", async () => {
    const results: number[] = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Create three tasks with different delays
    const task1 = async () => {
      await delay(30);
      results.push(1);
      return 1;
    };

    const task2 = async () => {
      await delay(10);
      results.push(2);
      return 2;
    };

    const task3 = async () => {
      await delay(20);
      results.push(3);
      return 3;
    };

    // Enqueue all tasks
    const promise1 = queue.enqueue(task1);
    const promise2 = queue.enqueue(task2);
    const promise3 = queue.enqueue(task3);

    // Wait for all tasks to complete
    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    // Tasks should be processed in order of enqueuing, not by completion time
    expect(results).toEqual([1, 2, 3]);
    expect(result1).toBe(1);
    expect(result2).toBe(2);
    expect(result3).toBe(3);
  });

  it("should properly handle errors in tasks", async () => {
    const successTask = async () => "success";
    const errorTask = async () => {
      throw new Error("Task failed");
    };
    const nextTask = async () => "next task";

    // Enqueue tasks
    const successPromise = queue.enqueue(successTask);
    const errorPromise = queue.enqueue(errorTask);
    const nextPromise = queue.enqueue(nextTask);

    // First task should succeed
    await expect(successPromise).resolves.toBe("success");

    // Second task should fail
    await expect(errorPromise).rejects.toThrow("Task failed");

    // Third task should still execute and succeed
    await expect(nextPromise).resolves.toBe("next task");
  });

  it("should report correct queue length", async () => {
    expect(queue.length).toBe(0);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Add a long-running task
    const longTask = queue.enqueue(async () => {
      await delay(50);
      return "done";
    });

    expect(queue.length).toBe(1);

    // Add more tasks
    queue.enqueue(async () => "task2");
    queue.enqueue(async () => "task3");

    expect(queue.length).toBe(3);

    // Wait for all tasks to complete
    await longTask;

    // Small delay to allow internal queue processing to complete
    await delay(60);

    expect(queue.length).toBe(0);
  });

  it("should report processing status correctly", async () => {
    expect(queue.processing).toBe(false);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Start a task that takes some time
    const promise = queue.enqueue(async () => {
      await delay(50);
      return "done";
    });

    // The queue should be processing now
    expect(queue.processing).toBe(true);

    // Wait for the task to complete
    await promise;

    // Small delay to allow queue processing to complete
    await delay(10);

    // The queue should not be processing anymore
    expect(queue.processing).toBe(false);
  });

  it("should process a large number of tasks sequentially", async () => {
    const results: number[] = [];
    const taskCount = 50;

    // Create and enqueue many tasks
    const promises = Array.from({ length: taskCount }, (_, i) => {
      return queue.enqueue(async () => {
        results.push(i);
        return i;
      });
    });

    // Wait for all tasks to complete
    await Promise.all(promises);

    // All tasks should have been processed in order
    expect(results).toEqual(Array.from({ length: taskCount }, (_, i) => i));
    expect(queue.length).toBe(0);
    expect(queue.processing).toBe(false);
  });

  it("should handle nested queue operations", async () => {
    const results: string[] = [];

    // Enqueue a task that itself enqueues more tasks
    await queue.enqueue(async () => {
      results.push("parent-start");

      // Enqueue child tasks from within this task
      await queue.enqueue(async () => {
        results.push("child-1");
      });

      await queue.enqueue(async () => {
        results.push("child-2");
      });

      results.push("parent-end");
      return "parent-done";
    });

    // The expected order is: parent-start, parent-end, child-1, child-2
    // This is because nested enqueues are added to the queue but the parent task completes first
    expect(results).toEqual(["parent-start", "parent-end", "child-1", "child-2"]);
  });

  it("should correctly report the number of waiting tasks", async () => {
    expect(queue.waitingCount).toBe(0);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Add a long-running task
    const longTask = queue.enqueue(async () => {
      await delay(50);
      return "done";
    });

    // Since one task is running, waitingCount should be 0
    expect(queue.length).toBe(1);
    expect(queue.waitingCount).toBe(0);

    // Add more tasks that will wait
    queue.enqueue(async () => "task2");
    queue.enqueue(async () => "task3");

    // Now we have 1 running + 2 waiting
    expect(queue.length).toBe(3);
    expect(queue.waitingCount).toBe(2);

    // Wait for all tasks to complete
    await longTask;

    // Small delay to allow internal queue processing to complete
    await delay(60);

    // Queue should be empty now
    expect(queue.length).toBe(0);
    expect(queue.waitingCount).toBe(0);
  });
}); 