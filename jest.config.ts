import { JestConfigWithTsJest } from "ts-jest";

const esModules = ["superjson", "nanoid"].join("|");

const jestConfig: JestConfigWithTsJest = {
	preset: "ts-jest",

	testEnvironment: "node",
	transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
	moduleNameMapper: {
		"@/(.*)$": "<rootDir>/src/$1",
	},
	transform: {
		"^.+\\.jsx?$": "babel-jest",
		"^.+\\.tsx?$": "ts-jest",
	},
};

export default jestConfig;
