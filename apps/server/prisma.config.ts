import { defineConfig } from "prisma/config";
import { loadPrismaEnv } from "./prisma/load-env.cjs";

// 仅加载当前服务的本地配置，不向上搜索仓库或继承其他环境的凭据。
// Node 22 / 24 原生支持 env 文件，已有进程变量（包括 CI 注入值）优先。
loadPrismaEnv(__dirname);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
});
