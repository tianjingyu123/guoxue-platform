# 生产监控栈

本目录提供 Prometheus、Grafana、Alertmanager、Loki、Tempo、主机/数据库/Redis
Exporter，以及 API、H5、管理后台和第三方依赖的黑盒拨测。

## 上线前配置

在 `docker/.env.production` 中至少填写：

- `GF_ADMIN_PASSWORD`：Grafana 强密码；
- `WEWORK_CORP_ID`、`WEWORK_AGENT_ID`、`WEWORK_AGENT_SECRET`：企业微信自建应用；
- `DBA_WEWORK_USER_IDS`：监控告警接收人，多个账号用 `|` 分隔；
- `DATABASE_URL`、`REDIS_URL`：与业务容器使用同一份生产配置。

禁止把生成的 `docker/monitoring/.generated/alertmanager.yml` 提交到版本库。

## 启动

从项目根目录执行：

```bash
pnpm migration:check-env "$PRODUCTION_ENV_FILE" --full \
  --deploy-target "$DEPLOY_TARGET" --node-role operations
pnpm release:audit-monitoring
pnpm release:render-monitoring "$PRODUCTION_ENV_FILE"
docker network create monitoring 2>/dev/null || true
docker compose \
  --env-file docker/.env.production \
  -f docker/monitoring/docker-compose.yml \
  up -d
```

新服务器只有 Docker、没有宿主机 Node.js 时，可通过固定 Node 镜像渲染：

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -w /workspace \
  node:22-alpine \
  node scripts/release/render-monitoring-config.mjs docker/.env.production
```

## 验证

```bash
docker compose --env-file docker/.env.production \
  -f docker/monitoring/docker-compose.yml ps
curl -fsS http://127.0.0.1:9090/-/ready
curl -fsS http://127.0.0.1:9093/-/ready
curl -fsS http://127.0.0.1:3001/api/health
```

Prometheus、Grafana、Alertmanager 与 Loki 只绑定服务器回环地址。Grafana 对外仅通过
Nginx `/grafana/` 提供，并应再由服务器防火墙、VPN 或访问控制限制运维人员访问。

## 告警演练

切流前必须做一次可恢复演练：

1. 暂停测试环境的 `guoxue-server`，确认 `InstanceDown` 与
   `PlatformEntryUnreachable` 在规定时间内触达；
2. 恢复服务，确认告警自动恢复；
3. 临时填入不可达的第三方测试 URL，确认 `ExternalServiceUnreachable`；
4. 核对告警内容不包含数据库、Redis、企业微信或应用密钥。
