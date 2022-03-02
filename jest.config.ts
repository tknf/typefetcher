import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testMatch: ["**/*.(spec|test).[jt]s", "!**/*/dist/**/*", "!**/*/fixtures/**/*"],
  testPathIgnorePatterns: [],
  testTimeout: process.env.CI ? 30000 : 10000,
  watchPathIgnorePatterns: [],
  globals: {
    __DEV__: true,
    "ts-jest": {
      tsconfig: {
        esModuleInterop: true,
        lib: ["ESNext", "DOM"]
      }
    }
  }
};

export default config;
