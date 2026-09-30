import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*(\\.spec|e2e-spec)\\.ts$",
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/.backup/**", "!src/.backup/**"],
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
  maxWorkers: "50%",
  // 长流水线中每个套件结束后回收高内存 worker，避免测试桩累积撑满 Node 堆。
  workerIdleMemoryLimit: "768MB",
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
    "packages[\\\\/](?:shared|bazi-engine|ziwei-engine)[\\\\/]dist[\\\\/]",
    "node_modules/(?!.*(bullmq|msgpackr|@guoxue/shared)/)",
  ],
  moduleNameMapper: {
    // 用 require.resolve 动态查找，避免硬编码 pnpm 版本号
    "^@prisma/client$": require.resolve("@prisma/client"),
    "^bcryptjs$": "<rootDir>/../../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs",
    "^@guoxue/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
};

export default config;
