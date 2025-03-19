import * as Spawnkit from '../src';
import * as x from 'xstate';


export const main = async () => {
  const machine = new Spawnkit.Plugins.Machine({
    machine: x.createMachine({
      initial: "TRUE",
      states: {
        TRUE: {},
      },
    }),
  });

  console.log(machine);
};
