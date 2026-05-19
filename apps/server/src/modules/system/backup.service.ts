import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve(process.cwd(), "backups");

  /** 手动触发 pg_dump 备份 */
  async triggerBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `guoxue_${timestamp}.sql.gz`;

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:guoxue123@localhost:5432/guoxue";
    // 解析 DATABASE_URL
    const url = new URL(dbUrl);
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "5432";
    const dbName = url.pathname.slice(1);

    const filePath = path.join(this.backupDir, fileName);
    const cmd = `set PGPASSWORD=${password} && pg_dump -U ${user} -h ${host} -p ${port} -d ${dbName} --no-owner --no-acl | gzip > "${filePath}"`;

    try {
      this.logger.log(`开始备份: ${fileName}`);
      await execAsync(cmd, { timeout: 300000, shell: "powershell.exe" });
      const stat = fs.statSync(filePath);
      this.logger.log(`备份完成: ${fileName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      return { success: true, fileName, size: stat.size, sizeMB: +(stat.size / 1024 / 1024).toFixed(2) };
    } catch (err: any) {
      this.logger.error(`备份失败: ${err.message}`);
      return { success: false, error: err.message };
    }
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

  /** 上传最新备份到 COS */
  async uploadLatestToCos() {
    const { backups } = await this.listBackups();
    if (backups.length === 0) {
      return { success: false, error: "无可用备份文件" };
    }
    const latest = backups[0];
    // COS 上传逻辑 — 依赖 CosService
    this.logger.log(`[待实现] 上传备份到COS: ${latest.name}`);
    return { success: false, error: "COS上传功能尚未集成，需配置CosService", fileName: latest.name };
  }
}
