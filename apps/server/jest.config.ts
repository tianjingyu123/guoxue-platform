import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "./coverage",
  maxWorkers: 1,
  testEnvironment: "node",
  moduleNameMapper: {
    "^@prisma/client$": "<rootDir>/../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client",
    "^bcryptjs$": "<rootDir>/../../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs",
  },
};

export default config;
