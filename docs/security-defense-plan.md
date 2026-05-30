# 热卜国学平台 — 安全防护与攻击应对预案

> 更新时间：2026-05-15 | SOP 级别文档 | 每季度更新

---

## 一、威胁模型总览

```
                       ┌──────────────────────┐
                       │      用户流量入口      │
                       │  (小程序/Web/API)     │
                       └──────────┬───────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   DDoS/CC 攻击 (L3/L4/L7) │
                    └─────────────┬─────────────┘
                                  │
                       ┌──────────▼───────────┐
                       │   WAF / CDN 清洗层    │
                       │   (腾讯云 WAF + CDN) │
                       └──────────┬───────────┘
                                  │
                       ┌──────────▼───────────┐
                       │   限流网关 (Nginx)     │
                       └──────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
     │ SQL 注入/XSS    │  │ 鉴权绕过/JWT    │  │ 敏感数据泄露  │
     │ 参数校验        │  │ 伪造/重放攻击   │  │ 日志脱敏     │
     └─────────────────┘  └────────────────┘  └─────────────┘
              │                   │                   │
     ┌────────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
     │ 数据库          │  │ 应用服务器      │  │ 备份/COS    │
     │ 拖库/删库/勒索   │  │ 挖矿/后门/     │  │ 泄露/删除    │
     │                 │  │ 供应链攻击      │  │             │
     └─────────────────┘  └────────────────┘  └─────────────┘
```

## 二、DDoS / CC 攻击防护

### 2.1 分层防御架构

| 层级 | 方案 | 防护能力 | 响应时间 |
|------|------|---------|---------|
| **L1 边缘清洗** | 腾讯云 DDoS 高防包 | 300Gbps+ | 秒级自动触发 |
| **L2 应用层 CC** | WAF + 智能限速 + 人机验证 | 100万 QPS | 实时 |
| **L3 网关限流** | Nginx rate limiting + 令牌桶 | 自控粒度 | 实时 |
| **L4 应用熔断** | Redis 滑动窗口 + 分级降级 | 业务级 | 实时 |

### 2.2 L1 — CDN/WAF 层配置

```
腾讯云 WAF 规则 (参考配置):

1. CC 攻击防护:
   - 单 IP: 60秒内 > 300 次请求 → 触发验证码
   - 单 IP: 60秒内 > 1000 次请求 → 封禁 10 分钟
   - 全站: QPS 超过日常峰值 3 倍 → 自动开启严格模式

2. Bot 管理:
   - 拦截已知恶意爬虫 UA
   - 拦截无 Referer 的高频 API 请求
   - 对 /api/* 路径开启 JS 挑战（可疑流量）

3. IP 黑名单:
   - 自动同步威胁情报库
   - 手动添加攻击 IP/段
```

### 2.3 L2 — Nginx 限流配置

```nginx
# nginx.conf — 限流配置
http {
    # 定义限流区域 (基于 IP)
    # $binary_remote_addr: 每个 IP 独立计数
    # zone=api_limit:10m: 分配 10MB 共享内存 (约 16 万个 IP)
    # rate=30r/s: 每个 IP 每秒 30 次请求
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;

    # 登录/支付等敏感接口更严格
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=pay_limit:10m rate=10r/m;

    # 突发流量控制
    limit_req_zone $binary_remote_addr zone=burst_limit:10m rate=100r/s;

    server {
        # API 全局限流
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_req_status 429;
            proxy_pass http://backend;
        }

        # 登录接口严格限流
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            limit_req_status 429;
            proxy_pass http://backend;
        }

        # 支付接口频率限制
        location /api/v1/trade/ {
            limit_req zone=pay_limit burst=5 nodelay;
            limit_req_status 429;
            proxy_pass http://backend;
        }
    }
}
```

### 2.4 L3 — 应用层熔断降级

