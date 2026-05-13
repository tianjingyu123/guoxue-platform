import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*(\\.spec|e2e-spec)\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!src/**/*.spec.ts", "!src/**/.backup/**", "!src/.backup/**"],
  coveragePathIgnorePatterns: [".backup"],
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 75,
      functions: 60,
      lines: 55,
    },
  },
  maxWorkers: 1,
  coverageProvider: "v8",
  testPathIgnorePatterns: ["<rootDir>/.backup/", ".backup/"],
  testEnvironment: "node",
  setupFiles: ["./test/jest-setup.ts"],
  reporters: [
    "default",
    ["jest-junit", {
      outputDirectory: ".",
      outputName: "junit.xml",
      suiteName: "guoxue-server-unit",
      classNameTemplate: "{filepath}",
      titleTemplate: "{title}",
    }],
  ],
  transformIgnorePatterns: [
    "node_modules/(?!.*(bullmq|msgpackr)/)",
  ],
  moduleNameMapper: {
    "^@prisma/client$": "<rootDir>/../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client",
    "^bcryptjs$": "<rootDir>/../../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs",
  },
};

export default config;
