const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@glide/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@glide/shared$": "<rootDir>/../../packages/shared/src/index.ts"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.[jt]s?(x)"],
  testEnvironment: "jsdom"
};

module.exports = createJestConfig(customJestConfig);
