module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/src"],
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@glide/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@glide/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^react$": "<rootDir>/../../node_modules/react-native/node_modules/react",
    "^react/jsx-runtime$": "<rootDir>/../../node_modules/react-native/node_modules/react/jsx-runtime.js",
    "^react/jsx-dev-runtime$": "<rootDir>/../../node_modules/react-native/node_modules/react/jsx-dev-runtime.js"
  }
};
