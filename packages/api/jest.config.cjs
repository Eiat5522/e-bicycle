module.exports = {
  preset: "ts-jest/presets/default-esm",
  watchman: false,
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@glide/shared$": "<rootDir>/../shared/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
};
