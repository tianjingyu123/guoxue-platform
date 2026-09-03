const { loadEnvFile } = require("node:process");
const { join } = require("node:path");

/** 配置路径固定在服务目录；不读取 .env.production，不覆盖外部注入值。 */
function loadPrismaEnv(serviceDirectory, load = loadEnvFile) {
  for (const relative of [".env", "prisma/.env"]) {
    try {
      load(join(serviceDirectory, relative));
    } catch (error) {
      // 构建镜像不包含 env 文件；缺失可跳过，权限或语法错误必须暴露。
      if (error.code !== "ENOENT") throw error;
    }
  }
}

module.exports = { loadPrismaEnv };
