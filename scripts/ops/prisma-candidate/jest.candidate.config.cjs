/**
 * 候选侧 jest 配置。**不修改 apps/server/jest.config.ts**，在它之上只覆盖两处：
 *   · moduleNameMapper 的 `@prisma/client` → 独立生成的候选客户端
 *   · ts-jest 的 tsconfig → tsconfig.candidate.json（同样指向候选客户端）
 *
 * 基础配置是 require 进来的而不是抄一份，避免两边漂移：上游改了 setupFiles、
 * transformIgnorePatterns 之类，这里自动跟着走。
 *
 * 用法（在 apps/server 下）：
 *   npx jest -c ../../scripts/ops/prisma-candidate/jest.candidate.config.cjs --testPathPattern "..."
 */

const path = require("node:path");
const fs = require("node:fs");

const SERVER_DIR = path.resolve(__dirname, "../../../apps/server");
const CANDIDATE_CLIENT = path.join(SERVER_DIR, ".prisma-candidate", "client");
const CANDIDATE_TSCONFIG = path.join(__dirname, "tsconfig.candidate.json");

if (!fs.existsSync(path.join(CANDIDATE_CLIENT, "index.js"))) {
  throw new Error(
    `候选 Prisma 客户端不存在：${CANDIDATE_CLIENT}\n` +
      "请先运行：node scripts/ops/prisma-candidate/generate.mjs",
  );
}

// 基础配置是 TS，先挂 ts-node 才能 require
require(path.join(SERVER_DIR, "node_modules", "ts-node")).register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", target: "es2022" },
});
const base = require(path.join(SERVER_DIR, "jest.config.ts")).default;

module.exports = {
  ...base,
  // 基础配置里的 rootDir 是 "."，相对它自己所在目录；本文件换了目录，必须显式指回去
  rootDir: SERVER_DIR,
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: CANDIDATE_TSCONFIG }],
  },
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^@prisma/client$": CANDIDATE_CLIENT,
    "^\\.prisma/client$": CANDIDATE_CLIENT,
  },
  // 候选验证不看覆盖率门槛（只跑受客户端形态影响的子集，覆盖率必然不达标）
  coverageThreshold: undefined,
  reporters: ["default"],
};
