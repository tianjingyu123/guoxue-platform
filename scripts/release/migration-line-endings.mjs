/** 已执行 Prisma 迁移的字节不可因 Windows 检出方式而改变。 */
export function assertMigrationSqlLineEndings(relativePath, bytes) {
  if (!/^apps\/server\/prisma\/migrations\/[^/]+\/migration\.sql$/u.test(relativePath)) return;
  if (bytes.includes(Buffer.from("\r\n"))) {
    throw new Error(`迁移 SQL 含 CRLF，拒绝制作固定包：${relativePath}`);
  }
}