```typescript
// apps/server/src/common/throttle/adaptive-throttle.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AdaptiveThrottleGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  // 降级等级：0=正常 1=轻度 2=中度 3=严重
  private getDegradeLevel(qps: number, errorRate: number): number {
    if (qps > 5000 || errorRate > 0.1) return 3;
    if (qps > 3000 || errorRate > 0.05) return 2;
    if (qps > 1500 || errorRate > 0.02) return 1;
    return 0;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const degradeLevel = await this.getCurrentDegradeLevel();

    // 严重降级：非核心功能全部拒绝
    if (degradeLevel >= 3) {
      const request = context.switchToHttp().getRequest();
      const criticalPaths = ['/api/v1/auth/', '/api/v1/trade/pay/', '/api/v1/health'];
      const isCritical = criticalPaths.some(p => request.path.startsWith(p));
      if (!isCritical) {
        throw new HttpException('服务繁忙，请稍后重试', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }

    // 中度降级：行为日志、推荐、搜索建议异步写入
    if (degradeLevel >= 2) {
      // 标记请求为降级模式，业务层据此跳过非核心逻辑
      context.switchToHttp().getRequest().degradeMode = true;
    }

    return true;
  }

  private async getCurrentDegradeLevel(): Promise<number> {
    // 从 Redis 读取当前 QPS 和错误率（每秒统计）
    const [qps, errorRate] = await Promise.all([
      this.redis.get('metrics:qps:current').then(Number).catch(() => 0),
      this.redis.get('metrics:error_rate:current').then(Number).catch(() => 0),
    ]);
    return this.getDegradeLevel(qps, errorRate);
  }
}
```

### 2.5 DDoS 被攻击时 SOP

```
时间线: 0 分钟   ─→ 告警触发 (企业微信 P0 通知)
       0-2 分钟   ─→ 确认攻击类型 (DDoS/CC/混合)
       2-5 分钟   ─→ 启用高防 IP (如未开启)
                      CDN 开启"严格模式"
                      手动封禁攻击源 IP
       5-15 分钟  ─→ 如果自建防护兜不住，呼叫云厂商安全团队
       15-30 分钟 ─→ 攻击结束后降级恢复，分析攻击特征
       30 分钟后  ─→ 复盘 + 更新防护规则
```

## 三、应用安全

### 3.1 OWASP Top 10 防护矩阵

| 威胁 | 防护措施 | 当前状态 |
|------|---------|---------|
| **SQL 注入** | Prisma 参数化查询 (天然防注入) + 禁止拼接 SQL | ✅ 已覆盖 |
| **XSS** | 输入转义 + 输出编码 + CSP 头 | ⚠️ 需配置 CSP |
| **认证绕过** | JWT + refresh token + 二次验证 (敏感操作) | ✅ 已覆盖 |
| **越权 (IDOR)** | 资源归属校验中间件 (用户只能访问自己的数据) | ⚠️ 需审计 |
| **敏感数据泄露** | 日志脱敏 + 传输加密 + 存储加密 (AES) | ✅ 部分覆盖 |
| **CSRF** | SameSite Cookie + Token 校验 | ✅ 已覆盖 |
| **SSRF** | 禁止内网请求 + URL 白名单 | ⚠️ 需审计 |
| **依赖漏洞** | `npm audit` + Dependabot + 定期升级 | ⚠️ 需自动化 |
| **文件上传** | 类型校验 + 大小限制 + 病毒扫描 | ⚠️ 需病毒扫描 |
| **日志注入** | CRLF 清洗 + 不记录敏感字段 | ✅ 已规划 |

### 3.2 鉴权加固措施

```typescript
// 关键操作二次验证 + 操作审计
const SENSITIVE_ACTIONS = [
  'user.delete',
  'order.refund',
  'withdrawal.approve',
  'role.update',
  'config.system.update',
];

// 异常登录检测：同账户 5 分钟内 3 次失败 → 锁定 30 分钟
// 异地登录检测：IP 地理位置跳跃 > 500km → 触发二次验证
```

### 3.3 敏感数据保护

