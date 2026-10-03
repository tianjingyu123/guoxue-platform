# 热卜国学平台 — 数据迁移校验方案

> 更新时间：2026-05-11 | 目标：旧平台 → 新平台零丢失、零错误

## 一、迁移策略概述

```
旧平台数据库 (source)              新平台数据库 (target)
     │                                    │
     ├─ Phase 1: 结构迁移 ────────────────┤
     │   Schema DDL diff → 补全缺失表/列   │
     │                                    │
     ├─ Phase 2: 全量迁移 ────────────────┤
     │   COPY/INSERT 批量写入              │
     │                                    │
     ├─ Phase 3: 增量同步 ────────────────┤
     │   监听 change log → 追平增量        │
     │                                    │
     └─ Phase 4: 校验 ────────────────────┤
         行数 / Checksum / 抽样 / 业务规则  │
                                          │
                                     ✅ 切换流量
```

## 二、迁移前 Schema 校验

### 2.1 表结构对比脚本

```sql
-- 对比旧平台与新平台的表清单差异
-- 在旧平台执行
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 在新平台执行（对比输出）
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 2.2 列差异检测

```sql
-- 对比指定表的列差异
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
ORDER BY ordinal_position;
```

### 2.3 Prisma 迁移状态与数据库证据校验

固定发布包不携带宿主机 `node_modules`，生产服务器不得临时执行 `npx prisma`，也不得用 `prisma db pull --force` 改写发布包。统一通过实际生产 `server` 镜像检查迁移状态，并由只读核验脚本生成脱敏机器证据：

```bash
export TARGET_DATABASE_URL='由受控凭据注入，不写入文档或命令历史'
export TARGET_RELEASE_ID='<本次固定发布标识>'
export PRISMA_COMPOSE_ENV_FILE=/opt/guoxue/shared/.env.production

