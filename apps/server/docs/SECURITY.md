# 国学平台 — 安全防护指南

## 当前防护概览

| 层级 | 措施 | 状态 |
|------|------|------|
| 传输层 | TLS 1.2/1.3 + HSTS preload | ✅ 已启用 |
| 应用层 | Helmet 安全头 + CSP + CORS | ✅ 已启用 |
| 认证层 | JWT + bcrypt + 密钥轮换 | ✅ 已启用 |
| 输入层 | ValidationPipe + SanitizePipe(XSS) + 参数化查询 | ✅ 已启用 |
| 限流层 | Nginx API 限流 + Redis 分布式限流 + 登录严格限流 | ✅ 已启用 |
| 审计层 | 全局写操作自动审计 + 内容审核 | ✅ 已启用 |
| 容器层 | cap_drop ALL + 非 root 运行 | ✅ 已启用 |
| CI/CD | pnpm audit 依赖扫描 + 自动回滚 | ✅ 已启用 |

## 待接入：腾讯云 WAF（Web 应用防火墙）

### 为什么需要 WAF

Nginx 限流只能挡频率型攻击，以下攻击类型需要 WAF：
- SQL 注入探测（自动化扫描器/AI 工具）
- XSS/CSRF 攻击载荷
- 路径遍历、文件包含
- CC 攻击（模拟正常请求的慢速 DDoS）
- 恶意爬虫、内容抓取
- 0-day 漏洞利用

### 接入步骤

1. 登录腾讯云控制台 → Web 应用防火墙
2. 添加实际生产域名，例如 `api.example.com`
3. DNS 解析改为 WAF 提供的 CNAME
4. WAF 回源指向你的 Nginx 服务器 IP
5. 开启基础防护规则集 + 自定义规则：
   - IP 黑名单：封禁持续攻击的 IP
   - 地域封禁：仅开放中国大陆访问（如业务不需要海外）
   - CC 防护：单 IP 30s 内请求 > 200 次触发验证码
   - 扫描器防护：拦截自动化漏洞扫描工具

### 费用预估

- 腾讯云 WAF 基础版：约 ¥300/月
- 高级版（含 Bot 管理）：约 ¥1000/月

---

## 待接入：DDoS 防护

### 当前风险

Nginx `limit_req` 和 `limit_conn` 只能处理应用层，以下场景挡不住：
- 大流量攻击（> 1Gbps 打满带宽）
- SYN Flood、UDP Flood（L4 攻击）
- DNS 放大攻击

### 方案 A：腾讯云高防 IP（推荐）

- 将域名解析到高防 IP
- 高防 IP 清洗后将正常流量转发到源站
- 基础版（30Gbps）：约 ¥800/月
- 适合：有明确安全需求的生产环境

### 方案 B：Cloudflare Free（临时方案）

- 域名 DNS 托管到 Cloudflare
- 开启 "I'm Under Attack" 模式
- 免费版提供基础 DDoS 防护（无 SLA）
- 缺点：国内访问延迟可能增加

---

## 待接入：CDN 加速

### 当前状态

静态资源（/uploads/、/static/）走 Nginx 本地磁盘，无 CDN。

### 接入方案

你已有 COS 配置，只需开启 CDN：

1. 腾讯云 CDN 控制台 → 添加实际 CDN 域名，例如 `cdn.example.com`
2. 回源配置 → COS bucket 作为源站
3. 上传服务改为写入 COS（而非本地磁盘）
4. Nginx 中 `/uploads/` 改为反向代理到 CDN，或直接返回 CDN URL

### 预期效果

- 全国用户加载速度提升 2-5 倍
- 源站带宽降低 80%+
- COS 自带图片处理（裁剪、压缩、水印）

---

## 密钥轮换检查清单

每季度或发生安全事件时执行：

- [ ] 生成新 JWT_SECRET：`node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"`
- [ ] 设入环境变量：`export JWT_SECRET=<新密钥>`
- [ ] 备份旧密钥：`export JWT_PREVIOUS_SECRETS=<旧密钥1>,<旧密钥2>`
- [ ] 重启服务
- [ ] 验证：旧 token 仍可用，新 token 签发正常
- [ ] 24h 后（token 过期后）移除 JWT_PREVIOUS_SECRETS
- [ ] 同步更新 GitHub Secrets 和 CI 环境变量

---

## 安全事件响应流程

1. **发现** → 企业微信告警 / 监控面板异常
2. **隔离** → WAF 封禁攻击 IP / Nginx deny
3. **分析** → 审计日志 + 链路追踪回溯攻击路径
4. **修复** → 回滚代码 / 修补漏洞 / 密钥轮换
5. **复盘** → 文档记录 + 改进防护规则

---

## 推荐优先级

| 优先级 | 事项 | 费用 | 投入时间 |
|--------|------|------|----------|
| P0 | 腾讯云 CDN + COS | 按量付费 | 半天 |
| P1 | 腾讯云 WAF 基础版 | ¥300/月 | 1 天 |
| P2 | 腾讯云高防 IP | ¥800/月 | 半天 |
| P3 | GitHub 分支保护规则 | 免费 | 1 小时 |
| P4 | 季度密钥轮换 | 免费 | 持续 |