| 数据类型 | 传输 | 存储 | 日志 | 备份 |
|---------|------|------|------|------|
| 用户密码 | HTTPS + 加盐哈希 | bcrypt hash (不可逆) | 不记录 | 随 DB 备份 |
| 支付密码 | HTTPS | bcrypt hash | 不记录 | 随 DB 备份 |
| 生辰八字 | HTTPS | AES-256-GCM 加密 | **脱敏: 仅记录年月** | 加密备份 |
| 手机号 | HTTPS | AES-256-GCM 加密 | **脱敏: 138****1234** | 加密备份 |
| 身份证号 | HTTPS | AES-256-GCM 加密 | **不记录** | 加密备份 |
| 聊天记录 | HTTPS | AES-256-GCM (可选) | 不记录 | 加密备份 |

```typescript
// 敏感字段日志脱敏装饰器
export function SensitiveLog(maskFn?: (val: any) => string) {
  return function (target: any, propertyKey: string) {
    // 实际实现：在日志拦截器中对标记字段自动脱敏
    Reflect.defineMetadata('sensitive:mask', maskFn || (() => '******'), target, propertyKey);
  };
}

// 使用示例
class CreatePaipanDto {
  @SensitiveLog((val) => val.slice(0, 4) + '****') // 只显示年份
  clientBirth: string;

  @SensitiveLog() // 默认全部遮罩
  clientName: string;
}
```

## 四、服务器安全加固

### 4.1 操作系统层

```bash
# === 服务器初始化安全配置清单 ===

# 1. 防火墙：只开放必要端口
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH (限制来源IP)
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # API (仅允许内网/负载均衡IP，不暴露公网)
ufw enable

# 2. SSH 加固
# /etc/ssh/sshd_config:
#   PermitRootLogin no           # 禁止 root SSH 登录
#   PasswordAuthentication no    # 禁用密码，只用密钥
#   Port 2222                    # 改默认端口
#   MaxAuthTries 3               # 最多 3 次失败
#   ClientAliveInterval 300      # 空闲 5 分钟断开

# 3. 自动安全更新
apt install unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# 4. Fail2Ban — 防暴力破解
apt install fail2ban
cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
maxretry = 5
bantime = 1800
EOF
systemctl enable fail2ban --now

# 5. 内核安全参数
cat >> /etc/sysctl.conf << EOF
# 防 IP 欺骗
net.ipv4.conf.all.rp_filter = 1
# 禁 ICMP redirect
net.ipv4.conf.all.accept_redirects = 0
# 禁 IP 转发 (非网关)
net.ipv4.ip_forward = 0
# SYN flood 防护
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
EOF
sysctl -p
```

### 4.2 Docker 容器加固

```yaml
# docker-compose.prod.yml 安全配置
services:
  postgres:
    # 非 root 用户运行
    user: "999:999"
    # 只读根文件系统
    read_only: true
    # 限制内存/CPU
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: '4'
        reservations:
          memory: 4G
          cpus: '2'
    # 不暴露端口到公网
    ports:
      - "127.0.0.1:5432:5432"
    # 挂载卷
    volumes:
      - pgdata:/var/lib/postgresql/data:rw
      - /tmp:/tmp:rw  # 只写临时目录
    # 安全选项
    security_opt:
      - no-new-privileges:true

  redis:
    user: "999:999"
    read_only: true
    ports:
      - "127.0.0.1:6379:6379"
    # Redis 密码
    command: redis-server --requirepass ${REDIS_PASSWORD}
    security_opt:
      - no-new-privileges:true
```

## 五、数据泄露应急响应

### 5.1 事件分级

| 级别 | 定义 | 响应时限 | 示例 |
|------|------|---------|------|
| **P0 严重** | 用户敏感数据批量泄露 | 15 分钟内响应 | 数据库被拖、备份泄露 |
| **P1 高** | 单个用户或少量数据泄露 | 1 小时内响应 | API 越权泄露他人数据 |
| **P2 中** | 非敏感数据泄露 | 4 小时内响应 | 日志打印了不该有的字段 |
| **P3 低** | 安全配置不当 (未造成泄露) | 24 小时内修复 | CSP 头缺失、端口暴露 |