bash scripts/migration/run-prisma-migrations.sh status
bash scripts/migration/verify-postgres.sh
```

只有逐表计数、核心业务完整性和 `prisma migrate status` 全部通过，核验报告才会写入 `prismaMigrationStatusPassed: true`。

## 三、数据完整性校验

### 3.1 全表行数校验脚本

```sql
-- 生成全表行数校验 SQL
-- 在旧平台和新平台分别执行，对比输出
WITH tables AS (
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations')
)
SELECT 
    'SELECT ''' || tablename || ''' AS table_name, COUNT(*) AS row_count FROM "' || tablename || '" UNION ALL'
FROM tables;
```

### 3.2 TypeScript 自动化校验脚本

```typescript
// scripts/data-validator.ts — 数据迁移完整性校验
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

interface ValidationResult {
  table: string;
  sourceRows: number;
  targetRows: number;
  match: boolean;
  diff?: number;
  checksumMatch?: boolean;
}

interface ValidationReport {
  timestamp: Date;
  totalTables: number;
  passedTables: number;
  failedTables: number;
  totalSourceRows: number;
  totalTargetRows: number;
  details: ValidationResult[];
}

class DataMigrationValidator {
  private sourceDb: PrismaClient;
  private targetDb: PrismaClient;
  private results: ValidationResult[] = [];

  constructor(sourceUrl: string, targetUrl: string) {
    this.sourceDb = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
    this.targetDb = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  }

  /** 行数校验 */
  async validateRowCount(tableName: string): Promise<ValidationResult> {
    const sourceRows = await this.sourceDb.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const targetRows = await this.targetDb.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );

    const sCount = Number(sourceRows[0].count);
    const tCount = Number(targetRows[0].count);

    return {
      table: tableName,
      sourceRows: sCount,
      targetRows: tCount,
      match: sCount === tCount,
      diff: tCount - sCount,
    };
  }

  /** 主键抽样校验 */
  async validateSampleIds(tableName: string, pkColumn: string, sampleSize = 100): Promise<string[]> {
    const sourceIds = await this.sourceDb.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "${pkColumn}" as id FROM "${tableName}" ORDER BY RANDOM() LIMIT ${sampleSize}`
    );
    const missing: string[] = [];

    for (const row of sourceIds) {
      const exists = await this.targetDb.$queryRawUnsafe<Array<{ c: bigint }>>(
        `SELECT COUNT(*) as c FROM "${tableName}" WHERE "${pkColumn}" = '${row.id}'`
      );
      if (Number(exists[0].c) === 0) {
        missing.push(row.id);
      }
    }
    return missing;
  }

  /** 行级 Checksum 校验（抽样关键表） */
  async validateChecksum(tableName: string): Promise<boolean> {
    // PostgreSQL 行级 checksum
    const sourceHash = await this.sourceDb.$queryRawUnsafe<[{ hash: string }]>(
      `SELECT MD5(STRING_AGG(row_hash, '' ORDER BY row_hash)) as hash
       FROM (SELECT MD5(ROW("${tableName}")::TEXT) as row_hash FROM "${tableName}" ORDER BY ctid LIMIT 10000) t`
    );
    const targetHash = await this.targetDb.$queryRawUnsafe<[{ hash: string }]>(
      `SELECT MD5(STRING_AGG(row_hash, '' ORDER BY row_hash)) as hash
       FROM (SELECT MD5(ROW("${tableName}")::TEXT) as row_hash FROM "${tableName}" ORDER BY ctid LIMIT 10000) t`
    );
    return sourceHash[0].hash === targetHash[0].hash;
  }

  /** 全量校验 */
  async validateAll(): Promise<ValidationReport> {
    const tables = await this.getTableList();
    let totalSourceRows = 0;
    let totalTargetRows = 0;

    for (const table of tables) {
      console.log(`校验中: ${table}...`);
      const result = await this.validateRowCount(table);
      this.results.push(result);
      totalSourceRows += result.sourceRows;
      totalTargetRows += result.targetRows;
    }

    const passedTables = this.results.filter((r) => r.match).length;
    const failedTables = this.results.filter((r) => !r.match).length;

    return {
      timestamp: new Date(),
      totalTables: tables.length,
      passedTables,
      failedTables,
      totalSourceRows,
      totalTargetRows,
      details: this.results,
    };
  }

  /** 针对核心表的深度校验 */
  async deepValidate(): Promise<void> {
    const coreTables: Array<{ table: string; pk: string; checksum: boolean }> = [
      { table: "User", pk: "id", checksum: true },
      { table: "Order", pk: "id", checksum: true },
      { table: "VirtualCoinAccount", pk: "id", checksum: true },
      { table: "VirtualCoinTransaction", pk: "id", checksum: false },
      { table: "PaipanRecord", pk: "id", checksum: false },
      { table: "Station", pk: "id", checksum: true },
      { table: "Circle", pk: "id", checksum: false },
      { table: "Course", pk: "id", checksum: false },
      { table: "Product", pk: "id", checksum: false },
    ];

    console.log("\n=== 核心表深度校验 ===\n");
    for (const { table, pk, checksum } of coreTables) {
      console.log(`\n--- ${table} ---`);

      // 行数
      const result = await this.validateRowCount(table);
      console.log(`行数: ${result.sourceRows} → ${result.targetRows} ${result.match ? "✅" : "❌"}`);

      // 主键抽样
      const missing = await this.validateSampleIds(table, pk, 50);
      if (missing.length > 0) {
        console.log(`❌ 缺失主键: ${missing.join(", ")}`);
      } else {
        console.log("主键抽样: ✅");
      }

      // Checksum
      if (checksum) {
        const checksumMatch = await this.validateChecksum(table);
        console.log(`Checksum: ${checksumMatch ? "✅" : "❌"}`);
      }

      if (!result.match || missing.length > 0) {
        console.log("⚠️  需要人工审查");
      }
    }
  }

  /** 业务规则校验 */
  async validateBusinessRules(): Promise<void> {
    console.log("\n=== 业务规则校验 ===\n");

    // 1. 用户余额总和一致性
    const srcBalance = await this.sourceDb.$queryRawUnsafe<[{ sum: bigint }]>(
      'SELECT COALESCE(SUM(balance), 0) as sum FROM "VirtualCoinAccount"'
    );
    const tgtBalance = await this.targetDb.$queryRawUnsafe<[{ sum: bigint }]>(
      'SELECT COALESCE(SUM(balance), 0) as sum FROM "VirtualCoinAccount"'
    );
    console.log(`虚拟币余额总和: ${srcBalance[0].sum} → ${tgtBalance[0].sum} ${srcBalance[0].sum === tgtBalance[0].sum ? "✅" : "❌"}`);

    // 2. 订单金额一致性
    const srcOrderAmt = await this.sourceDb.$queryRawUnsafe<[{ sum: unknown }]>(
      'SELECT COALESCE(SUM(amount), 0) as sum FROM "Order" WHERE status = \'PAID\''
    );
    const tgtOrderAmt = await this.targetDb.$queryRawUnsafe<[{ sum: unknown }]>(
      'SELECT COALESCE(SUM(amount), 0) as sum FROM "Order" WHERE status = \'PAID\''
    );
    console.log(`已支付订单总额: ${srcOrderAmt[0].sum} → ${tgtOrderAmt[0].sum} ${srcOrderAmt[0].sum === tgtOrderAmt[0].sum ? "✅" : "❌"}`);

    // 3. 分站收益一致性
    const srcStationEarning = await this.sourceDb.$queryRawUnsafe<[{ sum: unknown }]>(
      'SELECT COALESCE(SUM(earned), 0) as sum FROM "StationEarning"'
    );
    const tgtStationEarning = await this.targetDb.$queryRawUnsafe<[{ sum: unknown }]>(
      'SELECT COALESCE(SUM(earned), 0) as sum FROM "StationEarning"'
    );
    console.log(`分站收益总和: ${srcStationEarning[0].sum} → ${tgtStationEarning[0].sum} ${srcStationEarning[0].sum === tgtStationEarning[0].sum ? "✅" : "❌"}`);

    // 4. 外键完整性
    console.log("\n外键完整性检查:");
    const fkChecks = [
      { name: "Auth→User", sql: 'SELECT COUNT(*) as c FROM "Auth" a LEFT JOIN "User" u ON a."userId" = u.id WHERE u.id IS NULL' },
      { name: "Order→User", sql: 'SELECT COUNT(*) as c FROM "Order" o LEFT JOIN "User" u ON o."userId" = u.id WHERE u.id IS NULL' },
      { name: "Circle→User", sql: 'SELECT COUNT(*) as c FROM "Circle" c LEFT JOIN "User" u ON c."ownerId" = u.id WHERE u.id IS NULL' },
      { name: "Station→User", sql: 'SELECT COUNT(*) as c FROM "Station" s LEFT JOIN "User" u ON s."userId" = u.id WHERE u.id IS NULL' },
    ];

    for (const check of fkChecks) {
      const result = await this.targetDb.$queryRawUnsafe<[{ c: bigint }]>(check.sql);
      const broken = Number(result[0].c);
      console.log(`${check.name}: ${broken === 0 ? "✅" : `❌ ${broken} 条孤立记录`}`);
    }
  }

  private async getTableList(): Promise<string[]> {
    const tables = await this.sourceDb.$queryRawUnsafe<Array<{ tablename: string }>>(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'"
    );
    return tables.map((t) => t.tablename).sort();
  }

  /** 生成校验报告 */
  generateReport(report: ValidationReport): string {
    const lines: string[] = [
      "# 数据迁移校验报告",
      `> 校验时间: ${report.timestamp.toISOString()}`,
      "",
      "## 概览",
      `| 指标 | 数值 |`,
      `|------|------|`,
      `| 总表数 | ${report.totalTables} |`,
      `| 通过 | ${report.passedTables} ✅ |`,
      `| 失败 | ${report.failedTables} ❌ |`,
      `| 源库总行数 | ${report.totalSourceRows.toLocaleString()} |`,
      `| 目标库总行数 | ${report.totalTargetRows.toLocaleString()} |`,
      "",
      "## 明细",
      "",
      "| 表名 | 源行数 | 目标行数 | 差异 | 状态 |",
      "|------|--------|---------|------|------|",
    ];

    for (const detail of report.details) {
      lines.push(`| ${detail.table} | ${detail.sourceRows.toLocaleString()} | ${detail.targetRows.toLocaleString()} | ${detail.diff || 0} | ${detail.match ? "✅" : "❌"} |`);
    }

    return lines.join("\n");
  }
}

// 使用示例：
// const validator = new DataMigrationValidator(
//   process.env.SOURCE_DATABASE_URL!,
//   process.env.TARGET_DATABASE_URL!
// );
// const report = await validator.validateAll();
// await validator.deepValidate();
// await validator.validateBusinessRules();
// console.log(validator.generateReport(report));
```

## 四、核心表校验清单

### 4.1 用户相关（零容忍）

| 表 | 校验方式 | 优先级 |
|----|---------|--------|
| `User` | 行数 + ID 抽样 + Checksum | P0 |
| `Auth` | 行数 + userId 外键完整性 | P0 |
| `UserRole` | 行数 + roleType 分布对比 | P0 |
| `VirtualCoinAccount` | 行数 + 余额总和一致 | P0 |
| `VirtualCoinTransaction` | 行数 + 按 userId 汇总余额 | P0 |

### 4.2 交易相关（零容忍）

| 表 | 校验方式 | 优先级 |
|----|---------|--------|
| `Order` | 行数 + 金额总和一致 + payTransactionId 去重 | P0 |
| `Coupon` | 行数 + usedCount ≤ totalCount | P0 |
| `Withdrawal` | 行数 + 金额总和一致 | P0 |
| `Invoice` | 行数校验 | P1 |

### 4.3 内容相关（容忍 <0.1% 偏差）

| 表 | 校验方式 | 优先级 |
|----|---------|--------|
| `Content` | 行数 + 抽样 | P1 |
| `Article` | 行数 + circleId 分布对比 | P1 |
| `Course` | 行数 + studentCount 合理性 | P1 |
| `Product` | 行数 + stock ≥ 0 | P1 |
| `PaipanRecord` | 行数 + userId 分布对比 | P1 |

### 4.4 分站/分佣相关（零容忍）

| 表 | 校验方式 | 优先级 |
|----|---------|--------|
| `Station` | 行数 + totalEarning 总和 | P0 |
| `StationEarning` | 行数 + earned 总和 | P0 |
| `StationOffline` | 行数校验 | P1 |

### 4.5 圈子/互动（容忍 <0.5% 偏差）

| 表 | 校验方式 | 优先级 |
|----|---------|--------|
| `Circle` | 行数 + memberCount 与实际 CircleMember 数量对比 | P1 |
| `CircleMember` | 行数 + 去重校验 | P1 |
| `Like` | 行数校验 | P2 |
| `Comment` | 行数校验 | P2 |
| `Collect` | 行数校验 | P2 |

## 五、增量同步校验

```bash
#!/bin/bash
# scripts/incremental-sync-check.sh — 增量同步追赶验证

SOURCE_DB="$1"
TARGET_DB="$2"

echo "=== 增量同步校验 ==="

# 1. 在源库记录当前最大时间戳
MAX_TS_SRC=$(psql "$SOURCE_DB" -t -c "SELECT MAX('updatedAt') FROM \"Order\";")
echo "源库最新 Order updatedAt: $MAX_TS_SRC"

# 2. 等待 10 秒确保增量同步追平
echo "等待增量同步追平..."
sleep 10

# 3. 在目标库检查是否已追平
MAX_TS_TGT=$(psql "$TARGET_DB" -t -c "SELECT MAX('updatedAt') FROM \"Order\";")
echo "目标库最新 Order updatedAt: $MAX_TS_TGT"

# 4. 对比差异
if [ "$MAX_TS_SRC" = "$MAX_TS_TGT" ]; then
  echo "✅ 增量同步已追平"
else
  echo "⚠️ 存在延迟，源=$MAX_TS_SRC, 目标=$MAX_TS_TGT"
fi

# 5. 最近10分钟的数据行数一致性
for table in "Order" "User" "VirtualCoinTransaction"; do
  SRC_COUNT=$(psql "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM \"$table\" WHERE \"createdAt\" > NOW() - INTERVAL '10 minutes';")
  TGT_COUNT=$(psql "$TARGET_DB" -t -c "SELECT COUNT(*) FROM \"$table\" WHERE \"createdAt\" > NOW() - INTERVAL '10 minutes';")
  if [ "$SRC_COUNT" = "$TGT_COUNT" ]; then
    echo "✅ $table (近10分钟): $SRC_COUNT = $TGT_COUNT"
  else
    echo "❌ $table (近10分钟): 源=$SRC_COUNT, 目标=$TGT_COUNT"
  fi
done
```

## 六、校验通过标准

| 级别 | 标准 | 阻断上线 |
|------|------|---------|
| **P0 校验** | 行数 100% 一致 + 金额总和一致 + 外键 0 孤立 + 主键抽样 0 缺失 | **是** |
| **P1 校验** | 行数 99.9% 一致 + 外键 <10 条孤立 | 否（记录 issue） |
| **P2 校验** | 行数 99.5% 一致 | 否（后续补齐） |

## 七、回滚校验

迁移后若需回滚，在回滚后执行反向校验：

```bash
#!/bin/bash
# 切换后若需要回滚，反向对比
# 将 source 和 target 交换
npx ts-node scripts/data-validator.ts --source="$TARGET_URL" --target="$SOURCE_URL"
```
