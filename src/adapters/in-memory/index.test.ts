import { generateTestSuite } from "../generateTestSuite";
import * as Spawnkit from '../../index';

generateTestSuite("InMemory Adapter / Core", createAdapterFactoryMock);

function createAdapterFactoryMock() {
  const adapters = Promise.resolve().then(async () => {
    const adapter = new Spawnkit.Adapters.InMemoryAdapter();
    return adapter;
  });

  return async () => {
    return await adapters;
  };
}
