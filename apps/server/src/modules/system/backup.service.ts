import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { spawn } from "child_process";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 自动备份保留份数（每日一份，约 2 周） */
const KEEP_BACKUPS = 14;

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve(process.cwd(), "backups");

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 手动触发 pg_dump 备份（executor 记入审计） */
  async triggerBackup(executor = "MANUAL") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `guoxue_${timestamp}.sql.gz`;

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:guoxue123@localhost:5432/guoxue";
    const url = new URL(dbUrl);
    const conn = {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port || "5432",
      dbName: url.pathname.slice(1),
    };

    const filePath = path.join(this.backupDir, fileName);

    try {
      this.logger.log(`开始备份: ${fileName}`);
      await this.runPgDump(conn, filePath);
      const stat = fs.statSync(filePath);
      const sizeMB = +(stat.size / 1024 / 1024).toFixed(2);
      this.logger.log(`备份完成: ${fileName} (${sizeMB} MB)`);
      await this.writeAudit(executor, true, { fileName, sizeMB });
      return { success: true, fileName, size: stat.size, sizeMB };
    } catch (err: any) {
      // 备份失败要删掉可能产生的半截文件，避免被 getLatestBackup 误判为“最新健康备份”
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* 忽略清理失败 */ }
      this.logger.error(`备份失败: ${err.message}`);
      await this.writeAudit(executor, false, { fileName, error: String(err.message).slice(0, 300) });
      return { success: false, error: err.message };
    }
  }

  /**
   * 流式执行 pg_dump → gzip → 文件，全程不经 shell。
   * 修复(后端审计P1)：原命令用 `set PGPASSWORD=.. && ..`(CMD 语法) + shell:"powershell.exe"，
   * 生产 Linux 无 powershell.exe 且 set 语法非法 → 备份恒失败。改 spawn 直调 pg_dump：
   * 跨平台、密码走 env(不进命令行)、参数数组化，同时消除命令注入面。
   */
  private runPgDump(
    conn: { user: string; password: string; host: string; port: string; dbName: string },
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        "pg_dump",
        ["-U", conn.user, "-h", conn.host, "-p", conn.port, "-d", conn.dbName, "--no-owner", "--no-acl"],
        { env: { ...process.env, PGPASSWORD: conn.password } },
      );

      const gzip = zlib.createGzip();
      const out = fs.createWriteStream(filePath);
      let stderr = "";
      let settled = false;
      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      child.on("error", (err) => fail(new Error(`pg_dump 无法启动(生产需安装 postgresql-client): ${err.message}`)));
      child.stderr.on("data", (d) => { stderr += d.toString(); });
      out.on("error", fail);
      gzip.on("error", fail);
      child.stdout.pipe(gzip).pipe(out);

      out.on("finish", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      child.on("close", (code) => {
        if (code !== 0) fail(new Error(`pg_dump 退出码 ${code}: ${stderr.slice(0, 500)}`));
        // code===0 时以 out 的 finish 为准（确保数据落盘）
      });
    });
  }

  /** 每日凌晨 3 点自动备份（分布式锁防多实例重复跑）+ 滚动清理旧备份 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledBackup() {
    await this.redis.runExclusive("db_backup_daily", 600, async () => {
      const result = await this.triggerBackup("SYSTEM_CRON");
      if (result.success) {
        await this.pruneOldBackups(KEEP_BACKUPS);
      }
    });
  }

  /** 保留最近 keep 份，删除更旧的备份文件 */
  async pruneOldBackups(keep = KEEP_BACKUPS) {
    const { backups } = await this.listBackups();
    const stale = backups.slice(keep);
    let removed = 0;
    for (const b of stale) {
      try {
        fs.unlinkSync(path.join(this.backupDir, b.name));
        removed++;
      } catch (err: any) {
        this.logger.warn(`清理旧备份失败 ${b.name}: ${err.message}`);
      }
    }
    if (removed > 0) this.logger.log(`清理旧备份 ${removed} 份（保留最近 ${keep} 份）`);
    return { removed, kept: Math.min(backups.length, keep) };
  }

  private async writeAudit(executor: string, success: boolean, detail: Record<string, unknown>) {
    await this.prisma.auditLog
      .create({
        data: {
          executor,
          action: success ? "DB_BACKUP" : "DB_BACKUP_FAILED",
          targetType: "DATABASE",
          detail: JSON.stringify(detail),
        },
      })
      .catch((err) => this.logger.warn("备份审计写入失败", err instanceof Error ? err.message : err));
  }

  /** 列出所有备份文件 */
  async listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return { backups: [], total: 0 };
    }
    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.endsWith(".sql.gz"))
      .map(f => {
        const stat = fs.statSync(path.join(this.backupDir, f));
        return { name: f, size: stat.size, sizeMB: +(stat.size / 1024 / 1024).toFixed(2), createdAt: stat.birthtime };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { backups: files, total: files.length };
  }

  /** 获取最近备份状态 */
  async getLatestBackup() {
    const { backups } = await this.listBackups();
    if (backups.length === 0) {
      return { hasBackup: false, message: "暂无备份" };
    }
    const latest = backups[0];
    const ageHours = (Date.now() - latest.createdAt.getTime()) / 3600000;
    return {
      hasBackup: true,
      latest: latest.name,
      sizeMB: latest.sizeMB,
      createdAt: latest.createdAt,
      ageHours: +ageHours.toFixed(1),
      status: ageHours > 48 ? "stale" : "healthy",
    };
  }

  /** 上传最新备份到 COS（异地容灾·待接入 CosService + bucket 配置） */
  async uploadLatestToCos() {
    const { backups } = await this.listBackups();
    if (backups.length === 0) {
      return { success: false, error: "无可用备份文件" };
    }
    const latest = backups[0];
    // COS 上传逻辑 — 依赖 CosService + 异地灾备 bucket/路径配置（待董事长拍板后接入）
    this.logger.log(`[待实现] 上传备份到COS: ${latest.name}`);
    return { success: false, error: "COS上传功能尚未集成，需配置CosService", fileName: latest.name };
  }
}
