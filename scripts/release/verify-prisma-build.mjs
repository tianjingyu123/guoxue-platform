import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prisma生成时会重新排版；忽略注释和空白，但保留字符串内容及词元边界。
export function schemaFingerprint(text) {
  const tokens = text.match(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|\s+|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[^\s]/gu) || [];
  const semantic = tokens.filter((token) => !/^\s|^\/\/|^\/\*/u.test(token));
  return createHash("sha256").update(JSON.stringify(semantic)).digest("hex");
}

export function inspectPrismaBuild(serverDir) {
  const req = createRequire(path.join(path.resolve(serverDir), "package.json"));
  const wrapper = req.resolve("@prisma/client");
  const generated = createRequire(wrapper).resolve(".prisma/client/default");
  const sourceHash = schemaFingerprint(readFileSync(path.join(serverDir, "prisma/schema.prisma"), "utf8"));
  const generatedHash = schemaFingerprint(readFileSync(path.join(path.dirname(realpathSync(generated)), "schema.prisma"), "utf8"));
  if (sourceHash !== generatedHash) throw new Error("Prisma生成客户端与当前源码schema不一致，拒绝构建/运行包验收");
  const cliVersion = req("prisma/package.json").version;
  const clientVersion = req("@prisma/client/package.json").version;
  const generatedVersion = req("@prisma/client").Prisma?.prismaVersion?.client;
  if (!cliVersion || cliVersion !== clientVersion || clientVersion !== generatedVersion) {
    throw new Error("Prisma CLI、客户端依赖和实际生成客户端版本不一致");
  }
  return { schemaVersion: 1, kind: "prisma-build-binding", schemaHash: sourceHash, clientVersion };
}

export function assertReceipt(current, receipt) {
  if (JSON.stringify(current) !== JSON.stringify(receipt)) {
    throw new Error("Prisma运行包与编译前绑定记录不一致");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [serverDir, mode, receiptPath] = process.argv.slice(2);
    if (!serverDir || !["--write", "--verify"].includes(mode) || !receiptPath || process.argv.length !== 5) {
      throw new Error("用法：node verify-prisma-build.mjs <server目录> <--write|--verify> <绑定记录路径>");
    }
    const current = inspectPrismaBuild(serverDir);
    if (mode === "--write") writeFileSync(receiptPath, JSON.stringify(current, null, 2) + "\n");
    else assertReceipt(current, JSON.parse(readFileSync(receiptPath, "utf8")));
    console.log(`Prisma源码/生成客户端绑定通过：${current.clientVersion} ${current.schemaHash}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
