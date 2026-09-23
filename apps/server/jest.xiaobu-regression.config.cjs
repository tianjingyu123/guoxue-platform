/**
 * 小卜语音回归专用：类型检查由 tsc 单独完成，Jest 只做逐文件转译与执行。
 * 避免 ts-jest 为每个测试进程建立整个服务端 TypeScript Program。
 */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*(\\.spec|e2e-spec)\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  setupFiles: ["./test/jest-setup.ts"],
  moduleNameMapper: {
    "^@prisma/client$": require.resolve("@prisma/client"),
    "^bcryptjs$": require.resolve("bcryptjs"),
    "^@guoxue/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.xiaobu-regression.json" }],
  },
  testPathIgnorePatterns: ["<rootDir>/.backup/", ".backup/"],
};
