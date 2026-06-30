// B2-1: crypto.util.ts —— decrypt 区分「明文旧数据」与「密钥错配」+ 新增启动自检
// 用精确锚点替换，命中数不符即报错退出，绝不盲改。
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "common", "crypto.util.ts");
let src = fs.readFileSync(file, "utf8");

const oldDecrypt = `export function decrypt(ciphertext: string): string {
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    // 解密失败时返回原文（兼容明文存储的旧数据）
    process.stderr.write(\`[Crypto] 数据解密失败: \${(err as Error).message}\\n\`);
    return ciphertext;
  }
}`;

const newDecrypt = `export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  const buf = Buffer.from(ciphertext, "base64");
  // 长度不足以构成 IV+密文+TAG，判定为明文旧数据（灰度期兼容），原样返回
  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) return ciphertext;
  try {
    const key = getKey();
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    // 密文结构完整却解密失败 = ENCRYPTION_KEY 错配 / 数据损坏：fail-loud 暴露，
    // 不再静默返回 base64 乱码（避免脏数据回显用户或写回库）。
    process.stderr.write(\`[Crypto] 密文解密失败（疑似 ENCRYPTION_KEY 错配或数据损坏）: \${(err as Error).message}\\n\`);
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "数据解密失败，请检查 ENCRYPTION_KEY 配置");
  }
}`;

const selfTest = `
/**
 * 启动期加密自检：验证 ENCRYPTION_KEY 长度有效且 encrypt→decrypt 往返一致。
 * 服务启动时调用，把「密钥长度无效/配错」从「首次加密请求 500」提前为「拒绝启动」（fail-fast）。
 */
export function assertCryptoHealthy(): void {
  const probe = "healthcheck:" + randomBytes(8).toString("hex");
  let round: string;
  try {
    round = decrypt(encrypt(probe));
  } catch (err) {
    throw new Error(\`[Crypto] 启动自检失败：\${(err as Error).message}\`);
  }
  if (round !== probe) {
    throw new Error("[Crypto] 启动自检失败：encrypt→decrypt 往返结果不一致，ENCRYPTION_KEY 可能配错");
  }
}
`;

// 1) 替换 decrypt
const c1 = src.split(oldDecrypt).length - 1;
if (c1 !== 1) {
  console.error(`FAIL: decrypt 锚点命中 ${c1} 次（应为 1），中止`);
  process.exit(1);
}
src = src.replace(oldDecrypt, newDecrypt);

// 2) 防重复追加自检
if (src.includes("export function assertCryptoHealthy")) {
  console.error("FAIL: assertCryptoHealthy 已存在，中止");
  process.exit(1);
}
src = src.trimEnd() + "\n" + selfTest;

fs.writeFileSync(file, src, "utf8");
console.log("OK: crypto.util.ts decrypt 已改造 + assertCryptoHealthy 已追加");
