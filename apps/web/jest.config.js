const fs = require("node:fs");
const path = require("node:path");
const nextJest = require("next/jest");

const localTmpDir = path.join(__dirname, ".jest-tmp");
fs.mkdirSync(localTmpDir, { recursive: true });
process.env.TMPDIR = localTmpDir;
process.env.TMP = localTmpDir;
process.env.TEMP = localTmpDir;

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  cacheDirectory: "<rootDir>/.jest-cache",
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
