import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { promises as fs, createReadStream } from "fs";
import { RedisService } from "../../redis/redis.service";

/**
 * nginx access.log 增量分析（T3 可观测·5分钟窗口）。
 *
 * 生产 access.log 是默认 combined 格式（无 $request_time），故本服务产出
 * QPS/4xx/5xx 率/top 路由——延迟分位由 API 拦截器层（应用视角）与 RUM（用户视角）覆盖，
 * nginx 侧 p95 需改 log_format，已入 backlog 不在本批。
 *
 * 增量读取：inode+offset 存 Redis（logrotate 换 inode 或文件缩短即重置）；
 * 单轮最多读 8MB 防内存冲击（超出跳到文件尾并标记 truncated）。
 * 产出：obs:nginx:latest（最近窗口）+ obs:nginx:recent（近 12 窗口环形数组）→ admin 看板 + 哨兵 R9。
 * 仅 linux 生产环境运行；4 实例同机，runExclusive 互斥（读同一文件不能并发）。
 */

interface LogState {
  ino: number;
  off: number;
}

export interface NginxWindowStat {
  at: string; // 窗口结束时间 ISO
  windowSec: number;
  total: number;
  s4xx: number;
  s5xx: number;
  rate5xx: number;
  truncated: boolean;
  topPaths: Array<{ path: string; count: number }>;
  top5xxPaths: Array<{ path: string; count: number }>;
}

const MAX_READ_BYTES = 8 * 1024 * 1024;
const RECENT_WINDOWS = 12;
// combined 格式："GET /path?x=1 HTTP/2.0" 200
const LINE_RE = /"(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) ([^ "]+)[^"]*" (\d{3})/;

@Injectable()
export class NginxLogService {
  private readonly logger = new Logger(NginxLogService.name);
  private readonly logPath = process.env.NGINX_ACCESS_LOG || "/var/log/nginx/access.log";

  constructor(private readonly redis: RedisService) {}

  @Cron("2-59/5 * * * *")
  async cron() {
    if (process.platform !== "linux") return; // 仅生产
    await this.redis.runExclusive("nginx_log_parse", 240, () => this.parseIncrement());
  }

  /** 解析主体（独立出来便于测试/手动触发） */
  async parseIncrement(): Promise<NginxWindowStat | null> {
    let stat;
    try {
      stat = await fs.stat(this.logPath);
    } catch {
      this.logger.warn(`nginx 日志不可读：${this.logPath}（检查 ACL：setfacl -m u:$USER:rX /var/log/nginx）`);
      return null;
    }
    const state = (await this.redis.getJson<LogState>("obs:nginx:state")) ?? { ino: 0, off: 0 };
    let start = state.off;
    // logrotate 换文件（inode 变化）或被截断（size < offset）→ 从头读
    if (stat.ino !== state.ino || stat.size < state.off) start = 0;
    // 首次启动：跳过历史存量，从文件尾开始（避免第一轮把全量日志算成一个窗口）
    if (state.ino === 0 && state.off === 0) {
      await this.redis.setJson("obs:nginx:state", { ino: stat.ino, off: stat.size } satisfies LogState, 0);
      return null;
    }

    let truncated = false;
    let readEnd = stat.size;
    if (readEnd - start > MAX_READ_BYTES) {
      start = readEnd - MAX_READ_BYTES;
      truncated = true;
    }

    const windowStat = this.emptyStat(truncated);
    if (readEnd > start) {
      const content = await this.readRange(start, readEnd - 1);
      this.aggregate(content, windowStat);
    }
    await this.redis.setJson("obs:nginx:state", { ino: stat.ino, off: readEnd } satisfies LogState, 0);
    await this.redis.setJson("obs:nginx:latest", windowStat, 3600);
    const recent = (await this.redis.getJson<NginxWindowStat[]>("obs:nginx:recent")) ?? [];
    recent.push(windowStat);
    await this.redis.setJson("obs:nginx:recent", recent.slice(-RECENT_WINDOWS), 7200);
    return windowStat;
  }

  private emptyStat(truncated: boolean): NginxWindowStat {
    return {
      at: new Date().toISOString(),
      windowSec: 300,
      total: 0,
      s4xx: 0,
      s5xx: 0,
      rate5xx: 0,
      truncated,
      topPaths: [],
      top5xxPaths: [],
    };
  }

  private readRange(start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream(this.logPath, { start, end })
        .on("data", (c) => chunks.push(c as Buffer))
        .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        .on("error", reject);
    });
  }

  /** 逐行解析 combined 格式并聚合（纯函数·可测） */
  aggregate(content: string, out: NginxWindowStat): void {
    const pathCount = new Map<string, number>();
    const path5xx = new Map<string, number>();
    for (const line of content.split("\n")) {
      const m = LINE_RE.exec(line);
      if (!m) continue;
      const path = this.normalizePath(m[1]);
      const status = Number(m[2]);
      out.total++;
      if (status >= 500) {
        out.s5xx++;
        path5xx.set(path, (path5xx.get(path) ?? 0) + 1);
      } else if (status >= 400) {
        out.s4xx++;
      }
      pathCount.set(path, (pathCount.get(path) ?? 0) + 1);
    }
    out.rate5xx = out.total > 0 ? out.s5xx / out.total : 0;
    out.topPaths = this.top(pathCount, 10);
    out.top5xxPaths = this.top(path5xx, 10);
  }

  /** 去 query + 数值/uuid 段归一化（控制基数） */
  normalizePath(raw: string): string {
    const path = raw.split("?")[0];
    return path
      .split("/")
      .map((seg) => (/^\d+$/.test(seg) || /^[0-9a-f-]{16,}$/i.test(seg) ? ":id" : seg))
      .join("/");
  }

  private top(map: Map<string, number>, n: number): Array<{ path: string; count: number }> {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([path, count]) => ({ path, count }));
  }
}