### 5.2 P0 泄露 SOP

```
0 分钟: 确认泄露
  ├─ 收到告警/举报/异常检测通知
  ├─ 拉群 (CTO + 运维 + 法务)
  └─ 确认泄露范围和数据类型

0-15 分钟: 止血
  ├─ 关闭受影响的 API 或服务
  ├─ 切断外网访问数据库
  ├─ 回滚/撤销泄露的访问凭证
  └─ 封禁攻击源

15-60 分钟: 评估
  ├─ 分析泄露来源 (日志/SQL注入/配置失误/内部人员)
  ├─ 评估影响用户数
  ├─ 确认是否需要上报监管部门 (网信办)
  └─ 启动法律合规流程

1-4 小时: 修复
  ├─ 修复漏洞并验证
  ├─ 通知受影响用户 (微信模板消息/短信)
  ├─ 强制重置受影响用户的敏感信息 (token/密码)
  └─ 公开公告 (如影响范围大)

4-24 小时: 追溯
  ├─ 全量安全审计
  ├─ 同类漏洞全面排查
  └─ 更新安全策略和培训

24-72 小时: 复盘
  ├─ 事故复盘报告
  ├─ 改进措施执行
  └─ 第三方安全审计 (如需要)
```

## 六、服务器故障应急

### 6.1 故障场景与应对

| 场景 | 检测方式 | 自动恢复 | 手动处理 |
|------|---------|---------|---------|
| 应用服务 Crash | 健康检查 + PM2/Docker restart | ✅ 自动重启 | 查看日志分析 Crash 原因 |
| 数据库进程 Crash | `pg_isready` 定时检测 | ✅ 自动重启 | 检查磁盘/内存/WAL |
| 磁盘满 | 每小时 df -h 检查 | ❌ | 清理日志/归档 + 扩容 |
| 内存溢出 (OOM) | 系统日志监控 | ❌ | 重启 + 调大内存或查泄漏 |
| 云服务器宕机 | 外部拨测 (每 30s) | ❌ | 启用备用服务器 + DNS 切换 |
| 网络分区 | API 可达性检测 | ❌ | 云厂商工单 + 备用线路 |

### 6.2 高可用架构

```
                        ┌──────────────┐
                        │   DNS 智能解析 │
                        │ (主: 广州/备: 上海)│
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼────────┐ ┌────▼─────────┐ ┌───▼──────────┐
     │ 负载均衡 (广州)   │ │ 负载均衡(上海)│ │ CDN 兜底页面  │
     │ 主               │ │ 备(温)       │ │ (静态页)     │
     └────────┬────────┘ └────┬─────────┘ └──────────────┘
              │               │
     ┌────────▼────────┐ ┌────▼─────────┐
     │ NestJS ×2 (广州) │ │ NestJS ×1(上海│
     │ 主               │ │ 冷备         │
     └────────┬────────┘ └──────────────┘
              │
     ┌────────▼────────┐
     │ PostgreSQL 主     │ ←── 流复制
     │ (广州)           │ ──────────→ PostgreSQL 备 (上海)
     └─────────────────┘
```

### 6.3 故障切换 SOP

```bash
#!/bin/bash
# /opt/guoxue/scripts/failover-to-standby.sh — 切换到备用环境

echo "=== 国学平台故障切换 ==="
echo "当前主环境状态:"
curl -s -o /dev/null -w "%{http_code}" https://api.guoxue.pro/health || echo "不可达"

# 1. 立即启动备用数据库 (上海)
ssh shanghai-server "docker compose -f /opt/guoxue/docker-compose.prod.yml up -d postgres redis"

# 2. 等待备用环境就绪
echo "等待备用环境就绪..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://shanghai-server:3000/health; then
    echo "备用环境就绪 (${i}s)"
    break
  fi
  sleep 2
done

# 3. DNS 切换 (腾讯云 DNSPod API)
# 注意：DNS TTL 设为 60s 可实现快速切换
tccli dnspod ModifyRecord \
  --Domain guoxue.pro \
  --RecordType A \
  --RecordLine "默认" \
  --Value "<备用服务器IP>" \
  --SubDomain api

echo "DNS 已切换，预计 60s 内生效"

# 4. 通知团队
curl -X POST "${WEWORK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"msgtype":"text","text":{"content":"【紧急】国学平台已切换至备用环境（上海），请全员确认功能正常"}}'
```

