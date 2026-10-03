/**
 * 只读统计历史排盘报告能否安全启用严格权益门禁。
 * 运行：DATABASE_URL=<只读数据库连接> pnpm exec ts-node scripts/audit-paipan-report-records.ts --run
 * 不自动读取 .env；只输出汇总计数，不输出用户、排盘、报告 ID 或正文。
 */
import { PrismaClient } from '@prisma/client';

const REPORT_TYPES = new Set(['general', 'career', 'love', 'wealth', 'health']);
const BATCH_SIZE = 100;

type Counters = {
  total: number;
  noPaipanRecordId: number;
  orphanPaipanRecord: number;
  ownerMismatch: number;
  invalidContentJson: number;
  missingMetadataType: number;
  inferredFromAnalyzeType: number;
  unresolvedType: number;
  unsupportedMetadataType: number;
  typeConflict: number;
  readyForStrictGate: number;
};

function emptyCounters(): Counters {
  return {
    total: 0,
    noPaipanRecordId: 0,
    orphanPaipanRecord: 0,
    ownerMismatch: 0,
    invalidContentJson: 0,
    missingMetadataType: 0,
    inferredFromAnalyzeType: 0,
    unresolvedType: 0,
    unsupportedMetadataType: 0,
    typeConflict: 0,
    readyForStrictGate: 0,
  };
}

function metadataType(content: string): { type: string; validJson: boolean } {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { type: '', validJson: false };
    }
    const metadata = (parsed as { metadata?: unknown }).metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return { type: '', validJson: true };
    }
    const value = (metadata as { reportType?: unknown }).reportType;
    return { type: typeof value === 'string' ? value : '', validJson: true };
  } catch {
    return { type: '', validJson: false };
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    process.stdout.write('用法：显式提供只读 DATABASE_URL，并运行 ts-node scripts/audit-paipan-report-records.ts --run\n');
    return;
  }
  if (!process.argv.includes('--run') || !process.env.DATABASE_URL) {
    throw new Error('需要 --run 和显式设置的只读 DATABASE_URL；不会自动读取 .env');
  }

  const prisma = new PrismaClient();
  const counts = emptyCounters();
  let cursor: string | undefined;
  try {
    while (true) {
      const reports = await prisma.aiAnalysisRecord.findMany({
        where: { scene: 'paipan_report' },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          userId: true,
          paipanRecordId: true,
          analyzeType: true,
          analysisContent: true,
        },
      });
      if (reports.length === 0) break;

      const ids = [...new Set(reports.map((report) => report.paipanRecordId).filter((id): id is string => !!id))];
      const paipanRecords = await prisma.paipanRecord.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true },
      });
      const owners = new Map(paipanRecords.map((record) => [record.id, record.userId]));

      for (const report of reports) {
        counts.total += 1;
        const noRecord = !report.paipanRecordId;
        const orphan = !!report.paipanRecordId && !owners.has(report.paipanRecordId);
        const wrongOwner = !!report.paipanRecordId && !!owners.get(report.paipanRecordId)
          && owners.get(report.paipanRecordId) !== report.userId;
        if (noRecord) counts.noPaipanRecordId += 1;
        if (orphan) counts.orphanPaipanRecord += 1;
        if (wrongOwner) counts.ownerMismatch += 1;

        const metadata = metadataType(report.analysisContent);
        const inferred = report.analyzeType.startsWith('REPORT_')
          ? report.analyzeType.slice(7).toLowerCase() : '';
        const inferredSupported = REPORT_TYPES.has(inferred);
        const storedSupported = REPORT_TYPES.has(metadata.type);
        const noStoredType = !metadata.type;
        const unsupportedStoredType = !!metadata.type && !storedSupported;
        const conflict = storedSupported && inferredSupported && metadata.type !== inferred;
        const unresolved = !storedSupported && !inferredSupported;

        if (!metadata.validJson) counts.invalidContentJson += 1;
        if (noStoredType) counts.missingMetadataType += 1;
        if (noStoredType && inferredSupported) counts.inferredFromAnalyzeType += 1;
        if (unresolved) counts.unresolvedType += 1;
        if (unsupportedStoredType) counts.unsupportedMetadataType += 1;
        if (conflict) counts.typeConflict += 1;
        if (!noRecord && !orphan && !wrongOwner && metadata.validJson
          && !unsupportedStoredType && !conflict && (storedSupported || inferredSupported)) {
          counts.readyForStrictGate += 1;
        }
      }

      cursor = reports[reports.length - 1].id;
      if (reports.length < BATCH_SIZE) break;
    }
    process.stdout.write(`${JSON.stringify({ scene: 'paipan_report', ...counts }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  // 数据库异常可能包含连接信息，仅报告错误类型。
  process.stderr.write(`审计失败：${error instanceof Error ? error.name : 'UnknownError'}\n`);
  process.exitCode = 1;
});
