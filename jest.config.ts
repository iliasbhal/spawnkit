import { JestConfigWithTsJest } from "ts-jest";

const esModules = ["superjson", "nanoid"].join("|");

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: "node",
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  moduleNameMapper: {
    "@/(.*)$": "<rootDir>/src/$1",
  },
};


export default jestConfig;