## 七、安全监控与审计

### 7.1 关键安全监控指标

```typescript
// 以下指标需接入 Grafana / Prometheus

const SECURITY_METRICS = {
  // 鉴权类
  'auth:login:failed': '登录失败次数 (按IP聚合)',
  'auth:login:bruteforce': '暴力破解尝试次数',
  'auth:token:replay': 'Token 重放检测',
  'auth:role:escalation': '越权操作检测',

  // 攻击检测
  'security:sql_injection:blocked': 'SQL 注入拦截',
  'security:xss:blocked': 'XSS 拦截',
  'security:file_upload:malicious': '恶意文件上传拦截',
  'security:rate_limit:triggered': '限流触发次数',

  // 异常行为
  'security:unusual:geo_jump': '地理位置异常跳跃',
  'security:unusual:batch_download': '批量下载检测',
  'security:unusual:mass_register': '批量注册检测',
};
```

### 7.2 日志审计保留策略

| 日志类型 | 保留时间 | 存储位置 | 用途 |
|---------|---------|---------|------|
| 访问日志 (access.log) | 30 天本地 + 180 天归档 | 本地 + COS | 攻击溯源 |
| 错误日志 (error.log) | 90 天 | 本地 | 故障排查 |
| 安全日志 (security.log) | 365 天 | 本地 + COS | 合规审计 |
| 操作审计日志 (audit.log) | 730 天 | 数据库 + COS | 合规/纠纷 |
| 数据库慢查询日志 | 30 天 | 本地 | 性能优化 |

### 7.3 外部拨测

```
配置外部拨测 (阿里云/腾讯云):
- 频率: 每 30 秒
- 端点: /api/v1/health (公开)
- 地域: 至少 3 个不同城市
- 超时: 5 秒无响应 → 告警

告警规则:
- 连续 3 次失败 → 电话通知
- 连续 1 次失败 + 响应时间 > 2s → 企业微信通知
```

## 八、定期安全清单

### 8.1 周期安全检查

| 频率 | 检查项 |
|------|--------|
| **每日** | 登陆失败异常/限流触发次数/WAF 拦截日志/磁盘使用 |
| **每周** | 依赖漏洞扫描 (`npm audit`) / 异常 IP 审查 / 备份完整性校验 |
| **每月** | 全面漏洞扫描 / 端口扫描自查 / 权限审查 / 密钥轮换 |
| **每季度** | 渗透测试 (第三方) / 灾备恢复演练 / 安全策略review |
| **每年** | 等保测评 / 合规审计 / 全员安全培训 |

### 8.2 上线前安全检查清单

```
□ SQL 注入测试 (所有用户输入点)
□ XSS 测试 (所有输出点)
□ CSRF Token 校验 (状态变更接口)
□ 鉴权旁路测试 (直接访问受保护资源)
□ 越权测试 (用户 A 访问用户 B 的数据)
□ 敏感信息泄露检查 (响应头/错误信息/调试模式)
□ 文件上传 bypass 测试
□ 并发/竞态条件测试 (优惠券/库存)
□ 速率限制有效性测试
□ HTTPS/TLS 证书检查
```

## 九、与已有文档的关系

| 本文档章节 | 关联文档 |
|-----------|---------|
| DDoS/CC 防护 | → `deployment-architecture.md` (架构图) |
| 服务器故障切换 | → `disaster-recovery-plan.md` (灾备恢复) |
| 数据泄露应急 | → `disaster-recovery-plan.md:5` (恢复流程) |
| 安全加固配置 | → `environment-config.md` (环境配置) |
| 降级熔断 | → `capacity-resource-planning.md` (容量规划) |
