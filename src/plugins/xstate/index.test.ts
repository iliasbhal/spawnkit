import * as Spawnkit from "../../../src";
import * as x from "xstate";
import { baseRedisAdapters } from "../../../src/adapters/redis/base";

describe("XState Machine Integration", () => {

  describe.only("Toggle Machine", () => {
    // Create state machine instances
    class ToggleMachine extends Spawnkit.Instance {
      // Collection to store the snapshot history for testing
      snapshotHistory: Array<{ actorId: string; snapshot: any }> = [];

      machine = new Spawnkit.Plugins.Machine({
        id: 'toggle-machine',
        machine: x.createMachine({
          initial: "TRUE",
          meta: {
            kind: "toggle",
          },
          states: {
            TRUE: {
              on: {
                TOGGLE: "FALSE",
              },
            },
            FALSE: {
              on: {
                TOGGLE: "TRUE",
              },
            },
          },
        }),
        onSnapshot: (data) => {
          // Store snapshots for verification in tests
          this.snapshotHistory.push(data);
          console.log(`Snapshot received for actor ${data.actorId}:`, data.snapshot);
        }
      });

      async toggle() {
        return this.machine.send({ type: 'TOGGLE' });
      }

      async getSnapshot() {
        return this.machine.getSnapshot();
      }

      // Get all the snapshots that have been collected
      async getSnapshotHistory() {
        return this.snapshotHistory;
      }
    }

    const client = Spawnkit.Client.from({
      adapters: baseRedisAdapters,
      instances: {
        ToggleMachine,
      },
    });

    client.start();

    it("should toggle state and record snapshots", async () => {
      const instance = client.spawn('ToggleMachine', 'toggle-test');

      // Initial state should be TRUE
      let snapshot = await instance.getSnapshot();
      console.log('snapshot', snapshot);
      expect(snapshot.value).toBe('TRUE');

      // After toggle, should be FALSE
      const result = await instance.toggle();
      console.log("result", result);
      snapshot = await instance.getSnapshot();
      expect(snapshot.value).toBe('FALSE');

      // After another toggle, should be TRUE again
      await instance.toggle();
      snapshot = await instance.getSnapshot();
      expect(snapshot.value).toBe('TRUE');

      // Check that snapshots were recorded
      const history = await instance.getSnapshotHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].snapshot).toBeDefined();
    });
  });

  describe("Invoke Machines", () => {
    // Mocks for invoke machine tests
    const stubs = {
      sync: jest.fn(),
      invokeResolve: jest.fn().mockResolvedValue(true),
      invokeReject: jest.fn().mockRejectedValue(new Error("Test error")),
      delayedInvoke: jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 100);
        });
      }),
    };


    beforeEach(() => {
      Object.values(stubs).forEach((stub) => {
        stub.mockClear();
      });
    });

    // Helper to create invoke machines
    const createInvokeMachine = (config: {
      invoke: () => Promise<any>;
    }): x.AnyStateMachine => {
      return x
        .setup({
          actors: {
            ppp: x.fromPromise(config.invoke),
          },
        })
        .createMachine({
          meta: {
            kind: "invoke-machine",
          },
          initial: "LOADING",
          states: {
            LOADING: {
              invoke: {
                onDone: "COMPLETED",
                onError: "ERRORED",
                src: "ppp",
              },
            },
            COMPLETED: {
              type: "final",
            },
            ERRORED: {
              type: "final",
            },
          },
        });
    };

    class InvokeResolvedMachine extends Spawnkit.Instance {
      snapshotHistory: Array<{ actorId: string; snapshot: any }> = [];

      machine = new Spawnkit.Plugins.Machine({
        machine: createInvokeMachine({
          invoke: stubs.invokeResolve,
        }),
        onSnapshot: (data) => {
          this.snapshotHistory.push(data);
        }
      });

      async start() {
        return this.machine.send({ type: 'START' });
      }

      async getSnapshot() {
        return this.machine.getSnapshot();
      }

      async getSnapshotHistory() {
        return this.snapshotHistory;
      }
    }

    class InvokeRejectedMachine extends Spawnkit.Instance {
      snapshotHistory: Array<{ actorId: string; snapshot: any }> = [];

      machine = new Spawnkit.Plugins.Machine({
        machine: createInvokeMachine({
          invoke: stubs.invokeReject,
        }),
        onSnapshot: (data) => {
          this.snapshotHistory.push(data);
        }
      });

      async start() {
        return this.machine.send({ type: 'START' });
      }

      async getSnapshot() {
        return this.machine.getSnapshot();
      }

      async getSnapshotHistory() {
        return this.snapshotHistory;
      }
    }

    class DelayedInvokeMachine extends Spawnkit.Instance {
      snapshotHistory: Array<{ actorId: string; snapshot: any }> = [];

      machine = new Spawnkit.Plugins.Machine({
        machine: createInvokeMachine({
          invoke: stubs.delayedInvoke,
        }),
        onSnapshot: (data) => {
          this.snapshotHistory.push(data);
        }
      });

      async start() {
        return this.machine.send({ type: 'START' });
      }

      async getSnapshot() {
        return this.machine.getSnapshot();
      }

      async getSnapshotHistory() {
        return this.snapshotHistory;
      }
    }

    // Set up client
    const client = Spawnkit.Client.from({
      adapters: baseRedisAdapters,
      instances: {
        InvokeResolvedMachine,
        InvokeRejectedMachine,
        DelayedInvokeMachine
      },
    });

    client.start();

    it("should resolve successfully and record snapshots", async () => {
      const instance = client.spawn('InvokeResolvedMachine', 'invoke-resolve-test');

      await instance.start();
      const snapshot = await instance.getSnapshot();

      expect(stubs.invokeResolve).toHaveBeenCalled();
      expect(snapshot.value).toBe('COMPLETED');

      // Check that snapshots were recorded
      const history = await instance.getSnapshotHistory();
      expect(history.length).toBeGreaterThan(0);
      // The last snapshot should be COMPLETED state
      expect(history[history.length - 1].snapshot.value).toBe('COMPLETED');
    });

    it("should handle rejection and record error snapshots", async () => {
      const instance = client.spawn('InvokeRejectedMachine', 'invoke-reject-test');

      await instance.start();
      const snapshot = await instance.getSnapshot();

      expect(stubs.invokeReject).toHaveBeenCalled();
      expect(snapshot.value).toBe('ERRORED');

      // Check that snapshots were recorded
      const history = await instance.getSnapshotHistory();
      expect(history.length).toBeGreaterThan(0);
      // The last snapshot should be ERRORED state
      expect(history[history.length - 1].snapshot.value).toBe('ERRORED');
    });

    it("should handle delayed invocations and record snapshots", async () => {
      const instance = client.spawn('DelayedInvokeMachine', 'invoke-delayed-test');

      await instance.start();
      const snapshot = await instance.getSnapshot();

      expect(stubs.delayedInvoke).toHaveBeenCalled();
      expect(snapshot.value).toBe('COMPLETED');

      // Check that snapshots were recorded
      const history = await instance.getSnapshotHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  // describe("Machine initialization", () => {
  //   // Create state machine instances
  //   class ExampleMachine extends Spawnkit.Instance {
  //     // Collection to store the snapshot history for testing
  //     snapshotHistory: Array<{ actorId: string; snapshot: any }> = [];

  //     machine = new Spawnkit.Plugins.Machine({
  //       machine: x.createMachine({
  //         initial: "TRUE",
  //         meta: {
  //           kind: "toggle",
  //         },
  //         states: {
  //           TRUE: {
  //             on: {
  //               TOGGLE: "FALSE",
  //             },
  //           },
  //           FALSE: {
  //             on: {
  //               TOGGLE: "TRUE",
  //             },
  //           },
  //         },
  //       }),
  //       onSnapshot: (data) => {
  //         // Store snapshots for verification in tests
  //         this.snapshotHistory.push(data);
  //         console.log(`Snapshot received for actor ${data.actorId}:`, data.snapshot);
  //       }
  //     });

  //     async send(event: any) {
  //       return this.machine.send(event);
  //     }

  //     async getSnapshot() {
  //       return this.machine.getSnapshot();
  //     }

  //     // Get all the snapshots that have been collected
  //     async getSnapshotHistory() {
  //       return this.snapshotHistory;
  //     }
  //   }


  //   it("should initialize the machine on first getSnapshot call", async () => {
  //     const instance = client.spawn('ToggleMachine', 'init-test');

  //     // Machine should initialize when getSnapshot is called
  //     const snapshot = await instance.getSnapshot();
  //     expect(snapshot).toBeDefined();
  //     expect(snapshot.value).toBe('TRUE');

  //     // The machine should be initialized and ready for events
  //     await instance.toggle();
  //     const updatedSnapshot = await instance.getSnapshot();
  //     expect(updatedSnapshot.value).toBe('FALSE');
  //   });

  //   it("should handle concurrent initialization requests correctly", async () => {
  //     const instance = client.spawn('ToggleMachine', 'concurrent-init-test');

  //     // Call getSnapshot multiple times concurrently
  //     const results = await Promise.all([
  //       instance.getSnapshot(),
  //       instance.getSnapshot(),
  //       instance.getSnapshot(),
  //       instance.getSnapshot()
  //     ]);

  //     // All calls should return the same state
  //     results.forEach(snapshot => {
  //       expect(snapshot).toBeDefined();
  //       expect(snapshot.value).toBe('TRUE');
  //     });

  //     // After toggling, all concurrent getSnapshot calls should see the updated state
  //     await instance.toggle();

  //     const updatedResults = await Promise.all([
  //       instance.getSnapshot(),
  //       instance.getSnapshot(),
  //       instance.getSnapshot()
  //     ]);

  //     updatedResults.forEach(snapshot => {
  //       expect(snapshot.value).toBe('FALSE');
  //     });
  //   });

  //   it("should handle send and getSnapshot calls concurrently", async () => {
  //     const instance = client.spawn('ToggleMachine', 'mixed-concurrent-test');

  //     // Trigger both a send and getSnapshot concurrently on an uninitialized machine
  //     const [sendResult, getResult] = await Promise.all([
  //       instance.toggle(),
  //       instance.getSnapshot()
  //     ]);

  //     // Both operations should complete successfully
  //     expect(sendResult).toBeDefined();
  //     expect(getResult).toBeDefined();

  //     // The machine should be in the FALSE state after the toggle
  //     expect(sendResult.value).toBe('FALSE');

  //     // Both should see the same state (since toggle is applied)
  //     expect(getResult.value).toBe('FALSE');
  //   });
  // });
}); 